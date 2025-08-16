import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      throw new Error('Missing session ID');
    }

    console.log('Getting status for session:', sessionId);

    // Get session status from database using secure public function
    const { data: session, error: sessionError } = await supabase.rpc('get_session_status', {
      session_id_param: sessionId
    });

    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      throw new Error('Session not found');
    }

    // Calculate progress percentage
    let progress = 0;
    if (session.total_tweets > 0) {
      progress = Math.round((session.tweets_processed / session.total_tweets) * 100);
    }

    return new Response(JSON.stringify({
      sessionId: session.session_id,
      status: session.status,
      user: {
        id: session.user_id,
        username: session.username,
        profileImageUrl: session.profile_image_url
      },
      progress: {
        processed: session.tweets_processed || 0,
        total: session.total_tweets || 0,
        percentage: progress
      },
      errorMessage: session.error_message,
      createdAt: session.created_at,
      updatedAt: session.updated_at
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in twitter-status:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});