// DOM元素
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const giveUpBtn = document.getElementById('giveUpBtn');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const roundCount = document.getElementById('roundCount');
const tokenCount = document.getElementById('tokenCount');

// 游戏状态
let gameActive = false;
let currentRound = 0;
let totalTokens = 0;
let isGenerating = false;
let conversationHistory = [];
let currentBg = Math.floor(Math.random() * 3) + 1; // 随机选择背景 (1-3)

// 初始化事件监听器
function initEventListeners() {
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', restartGame);
    sendBtn.addEventListener('click', sendMessage);
    giveUpBtn.addEventListener('click', giveUp);
    
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isGenerating && gameActive) {
            sendMessage();
        }
    });
}

// 设置背景图片
function setRandomBackground() {
    // 移除所有背景类
    document.body.classList.remove('bg1', 'bg2', 'bg3');
    // 添加随机背景类
    document.body.classList.add(`bg${currentBg}`);
}

// 开始游戏
async function startGame() {
    gameActive = true;
    currentRound = 0;
    totalTokens = 0;
    conversationHistory = [];
    
    // 更新UI
    startBtn.style.display = 'none';
    restartBtn.style.display = 'none';
    userInput.disabled = false;
    sendBtn.disabled = false;
    giveUpBtn.disabled = false;
    chatMessages.innerHTML = '';
    updateRoundCount();
    updateTokenCount();
    
    // 发送初始提示给AI
    await sendInitialPrompt();
}

// 重新开始游戏
function restartGame() {
    // 确保所有状态被正确重置
    gameActive = false;
    currentRound = 0;
    totalTokens = 0;
    conversationHistory = [];
    
    // 随机切换背景
    currentBg = Math.floor(Math.random() * 3) + 1;
    setRandomBackground();
    
    // 更新UI
    startBtn.style.display = 'none';
    restartBtn.style.display = 'none';
    chatMessages.innerHTML = '';
    updateRoundCount();
    updateTokenCount();
    
    // 重新启动游戏
    startGame();
}

// 发送初始提示给AI
async function sendInitialPrompt() {
    isGenerating = true;
    showLoadingIndicator();
    
    const systemPrompt = `你是一个Minecraft物品猜谜游戏的AI助手。游戏规则：你想一个截止到你数据库结束的Minecraft物品（必须是具体的，例如粉色羊毛、夜视药水、钻石头盔，不能是羊毛、药水、头盔），用户会进行多轮对话询问你的特性,，你只能回答"是"、"不是"或"不确定"。如果用户直接猜出物品名称，且猜对了，你应该回答"猜测正确！"，如果猜错了，你应该回答"不是，请继续猜测",保持回答简短，不要提供额外信息， 如果用户放弃，请直接告诉他们正确答案。开始时，请说"我想好了一个Minecraft物品，请开始猜测！"`;
    
    try {
        console.log("开始调用API...");
        
        // 获取API密钥
        const apiKey = await getApiKeyFromServer();
        if (!apiKey) {
            throw new Error("无法从服务器获取API密钥");
        }
        
        console.log("成功获取API密钥");
        const url = "https://openrouter.ai/api/v1/chat/completions";
        
        // 构造消息数组
        const messages = [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: "开始游戏，请说'我想好了一个Minecraft物品，请开始猜测！'"
            }
        ];
        
        const payload = {
            model: "qwen/qwen3-14b",
            messages: messages,
            temperature: 0.7,
            max_tokens: 256
        };
        
        console.log("直接API请求载荷:", payload);
        
        // 发送请求
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://mcguesser.071400.xyz",
                "X-Title": "MCguesser"
            },
            body: JSON.stringify(payload)
        });
        
        console.log("API响应状态:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API错误响应:", errorText);
            
            try {
                const errorData = JSON.parse(errorText);
                console.error("API错误详情:", errorData);
                throw new Error(`API错误: ${errorData.error?.message || response.statusText}`);
            } catch (parseError) {
                throw new Error(`API错误 (${response.status}): ${errorText || response.statusText}`);
            }
        }
        
        const data = await response.json().catch(error => {
            console.error("解析API响应JSON失败:", error);
            throw new Error("解析API响应JSON失败");
        });
        
        console.log("完整API响应数据:", data);
        
        // 处理响应
        if (data && data.choices && data.choices.length > 0 && data.choices[0].message) {
            const aiMessage = data.choices[0].message.content || "";
            console.log("原始AI消息:", aiMessage);
            
            // 如果消息为空，使用默认消息
            const finalMessage = aiMessage.trim() || "我想好了一个Minecraft物品，请开始猜测！";
            console.log("最终使用的消息:", finalMessage);
            
            // 更新token计数
            const tokens = data.usage || { total_tokens: 0 };
            totalTokens += tokens.total_tokens;
            updateTokenCount();
            
            // 初始化对话历史
            conversationHistory = [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: "开始游戏"
                },
                {
                    role: "assistant",
                    content: finalMessage
                }
            ];
            
            // 显示AI消息
            displayAIMessage(finalMessage);
        } else {
            console.error("API响应格式无效:", data);
            // 如果没有收到有效响应，显示默认消息
            handleInitialMessageFallback();
        }
    } catch (error) {
        console.error("Error starting game:", error);
        displayErrorMessage(`游戏启动失败: ${error.message}`);
        
        // 出错时显示默认消息，让游戏可以继续
        handleInitialMessageFallback();
    }
    
    hideLoadingIndicator();
    isGenerating = false;
}

