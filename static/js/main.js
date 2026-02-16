/**
 * 对联生成系统 - 前端交互逻辑
 */

// DOM元素
const generateBtn = document.getElementById('generateBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const errorToast = document.getElementById('errorToast');
const errorText = document.getElementById('errorText');
const upperText = document.getElementById('upperText');
const lowerText = document.getElementById('lowerText');
const horizontalText = document.getElementById('horizontalText');
const keywordsInput = document.getElementById('keywords');

/**
 * 生成对联（有关键词时根据关键词生成，无关键词时随机生成）
 */
async function generateCouplet() {
    // 获取用户输入
    const keywords = keywordsInput.value.trim();
    const style = document.querySelector('input[name="style"]:checked').value;
    // 如果没有关键词，则为随机生成模式
    const isRandom = !keywords;
    
    // 禁用按钮，显示加载状态
    generateBtn.disabled = true;
    loadingOverlay.classList.add('active');
    
    try {
        const requestBody = isRandom 
            ? { random: true }
            : { keywords: keywords, style: style, random: false };
        
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 更新对联内容
            updateCouplet(data.upper, data.lower, data.horizontal);
            console.log(`${isRandom ? '随机' : ''}对联生成成功，尝试次数: ${data.attempts}`);
        } else {
            showError(data.error || '生成失败，请重试');
        }
    } catch (error) {
        console.error('请求错误:', error);
        showError('网络错误，请检查服务器连接');
    } finally {
        // 恢复按钮状态
        generateBtn.disabled = false;
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

/**
 * 复制对联文字
 */
async function copyCoupletText() {
    const copyBtn = document.getElementById('copyBtn');
    
    try {
        // 获取对联文字
        const horizontalText = document.getElementById('horizontalText').textContent;
        const upperText = document.getElementById('upperText').textContent;
        const lowerText = document.getElementById('lowerText').textContent;
        
        // 组合文字，添加标签
        const textToCopy = `横批：${horizontalText}\n上联：${upperText}\n下联：${lowerText}`;
        
        // 复制到剪贴板
        await navigator.clipboard.writeText(textToCopy);
        
        // 显示成功提示
        showError('对联文字已复制到剪贴板！');
        
        // 临时改变按钮文字
        const originalText = copyBtn.querySelector('.btn-text').textContent;
        copyBtn.querySelector('.btn-text').textContent = '已复制！';
        setTimeout(() => {
            copyBtn.querySelector('.btn-text').textContent = originalText;
        }, 2000);
        
    } catch (error) {
        console.error('复制失败:', error);
        showError('复制失败，请重试');
    }
}

/**
 * 保存对联为图片
 */
async function saveCoupletImage() {
    const saveBtn = document.getElementById('saveBtn');
    const coupletContainer = document.querySelector('.couplet-container');

    // 禁用保存按钮
    saveBtn.disabled = true;
    saveBtn.querySelector('.btn-text').textContent = '保存中...';

    try {
        // 等待所有字体加载完成
        console.log('等待字体加载...');
        await document.fonts.ready;

        // 额外等待确保字体完全加载
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('开始生成图片...');

        // 使用html2canvas生成图片 - 直接截取整个容器
        const canvas = await html2canvas(coupletContainer, {
            backgroundColor: '#2c1810',
            scale: 2, // 提高清晰度
            useCORS: true,
            allowTaint: true,
            logging: true,
            scrollX: 0,
            scrollY: 0,
            onclone: function(clonedDoc) {
                console.log('克隆文档完成，开始处理...');

                // 在克隆的文档中找到容器
                const clonedContainer = clonedDoc.querySelector('.couplet-container');
                if (clonedContainer) {
                    // 添加禁用动画类（同时会应用字体设置）
                    clonedContainer.classList.add('no-animation');

                    // 【关键修复】显式设置背景色，解决Linux下背景变黑的问题
                    // CSS渐变在某些环境下可能无法正确渲染，使用纯色背景作为后备
                    clonedContainer.style.background = '#2c1810';

                    // 确保容器有足够的高度显示所有内容
                    clonedContainer.style.height = 'auto';
                    clonedContainer.style.minHeight = 'auto';

                    // 确保卷轴内容完全显示，并设置红色背景
                    const scrollBodies = clonedContainer.querySelectorAll('.scroll-body');
                    scrollBodies.forEach(body => {
                        body.style.minHeight = 'auto';
                        body.style.height = 'auto';
                        // 【关键修复】设置红色背景，解决Linux下上联下联背景变黑的问题
                        // html2canvas在Linux Firefox下可能无法正确渲染CSS渐变
                        // 使用纯色背景确保兼容性，颜色与横批一致
                        // 使用cssText确保样式优先级最高
                        const currentStyle = body.style.cssText;
                        body.style.cssText = currentStyle + '; background: #DC143C !important; background-color: #DC143C !important; background-image: none !important;';
                    });

                    // 同时处理横批的背景，确保与上联下联样式一致
                    const horizontalScrolls = clonedContainer.querySelectorAll('.horizontal-scroll');
                    horizontalScrolls.forEach(scroll => {
                        const currentStyle = scroll.style.cssText;
                        scroll.style.cssText = currentStyle + '; background: #DC143C !important; background-color: #DC143C !important; background-image: none !important;';
                    });

                    // 确保装饰元素的背景也能正确渲染
                    const doorTexture = clonedContainer.querySelector('.door-texture');
                    if (doorTexture) {
                        doorTexture.style.setProperty('background', '#2c1810', 'important');
                        doorTexture.style.setProperty('background-image', 'none', 'important');
                    }
                }
            }
        });

        console.log('Canvas生成完成:', canvas.width, 'x', canvas.height);

        // 创建下载链接
        const link = document.createElement('a');
        const timestamp = new Date().getTime();
        link.download = `新春对联_${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');

        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 显示成功提示
        showError('对联已保存为图片！');

    } catch (error) {
        console.error('保存图片失败:', error);
        showError('保存失败，请重试');
    } finally {
        // 恢复按钮状态
        saveBtn.disabled = false;
        saveBtn.querySelector('.btn-text').textContent = '保存图片';
    }
}
