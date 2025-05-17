// Cloudflare Pages函数，用于安全地提供API密钥
export async function onRequest(context) {
  try {
    // 从环境变量中获取API密钥
    const apiKey = context.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: "API密钥未配置" 
        }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    
    // 返回API密钥
    return new Response(
      JSON.stringify({ 
        apiKey: apiKey 
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: "获取API密钥时出错" 
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" }
      }
    );
  }
} 