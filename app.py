"""
对联生成系统 - 后端服务
使用OpenAI库调用API生成对联
"""

import os
import re
from openai import OpenAI
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# 从环境变量获取配置
API_URL = os.environ.get('API_URL', '')
MODEL_NAME = os.environ.get('MODEL_NAME', '')
API_KEY = os.environ.get('API_KEY', '')

# 初始化OpenAI客户端
client = OpenAI(
    api_key=API_KEY,
    base_url=API_URL.rstrip('/chat/completions') if API_URL else None
)


def call_ai_api(prompt):
    """使用OpenAI库调用API"""
    if not API_URL or not MODEL_NAME or not API_KEY:
        raise ValueError("请设置环境变量: API_URL, MODEL_NAME, API_KEY")
    
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.8,
            max_tokens=500
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"API调用错误: {e}")
        return None


def parse_couplet(response_text):
    """解析AI返回的对联内容"""
    # 尝试多种格式解析
    lines = response_text.strip().split('\n')
    upper = ""
    lower = ""
    horizontal = ""
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # 匹配上联 - 支持多种格式如"上联："、"上联:"、"上联"
        if re.match(r'^上联[:：]?\s*', line):
            upper = re.sub(r'^上联[:：]?\s*', '', line).strip()
        # 匹配下联
        elif re.match(r'^下联[:：]?\s*', line):
            lower = re.sub(r'^下联[:：]?\s*', '', line).strip()
        # 匹配横批
        elif re.match(r'^横批[:：]?\s*', line):
            horizontal = re.sub(r'^横批[:：]?\s*', '', line).strip()
        # 如果没有标记，尝试按顺序分配
        elif not upper:
            upper = line
        elif not lower:
            lower = line
        elif not horizontal:
            horizontal = line
    
    return upper, lower, horizontal


def validate_couplet(upper, lower, horizontal):
    """验证对联是否符合要求"""
    # 检查是否都有内容
    if not upper or not lower or not horizontal:
        return False, "对联内容不完整"
    
    # 检查长度（上联和下联字数应该相同）
    if len(upper) != len(lower):
        return False, f"上下联字数不一致: 上联{len(upper)}字, 下联{len(lower)}字"
    
    # 检查字数范围（一般对联5-15字）
    if len(upper) < 4 or len(upper) > 15:
        return False, f"对联字数不在合理范围(4-15字): 当前{len(upper)}字"
    
    # 检查横批长度（一般2-6字）
    if len(horizontal) < 2 or len(horizontal) > 8:
        return False, f"横批字数不在合理范围(2-8字): 当前{len(horizontal)}字"
    
    # 检查是否包含非中文字符（允许标点）
    chinese_pattern = re.compile(r'^[\u4e00-\u9fa5，。！？、；：""''（）]+$')
    if not chinese_pattern.match(upper):
        return False, "上联包含非中文字符"
    if not chinese_pattern.match(lower):
        return False, "下联包含非中文字符"
    if not chinese_pattern.match(horizontal):
        return False, "横批包含非中文字符"
    
    return True, "验证通过"


def generate_couplet(keywords=None, style='traditional', is_random=False):
    """生成对联，如果不符合要求则重新生成
    
    Args:
        keywords: 用户输入的关键词
        style: 对联风格，'traditional'或'modern'
        is_random: 是否随机生成
    """
    max_attempts = 5
    
    # 构建提示词
    if is_random:
        prompt = """请生成一副新春对联，要求：
1. 上联和下联字数相同，在5-12字之间
2. 横批在2-6字之间
3. 内容喜庆、吉祥，适合春节使用
4. 请严格按照以下格式输出，不要添加任何其他内容：

上联：[上联内容]
下联：[下联内容]
横批：[横批内容]"""
    else:
        # 根据风格设置提示
        style_desc = "传统典雅，用词典雅古朴，意境深远" if style == 'traditional' else "现代创新，语言新颖活泼，贴近生活"
        
        # 构建关键词提示
        keyword_hint = ""
        if keywords:
            keyword_list = [k.strip() for k in keywords.split() if k.strip()]
            if keyword_list:
                keyword_hint = f"\n5. 请包含以下关键词：{'、'.join(keyword_list)}"
        
        prompt = f"""请生成一副新春对联，要求：
1. 上联和下联字数相同，在5-12字之间
2. 横批在2-6字之间
3. 内容喜庆、吉祥，适合春节使用
4. 风格要求：{style_desc}{keyword_hint}
5. 请严格按照以下格式输出，不要添加任何其他内容：

上联：[上联内容]
下联：[下联内容]
横批：[横批内容]"""
    
    for attempt in range(max_attempts):
        print(f"正在生成对联，第{attempt + 1}次尝试...")
        
        response = call_ai_api(prompt)
        if not response:
            continue
        
        upper, lower, horizontal = parse_couplet(response)
        print(f"解析结果: 上联={upper}, 下联={lower}, 横批={horizontal}")
        
        is_valid, message = validate_couplet(upper, lower, horizontal)
        if is_valid:
            return {
                "success": True,
                "upper": upper,
                "lower": lower,
                "horizontal": horizontal,
                "attempts": attempt + 1
            }
        else:
            print(f"验证失败: {message}")
    
    return {
        "success": False,
        "error": f"经过{max_attempts}次尝试仍无法生成符合要求的对联，请重试"
    }


@app.route('/')
def index():
    """主页"""
    return render_template('index.html')


@app.route('/api/generate', methods=['POST'])
def api_generate():
    """API接口：生成对联"""
    try:
        # 获取请求参数
        data = request.get_json() or {}
        keywords = data.get('keywords', '')
        style = data.get('style', 'traditional')
        is_random = data.get('random', False)
        
        # 调用生成函数
        result = generate_couplet(
            keywords=keywords if keywords else None,
            style=style,
            is_random=is_random
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        "status": "ok",
        "config": {
            "api_url_set": bool(API_URL),
            "model_name_set": bool(MODEL_NAME),
            "api_key_set": bool(API_KEY)
        }
    })


if __name__ == '__main__':
    # 检查环境变量
    if not API_URL or not MODEL_NAME or not API_KEY:
        print("警告: 请设置以下环境变量:")
        print("  - API_URL: ModelArts Studio API地址")
        print("  - MODEL_NAME: 模型名称")
        print("  - API_KEY: API密钥")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
