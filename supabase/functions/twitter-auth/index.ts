import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'node:crypto';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const consumerKey = Deno.env.get('TWITTER_CONSUMER_KEY')!;
const consumerSecret = Deno.env.get('TWITTER_CONSUMER_SECRET')!;

function validateEnvironmentVariables() {
  // Debug: List all available environment variables
  console.log('=== ENVIRONMENT VARIABLES DEBUG ===');
  console.log('Available Deno.env keys:', Object.keys(Deno.env.toObject()));
  console.log('SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING');
  console.log('TWITTER_CONSUMER_KEY raw value:', JSON.stringify(Deno.env.get('TWITTER_CONSUMER_KEY')));
  console.log('TWITTER_CONSUMER_SECRET raw value:', JSON.stringify(Deno.env.get('TWITTER_CONSUMER_SECRET')));
  console.log('consumerKey processed:', JSON.stringify(consumerKey));
  console.log('consumerSecret processed:', JSON.stringify(consumerSecret));
  console.log('===================================');
  
  const missing = [];
  
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!consumerKey || consumerKey.trim() === '') missing.push('TWITTER_CONSUMER_KEY');
  if (!consumerSecret || consumerSecret.trim() === '') missing.push('TWITTER_CONSUMER_SECRET');
  
  if (missing.length > 0) {
    console.error('Missing environment variables:', missing);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  console.log('✓ All environment variables validated successfully');
}

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
  // Step 1: Percent encode keys and values separately
  const encodedParams = Object.entries(params)
    .map(([key, value]) => [encodeURIComponent(key), encodeURIComponent(value)])
    .sort(([a], [b]) => a.localeCompare(b)); // Sort by encoded keys
  
  // Step 2: Create parameter string
  const parameterString = encodedParams
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  // Step 3: Create signature base string
  const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(parameterString)}`;
  
  // Step 4: Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  // Step 5: Generate signature
  const hmacSha1 = createHmac('sha1', signingKey);
  const signature = hmacSha1.update(signatureBaseString).digest('base64');
  
  // Add debug logging (with masked secrets)
  console.log('OAuth Signature Debug:');
  console.log('- Method:', method);
  console.log('- URL:', url);
  console.log('- Parameter String:', parameterString);
  console.log('- Signature Base String:', signatureBaseString);
  console.log('- Consumer Secret (masked):', consumerSecret ? '***' + consumerSecret.slice(-4) : 'EMPTY');
  console.log('- Token Secret (masked):', tokenSecret ? '***' + tokenSecret.slice(-4) : 'EMPTY');
  console.log('- Generated Signature:', signature);
  
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

  // Debug log parameters (with masked consumer key)
  console.log('OAuth Parameters:');
  console.log('- Consumer Key (masked):', consumerKey ? '***' + consumerKey.slice(-4) : 'EMPTY');
  console.log('- Nonce:', oauthParams.oauth_nonce);
  console.log('- Timestamp:', oauthParams.oauth_timestamp);
  console.log('- Additional Params:', additionalParams);

  const signature = generateOAuthSignature(method, url, oauthParams, consumerSecret);
  
  const signedOAuthParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  const entries = Object.entries(signedOAuthParams).sort((a, b) => a[0].localeCompare(b[0]));
  
  const authHeader = 'OAuth ' + entries
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(', ');
  
  console.log('Generated OAuth Header:', authHeader);
  
  return authHeader;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Debug: Show ALL environment variables first
    console.log('=== COMPLETE ENVIRONMENT DEBUG ===');
    const allEnvVars = Deno.env.toObject();
    console.log('Total env vars count:', Object.keys(allEnvVars).length);
    for (const [key, value] of Object.entries(allEnvVars)) {
      if (key.includes('TWITTER') || key.includes('SUPABASE')) {
        console.log(`${key}: ${value ? (key.includes('SECRET') ? '***' + value.slice(-4) : value) : 'UNDEFINED'}`);
      }
    }
    console.log('Raw TWITTER_CONSUMER_KEY:', Deno.env.get('TWITTER_CONSUMER_KEY'));
    console.log('Raw TWITTER_CONSUMER_SECRET:', Deno.env.get('TWITTER_CONSUMER_SECRET'));
    console.log('================================');

    // Validate environment variables
    validateEnvironmentVariables();

    // Step 1: Get request token from Twitter
    const requestTokenUrl = 'https://api.twitter.com/oauth/request_token';
    const callbackUrl = `${req.headers.get('origin')}/confirm`;
    
    const oauthHeader = generateOAuthHeader('POST', requestTokenUrl, {
      oauth_callback: callbackUrl
    });

    console.log('Requesting token from Twitter...');
    console.log('OAuth Header:', oauthHeader);
    const response = await fetch(requestTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': oauthHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twitter API error - Status:', response.status);
      console.error('Twitter API error - Body:', errorText);
      console.error('Twitter API error - Headers:', Object.fromEntries(response.headers.entries()));
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

    // Step 2: Generate session ID and store tokens directly in user_sessions table
    const sessionId = crypto.randomUUID();
    
    console.log('Storing session data for sessionId:', sessionId);
    
    const { error: dbError } = await supabase
      .from('user_sessions')
      .insert({
        session_id: sessionId,
        oauth_token: oauthToken,
        oauth_token_secret: oauthTokenSecret,
        status: 'pending'
      });

    if (dbError) {
      console.error('Database error inserting session:', dbError);
      throw new Error('Failed to store session data');
    }
    
    console.log('✓ Session data stored successfully');

    // Step 3: Return authorization URL (no oauth_callback needed here)
    const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`;
    
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