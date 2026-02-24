#!/bin/bash

# 对联生成系统启动脚本
# 设置环境变量并启动服务

# 设置环境变量
# 注意：API_URL 应设置为 base_url（不包含 /chat/completions 后缀）
# OpenAI 库会自动添加 /chat/completions 路径
export API_URL="https://api.modelarts-maas.com/openai/v1"
export MODEL_NAME="deepseek-v3.2"
export API_KEY="your_api_key"

# 进入项目目录
cd "$(dirname "$0")"

# 检查Python环境
echo "检查Python环境..."
python3 --version

# 安装依赖
echo "安装依赖..."
pip3 install -r requirements.txt -q

# 启动服务
echo "启动对联生成系统..."
echo "请在浏览器中访问: http://localhost:5000"
echo "按 Ctrl+C 停止服务"
echo ""

python3 app.py
