/**
 * 对联生成系统 - 前端交互逻辑
 */

// DOM元素
const generateBtn = document.getElementById('generateBtn');
const randomBtn = document.getElementById('randomBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const errorToast = document.getElementById('errorToast');
const errorText = document.getElementById('errorText');
const upperText = document.getElementById('upperText');
const lowerText = document.getElementById('lowerText');
const horizontalText = document.getElementById('horizontalText');
const keywordsInput = document.getElementById('keywords');

/**
 * 生成对联（个性化定制）
 */
async function generateCouplet() {
    // 获取用户输入
    const keywords = keywordsInput.value.trim();
    const style = document.querySelector('input[name="style"]:checked').value;
    
    // 禁用按钮，显示加载状态
    generateBtn.disabled = true;
    randomBtn.disabled = true;
    loadingOverlay.classList.add('active');
    
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                keywords: keywords,
                style: style,
                random: false
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 更新对联内容
            updateCouplet(data.upper, data.lower, data.horizontal);
            console.log(`对联生成成功，尝试次数: ${data.attempts}`);
        } else {
            showError(data.error || '生成失败，请重试');
        }
    } catch (error) {
        console.error('请求错误:', error);
        showError('网络错误，请检查服务器连接');
    } finally {
        // 恢复按钮状态
        generateBtn.disabled = false;
        randomBtn.disabled = false;
        loadingOverlay.classList.remove('active');
    }
}

/**
 * 随机生成对联
 */
async function generateRandomCouplet() {
    // 禁用按钮，显示加载状态
    generateBtn.disabled = true;
    randomBtn.disabled = true;
    loadingOverlay.classList.add('active');
    
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                random: true
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 更新对联内容
            updateCouplet(data.upper, data.lower, data.horizontal);
            console.log(`随机对联生成成功，尝试次数: ${data.attempts}`);
        } else {
            showError(data.error || '生成失败，请重试');
        }
    } catch (error) {
        console.error('请求错误:', error);
        showError('网络错误，请检查服务器连接');
    } finally {
        // 恢复按钮状态
        generateBtn.disabled = false;
        randomBtn.disabled = false;
        loadingOverlay.classList.remove('active');
    }
}

/**
 * 更新对联显示
 * @param {string} upper - 上联
 * @param {string} lower - 下联
 * @param {string} horizontal - 横批
 */
function updateCouplet(upper, lower, horizontal) {
    // 更新横批
    horizontalText.textContent = horizontal;
    
    // 更新上联（每个字单独一个span，实现竖排效果）
    upperText.innerHTML = upper.split('').map(char => `<span>${char}</span>`).join('');
    
    // 更新下联
    lowerText.innerHTML = lower.split('').map(char => `<span>${char}</span>`).join('');
    
    // 添加动画效果
    addAnimation();
}

/**
 * 添加文字动画效果
 */
function addAnimation() {
    // 重新触发CSS动画
    const allSpans = document.querySelectorAll('.scroll-content span');
    allSpans.forEach((span, index) => {
        span.style.animation = 'none';
        span.offsetHeight; // 触发重排
        span.style.animation = `fadeInUp 0.5s ease forwards ${index * 0.1}s`;
    });
}

/**
 * 显示错误提示
 * @param {string} message - 错误信息
 */
function showError(message) {
    errorText.textContent = message;
    errorToast.classList.add('active');
    
    // 3秒后自动隐藏
    setTimeout(() => {
        errorToast.classList.remove('active');
    }, 3000);
}

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('对联生成系统已加载');
    
    // 检查API配置
    fetch('/api/health')
        .then(response => response.json())
        .then(data => {
            console.log('系统状态:', data);
            if (!data.config.api_url_set || !data.config.model_name_set || !data.config.api_key_set) {
                showError('请配置环境变量: API_URL, MODEL_NAME, API_KEY');
            }
        })
        .catch(error => {
            console.error('健康检查失败:', error);
        });
});

/**
 * 键盘快捷键支持
 */
document.addEventListener('keydown', (event) => {
    // 按空格键或回车键生成对联（仅在非输入状态）
    if ((event.code === 'Space' || event.code === 'Enter') && 
        !generateBtn.disabled && 
        document.activeElement !== keywordsInput) {
        event.preventDefault();
        generateCouplet();
    }
});
