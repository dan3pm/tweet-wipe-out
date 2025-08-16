import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'node:crypto';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const consumerKey = Deno.env.get('TWITTER_CONSUMER_KEY')!;
const consumerSecret = Deno.env.get('TWITTER_CONSUMER_SECRET')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ''
): string {
  const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(
    Object.entries(params)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join('&')
  )}`;
  
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  const hmacSha1 = createHmac('sha1', signingKey);
  const signature = hmacSha1.update(signatureBaseString).digest('base64');
  
  return signature;
}

function generateOAuthHeader(method: string, url: string, additionalParams: Record<string, string> = {}): string {
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    ...additionalParams,
  };

  const signature = generateOAuthSignature(method, url, oauthParams, consumerSecret);
  
  const signedOAuthParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

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
    // Step 1: Get request token from Twitter
    const requestTokenUrl = 'https://api.twitter.com/oauth/request_token';
    const callbackUrl = `${req.headers.get('origin')}/confirm`;
    
    const oauthHeader = generateOAuthHeader('POST', requestTokenUrl, {
      oauth_callback: encodeURIComponent(callbackUrl)
    });

    console.log('Requesting token from Twitter...');
    const response = await fetch(requestTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': oauthHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `oauth_callback=${encodeURIComponent(callbackUrl)}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twitter API error:', errorText);
      throw new Error(`Twitter API error: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log('Twitter response:', responseText);
    
    const params = new URLSearchParams(responseText);
    const oauthToken = params.get('oauth_token');
    const oauthTokenSecret = params.get('oauth_token_secret');

    if (!oauthToken || !oauthTokenSecret) {
      throw new Error('Failed to get OAuth tokens from Twitter');
    }

    // Step 2: Generate session ID and store tokens using encrypted storage
    const sessionId = crypto.randomUUID();
    
    const { error: dbError } = await supabase.rpc('extensions.create_user_session', {
      p_session_id: sessionId,
      p_oauth_token: oauthToken,
      p_oauth_token_secret: oauthTokenSecret,
      p_status: 'pending'
    });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store session data');
    }

    // Step 3: Return authorization URL
    const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}&oauth_callback=${encodeURIComponent(callbackUrl)}`;
    
    return new Response(JSON.stringify({ 
      authUrl,
      sessionId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in twitter-auth:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});