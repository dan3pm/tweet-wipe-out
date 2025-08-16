-- Remove the overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on user_sessions" ON public.user_sessions;

-- Create secure RLS policies that prevent direct client access
-- Only allow operations through edge functions (which use service role)

-- Block all direct client access to sensitive data
CREATE POLICY "Block direct client access to user_sessions"
ON public.user_sessions
FOR ALL
TO anon, authenticated
USING (false);

-- Allow service role (edge functions) full access
CREATE POLICY "Allow service role full access to user_sessions"
ON public.user_sessions
FOR ALL
TO service_role
USING (true);

-- Create a secure function for clients to check session status only
CREATE OR REPLACE FUNCTION public.get_session_status(session_id_param TEXT)
RETURNS JSON AS $$
DECLARE
  session_data JSON;
BEGIN
  -- Only return non-sensitive status information
  SELECT json_build_object(
    'session_id', session_id,
    'status', status,
    'username', username,
    'profile_image_url', profile_image_url,
    'tweets_processed', tweets_processed,
    'total_tweets', total_tweets,
    'error_message', error_message,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO session_data
  FROM public.user_sessions 
  WHERE session_id = session_id_param;
  
  RETURN session_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon users (for frontend)
GRANT EXECUTE ON FUNCTION public.get_session_status(TEXT) TO anon;