// FORMATO CORRETO PARA VERCEL
export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestTokenUrl = 'https://api.twitter.com/oauth/request_token';
    // O 'origin' vem do cabeçalho da requisição
    const origin = req.headers.get('origin'); 
    const callbackUrl = `${origin}/confirm`;

    console.log(`Callback URL gerado: ${callbackUrl}`); // <--- Adicione este log!

    const oauthHeader = await generateOAuthHeader('POST', requestTokenUrl, {
      oauth_callback: callbackUrl
    });
    
    const response = await fetch(requestTokenUrl, {
      method: 'POST',
      headers: { 'Authorization': oauthHeader },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Twitter API Error: ${response.status}`, errorText);
      throw new Error(`Twitter API error: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();
    const params = new URLSearchParams(responseText);
    const oauthToken = params.get('oauth_token');

    if (!oauthToken) {
      throw new Error('Failed to get OAuth token from Twitter response');
    }

    const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`;
    
    return new Response(JSON.stringify({ authUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('Error in twitter-auth function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};