// 从服务器获取API密钥
async function getApiKeyFromServer() {
    try {
        // 创建一个API端点来获取API密钥
        const response = await fetch('/api/get-api-key');
        
        if (!response.ok) {
            console.error("获取API密钥失败:", response.status, response.statusText);
            return null;
        }
        
        const data = await response.json();
        return data.apiKey;
    } catch (error) {
        console.error("获取API密钥时出错:", error);
        return null;
    }
}

// 发送用户消息
async function sendMessage() {
    if (!gameActive || isGenerating || userInput.value.trim() === '') return;
    
    const userMessage = userInput.value.trim();
    userInput.value = '';
    
    // 显示用户消息
    displayUserMessage(userMessage);
    
    // 添加到对话历史
    conversationHistory.push({
        role: "user",
        content: userMessage
    });
    
    // 增加回合计数
    currentRound++;
    updateRoundCount();
    
    // 禁用输入
    isGenerating = true;
    userInput.disabled = true;
    sendBtn.disabled = true;
    giveUpBtn.disabled = true;
    
    // 显示加载指示器
    showLoadingIndicator();
    
    try {
        // 获取API密钥
        const apiKey = await getApiKeyFromServer();
        if (!apiKey) {
            throw new Error("无法从服务器获取API密钥");
        }
        
        const url = "https://openrouter.ai/api/v1/chat/completions";
        
        const payload = {
            model: "qwen/qwen3-14b",
            messages: conversationHistory,
            temperature: 0.7,
            max_tokens: 256
        };
        
        console.log("发送消息API请求载荷:", payload);
        
        // 发送请求
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://mcguesser.071400.xyz",
                "X-Title": "MCguesser"
            },
            body: JSON.stringify(payload)
        });
        
        console.log("API响应状态:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API错误响应:", errorText);
            
            try {
                const errorData = JSON.parse(errorText);
                console.error("API错误详情:", errorData);
                throw new Error(`API错误: ${errorData.error?.message || response.statusText}`);
            } catch (parseError) {
                throw new Error(`API错误 (${response.status}): ${errorText || response.statusText}`);
            }
        }
        
        const data = await response.json().catch(error => {
            console.error("解析API响应JSON失败:", error);
            throw new Error("解析API响应JSON失败");
        });
        
        console.log("完整API响应数据:", data);
        
        // 处理响应
        if (data && data.choices && data.choices.length > 0 && data.choices[0].message) {
            const aiMessage = data.choices[0].message.content || "";
            console.log("原始AI消息:", aiMessage);
            
            // 如果消息为空，使用默认消息
            const finalMessage = aiMessage.trim() || "不确定";
            console.log("最终使用的消息:", finalMessage);
            
            // 更新token计数
            const tokens = data.usage || { total_tokens: 0 };
            totalTokens += tokens.total_tokens;
            updateTokenCount();
            
            // 添加消息到对话历史
            conversationHistory.push({
                role: "assistant",
                content: finalMessage
            });
            
            // 显示AI消息
            displayAIMessage(finalMessage);
            
            // 检查游戏是否结束
            if (finalMessage.includes("猜测正确") || currentRound >= 15) {
                endGame();
            } else {
                // 启用输入
                enableUserInput();
            }
        } else {
            console.error("API响应格式无效:", data);
            displayErrorMessage("AI回应失败，但游戏可以继续。");
            enableUserInput();
        }
    } catch (error) {
        console.error("Error sending message:", error);
        displayErrorMessage(`发送消息失败: ${error.message}`);
        
        // 启用输入
        enableUserInput();
    }
    
    hideLoadingIndicator();
    isGenerating = false;
}

