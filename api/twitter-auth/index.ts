const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  // A primeira coisa que este código faz é registrar esta mensagem.
  // Se isso não aparecer no log, nada mais importa.
  console.log("--- HELLO FROM VERCELL! --- A função foi executada com sucesso.");

  // Responde ao navegador para requisições de CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Retorna uma resposta de sucesso para o navegador.
  return new Response(
    JSON.stringify({ message: "A função 'twitter-auth' respondeu com sucesso." }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
