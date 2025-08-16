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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTweets(userId: string, accessToken: string, accessTokenSecret: string, paginationToken?: string) {
  const baseUrl = `https://api.twitter.com/2/users/${userId}/tweets`;
  const params = new URLSearchParams({
    max_results: '100',
    exclude: 'retweets,replies'
  });
  
  if (paginationToken) {
    params.append('pagination_token', paginationToken);
  }

  const url = `${baseUrl}?${params.toString()}`;
  
  const oauthHeader = generateOAuthHeader(
    'GET',
    url,
    consumerSecret,
    accessTokenSecret,
    {
      oauth_token: accessToken
    }
  );

  console.log('Fetching tweets from:', url);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': oauthHeader,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to fetch tweets:', errorText);
    throw new Error(`Failed to fetch tweets: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function deleteTweet(tweetId: string, accessToken: string, accessTokenSecret: string) {
  const url = `https://api.twitter.com/2/tweets/${tweetId}`;
  
  const oauthHeader = generateOAuthHeader(
    'DELETE',
    url,
    consumerSecret,
    accessTokenSecret,
    {
      oauth_token: accessToken
    }
  );

  console.log('Deleting tweet:', tweetId);
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': oauthHeader,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to delete tweet:', tweetId, errorText);
    // Don't throw error for individual deletions to continue with the rest
    return { success: false, error: errorText };
  }

  const result = await response.json();
  return { success: result.data?.deleted || false };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error('Missing session ID');
    }

    console.log('Starting tweet processing for session:', sessionId);

    // Get session from database
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'authenticated')
      .single();

    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      throw new Error('Invalid or expired session');
    }

    if (!session.access_token || !session.access_token_secret || !session.user_id) {
      throw new Error('Missing access tokens or user ID');
    }

    // Update status to processing
    await supabase
      .from('user_sessions')
      .update({ status: 'processing' })
      .eq('session_id', sessionId);

    // Start background processing
    EdgeRuntime.waitUntil(processAllTweets(session));

    return new Response(JSON.stringify({
      success: true,
      message: 'Tweet processing started'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in twitter-process:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processAllTweets(session: any) {
  const { session_id, access_token, access_token_secret, user_id } = session;
  
  try {
    console.log('Starting tweet processing for user:', user_id);
    
    let allTweets: any[] = [];
    let paginationToken: string | undefined;
    let totalFetched = 0;
    
    // Fetch all tweets (up to 3200)
    while (totalFetched < 3200) {
      try {
        const response = await fetchTweets(user_id, access_token, access_token_secret, paginationToken);
        
        if (!response.data || response.data.length === 0) {
          console.log('No more tweets to fetch');
          break;
        }
        
        allTweets = allTweets.concat(response.data);
        totalFetched += response.data.length;
        
        console.log(`Fetched ${response.data.length} tweets, total: ${totalFetched}`);
        
        // Update total count in database
        await supabase
          .from('user_sessions')
          .update({ total_tweets: totalFetched })
          .eq('session_id', session_id);
        
        // Check for pagination
        paginationToken = response.meta?.next_token;
        
        if (!paginationToken) {
          console.log('No more pages to fetch');
          break;
        }
        
        // Rate limiting: Wait 1 second between requests
        await sleep(1000);
        
      } catch (error) {
        console.error('Error fetching tweets:', error);
        break;
      }
    }
    
    console.log(`Total tweets fetched: ${allTweets.length}`);
    
    // Update total tweets count
    await supabase
      .from('user_sessions')
      .update({ total_tweets: allTweets.length })
      .eq('session_id', session_id);
    
    // Delete tweets in batches
    let processed = 0;
    const batchSize = 10;
    
    for (let i = 0; i < allTweets.length; i += batchSize) {
      const batch = allTweets.slice(i, i + batchSize);
      
      // Process batch in parallel
      const deletionPromises = batch.map(tweet => 
        deleteTweet(tweet.id, access_token, access_token_secret)
      );
      
      const results = await Promise.allSettled(deletionPromises);
      processed += results.length;
      
      // Update progress
      await supabase
        .from('user_sessions')
        .update({ tweets_processed: processed })
        .eq('session_id', session_id);
      
      console.log(`Processed ${processed}/${allTweets.length} tweets`);
      
      // Rate limiting: Wait 5 seconds between batches to respect rate limits
      if (i + batchSize < allTweets.length) {
        await sleep(5000);
      }
    }
    
    // Mark as completed
    await supabase
      .from('user_sessions')
      .update({ 
        status: 'completed',
        tweets_processed: processed 
      })
      .eq('session_id', session_id);
    
    console.log(`Completed processing ${processed} tweets for session ${session_id}`);
    
  } catch (error: any) {
    console.error('Error processing tweets:', error);
    
    // Mark as error
    await supabase
      .from('user_sessions')
      .update({ 
        status: 'error',
        error_message: error.message 
      })
      .eq('session_id', session_id);
  }
}