// 放弃游戏
async function giveUp() {
    if (!gameActive || isGenerating) return;
    
    const giveUpMessage = "我已放弃，请直接说出答案";
    
    // 显示用户消息
    displayUserMessage(giveUpMessage);
    
    // 添加到对话历史
    conversationHistory.push({
        role: "user",
        content: giveUpMessage
    });
    
    // 禁用输入
    isGenerating = true;
    userInput.disabled = true;
    sendBtn.disabled = true;
    giveUpBtn.disabled = true;
    
    // 显示加载指示器
    showLoadingIndicator();
    
    try {
        // 获取API密钥
        const apiKey = await getApiKeyFromServer();
        if (!apiKey) {
            throw new Error("无法从服务器获取API密钥");
        }
        
        const url = "https://openrouter.ai/api/v1/chat/completions";
        
        const payload = {
            model: "qwen/qwen3-14b",
            messages: conversationHistory,
            temperature: 0.7,
            max_tokens: 256
        };
        
        console.log("放弃游戏API请求载荷:", payload);
        
        // 发送请求
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://mcguesser.071400.xyz",
                "X-Title": "MCguesser"
            },
            body: JSON.stringify(payload)
        });
        
        console.log("API响应状态:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API错误响应:", errorText);
            
            try {
                const errorData = JSON.parse(errorText);
                console.error("API错误详情:", errorData);
                throw new Error(`API错误: ${errorData.error?.message || response.statusText}`);
            } catch (parseError) {
                throw new Error(`API错误 (${response.status}): ${errorText || response.statusText}`);
            }
        }
        
        const data = await response.json().catch(error => {
            console.error("解析API响应JSON失败:", error);
            throw new Error("解析API响应JSON失败");
        });
        
        console.log("完整API响应数据:", data);
        
        // 处理响应
        if (data && data.choices && data.choices.length > 0 && data.choices[0].message) {
            const aiMessage = data.choices[0].message.content || "";
            console.log("原始AI消息:", aiMessage);
            
            // 如果消息为空，使用默认消息
            const finalMessage = aiMessage.trim() || "游戏结束，谢谢参与！";
            console.log("最终使用的消息:", finalMessage);
            
            // 更新token计数
            const tokens = data.usage || { total_tokens: 0 };
            totalTokens += tokens.total_tokens;
            updateTokenCount();
            
            // 添加消息到对话历史
            conversationHistory.push({
                role: "assistant",
                content: finalMessage
            });
            
            // 显示AI消息
            displayAIMessage(finalMessage);
        } else {
            console.error("API响应格式无效:", data);
            displayErrorMessage("无法获取答案，游戏已结束。");
        }
    } catch (error) {
        console.error("Error giving up:", error);
        displayErrorMessage(`放弃游戏失败: ${error.message}`);
    }
    
    // 无论API调用成功与否，都结束游戏
    endGame();
    hideLoadingIndicator();
    isGenerating = false;
}

// 结束游戏
function endGame() {
    gameActive = false;
    restartBtn.style.display = 'block';
    userInput.disabled = true;
    sendBtn.disabled = true;
    giveUpBtn.disabled = true;
}

