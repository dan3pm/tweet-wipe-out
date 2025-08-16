// NENHUMA DEPENDÊNCIA EXTERNA DE CRIPTOGRAFIA NECESSÁRIA

const consumerKey = Deno.env.get('TWITTER_CONSUMER_KEY')!;
const consumerSecret = Deno.env.get('TWITTER_CONSUMER_SECRET')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- FUNÇÃO DE ASSINATURA REESCRITA USANDO A WEB CRYPTO API (PADRÃO MODERNO) ---
async function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ''
): Promise<string> {
  const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(
    Object.entries(params)
      .sort()
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')
  )}`;
  
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signatureBaseString)
  );
  
  // Converte o resultado para Base64
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
  
  return signature;
}

// --- FUNÇÃO PRINCIPAL AGORA É 'async' PARA AGUARDAR A ASSINATURA ---
async function generateOAuthHeader(method: string, url: string, additionalParams: Record<string, string> = {}): Promise<string> {
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    ...additionalParams,
  };

  const signature = await generateOAuthSignature(method, url, oauthParams, consumerSecret);
  
  const signedOAuthParams = { ...oauthParams, oauth_signature: signature };
  
  const entries = Object.entries(signedOAuthParams).sort((a, b) => a[0].localeCompare(b[0]));
  
  return 'OAuth ' + entries
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(', ');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestTokenUrl = 'https://api.twitter.com/oauth/request_token';
    const callbackUrl = `${req.headers.get('origin')}/confirm`;
    
    // Agora precisamos usar 'await' aqui porque a função ficou assíncrona
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
    
    // REMOVEMOS A PARTE DO SUPABASE DAQUI PARA SIMPLIFICAR O TESTE INICIAL
    // O objetivo agora é apenas ser redirecionado para o Twitter com sucesso.
    
    return new Response(JSON.stringify({ authUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in twitter-auth function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
