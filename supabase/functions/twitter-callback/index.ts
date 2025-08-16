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

function generateOAuthHeader(
  method: string, 
  url: string, 
  consumerSecret: string, 
  tokenSecret: string,
  additionalParams: Record<string, string> = {}
): string {
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    ...additionalParams,
  };

  const signature = generateOAuthSignature(method, url, oauthParams, consumerSecret, tokenSecret);
  
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
    const { oauthToken, oauthVerifier, sessionId } = await req.json();

    if (!oauthToken || !oauthVerifier || !sessionId) {
      throw new Error('Missing required parameters');
    }

    console.log('Processing callback for session:', sessionId);

    // Get session from database using secure function
    const { data: sessionData, error: sessionError } = await supabase.rpc('extensions.get_user_session_tokens', {
      p_session_id: sessionId
    });

    if (sessionError || !sessionData) {
      console.error('Session error:', sessionError);
      throw new Error('Invalid session');
    }

    // Verify OAuth token matches
    if (sessionData.oauth_token !== oauthToken) {
      throw new Error('OAuth token mismatch');
    }

    // Step 1: Exchange request token for access token
    const accessTokenUrl = 'https://api.twitter.com/oauth/access_token';
    
    const oauthHeader = generateOAuthHeader(
      'POST', 
      accessTokenUrl, 
      consumerSecret, 
      sessionData.oauth_token_secret,
      {
        oauth_token: oauthToken,
        oauth_verifier: oauthVerifier
      }
    );

    console.log('Exchanging tokens...');
    const response = await fetch(accessTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': oauthHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `oauth_verifier=${oauthVerifier}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange error:', errorText);
      throw new Error(`Failed to exchange tokens: ${response.status}`);
    }

    const responseText = await response.text();
    console.log('Access token response:', responseText);
    
    const params = new URLSearchParams(responseText);
    const accessToken = params.get('oauth_token');
    const accessTokenSecret = params.get('oauth_token_secret');
    const userId = params.get('user_id');
    const screenName = params.get('screen_name');

    if (!accessToken || !accessTokenSecret) {
      throw new Error('Failed to get access tokens');
    }

    // Step 2: Get user profile info
    const userUrl = 'https://api.twitter.com/2/users/me?user.fields=profile_image_url';
    const userOAuthHeader = generateOAuthHeader(
      'GET',
      userUrl,
      consumerSecret,
      accessTokenSecret,
      {
        oauth_token: accessToken
      }
    );

    console.log('Getting user info...');
    const userResponse = await fetch(userUrl, {
      method: 'GET',
      headers: {
        'Authorization': userOAuthHeader,
      },
    });

    let profileImageUrl = '';
    if (userResponse.ok) {
      const userData = await userResponse.json();
      profileImageUrl = userData.data?.profile_image_url || '';
      console.log('User data:', userData);
    }

    // Step 3: Update session with access tokens and user info using secure function
    const { error: updateError } = await supabase.rpc('extensions.update_user_session', {
      p_session_id: sessionId,
      p_access_token: accessToken,
      p_access_token_secret: accessTokenSecret,
      p_user_id: userId,
      p_username: screenName,
      p_profile_image_url: profileImageUrl,
      p_status: 'authenticated'
    });

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to update session');
    }

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: userId,
        username: screenName,
        profileImageUrl
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in twitter-callback:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});