// 处理初始消息的后备方案
function handleInitialMessageFallback() {
    const systemPrompt = `你是一个Minecraft物品猜谜游戏的AI助手。游戏规则：你想一个截止到你数据库结束的Minecraft物品（必须是具体的，例如粉色羊毛、夜视药水、钻石头盔，不能是羊毛、药水、头盔），用户会进行多轮对话询问你的特性,，你只能回答"是"、"不是"或"不确定"。如果用户直接猜出物品名称，且猜对了，你应该回答"猜测正确！"，如果猜错了，你应该回答"不是，请继续猜测",保持回答简短，不要提供额外信息， 如果用户放弃，请直接告诉他们正确答案。`;
    const defaultMessage = "我想好了一个Minecraft物品，请开始猜测！";
    
    // 初始化对话历史
    conversationHistory = [
        {
            role: "system",
            content: systemPrompt
        },
        {
            role: "user",
            content: "开始游戏"
        },
        {
            role: "assistant",
            content: defaultMessage
        }
    ];
    
    displayAIMessage(defaultMessage);
    
    // 确保游戏状态正确
    gameActive = true;
    userInput.disabled = false;
    sendBtn.disabled = false;
    giveUpBtn.disabled = false;
}

// 显示用户消息
function displayUserMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message user-message';
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    scrollToBottom();
}

// 显示AI消息
function displayAIMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message ai-message';
    
    // 根据回答内容添加不同的样式
    if (message.includes("是") && !message.includes("不是")) {
        messageElement.classList.add('yes');
    } else if (message.includes("不是")) {
        messageElement.classList.add('no');
    } else if (message.includes("不确定")) {
        messageElement.classList.add('maybe');
    }
    
    // 创建打字机效果的span
    const typingSpan = document.createElement('span');
    typingSpan.className = 'typing';
    typingSpan.textContent = message;
    messageElement.appendChild(typingSpan);
    
    chatMessages.appendChild(messageElement);
    scrollToBottom();
}

// 显示错误消息
function displayErrorMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message ai-message error';
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    scrollToBottom();
}

// 显示加载指示器
function showLoadingIndicator() {
    const loadingElement = document.createElement('div');
    loadingElement.className = 'message ai-message loading';
    loadingElement.id = 'loadingIndicator';
    
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'loading-dots';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'loading-dot';
        dotsContainer.appendChild(dot);
    }
    
    loadingElement.appendChild(dotsContainer);
    chatMessages.appendChild(loadingElement);
    scrollToBottom();
}

// 隐藏加载指示器
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.classList.add('fadeOut');
        setTimeout(() => {
            loadingIndicator.remove();
        }, 300);
    }
}

// 滚动到底部
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 更新回合计数
function updateRoundCount() {
    roundCount.textContent = currentRound;
}

// 更新token计数
function updateTokenCount() {
    tokenCount.textContent = totalTokens;
}

// 启用用户输入
function enableUserInput() {
    userInput.disabled = false;
    sendBtn.disabled = false;
    giveUpBtn.disabled = false;
    userInput.focus();
}

// 初始化应用
function initApp() {
    // 初始化事件监听器
    initEventListeners();
    
    // 初始化UI状态
    userInput.disabled = true;
    sendBtn.disabled = true;
    giveUpBtn.disabled = true;
    restartBtn.style.display = 'none';
    startBtn.style.display = 'block';
    
    // 清空聊天记录
    chatMessages.innerHTML = '';
    
    // 重置计数器
    currentRound = 0;
    totalTokens = 0;
    updateRoundCount();
    updateTokenCount();
    
    // 设置随机背景
    setRandomBackground();
    
    // 显示API密钥获取状态
    checkApiKeyAvailability();
}

// 检查API密钥是否可用
async function checkApiKeyAvailability() {
    try {
        const apiKey = await getApiKeyFromServer();
        if (apiKey) {
            console.log("API密钥获取成功，游戏准备就绪");
        } else {
            displayErrorMessage("无法获取API密钥，请确保在Cloudflare Pages的'变量与机密'中设置了OPENROUTER_API_KEY环境变量，并创建了相应的API端点");
            startBtn.disabled = true;
        }
    } catch (error) {
        console.error("检查API密钥时出错:", error);
        displayErrorMessage("检查API密钥时出错，请刷新页面重试");
        startBtn.disabled = true;
    }
}

// 在页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp); 