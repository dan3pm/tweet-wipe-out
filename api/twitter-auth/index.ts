// /api/twitter-auth/index.ts (VERSÃO DE TESTE)

export default async (req: Request): Promise<Response> => {
  // A primeira coisa que o código faz é registrar isso.
  console.log("Função de teste invocada com sucesso!");
  console.log(`Método da requisição: ${req.method}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }
  
  try {
    const responseBody = JSON.stringify({ message: "Endpoint de teste está funcionando!" });
    
    return new Response(responseBody, {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
       },
    });

  } catch (error) {
    console.error("Erro inesperado na função de teste:", error);
    
    return new Response(JSON.stringify({ error: "Erro interno no servidor de teste." }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  }
};
