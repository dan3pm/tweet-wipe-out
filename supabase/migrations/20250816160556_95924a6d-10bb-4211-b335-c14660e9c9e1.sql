-- Complete security lockdown for user_sessions table
-- Drop all current policies and implement zero-trust approach
DROP POLICY IF EXISTS "Service role can read all session data" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can insert session data" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can update session data" ON public.user_sessions;
DROP POLICY IF EXISTS "Block all other access to sensitive session data" ON public.user_sessions;
DROP POLICY IF EXISTS "Block access to session status view" ON public.user_sessions;

-- Completely block ALL public role access (including anon and authenticated)
CREATE POLICY "Block all public access to OAuth tokens"
ON public.user_sessions
FOR ALL
TO public, anon, authenticated
USING (false)
WITH CHECK (false);

-- Only allow service_role access (used by edge functions)
CREATE POLICY "Service role only access"
ON public.user_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Drop and recreate the view with proper security
DROP VIEW IF EXISTS public.session_status_view;

-- Create a proper secure view that can be safely accessed
CREATE VIEW public.session_status_view 
WITH (security_invoker=true) AS
SELECT 
    session_id,
    status,
    username,
    profile_image_url,
    tweets_processed,
    total_tweets,
    error_message,
    created_at,
    updated_at
FROM public.user_sessions;

-- Enable RLS on the view
ALTER VIEW public.session_status_view ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for the view - only allow access via get_session_status function
CREATE POLICY "Block direct view access"
ON public.session_status_view
FOR ALL
TO public, anon, authenticated
USING (false);

-- Allow service role to access view (for internal functions)
CREATE POLICY "Service role can access view"
ON public.session_status_view
FOR SELECT
TO service_role
USING (true);

-- Update the get_session_status function with better security
CREATE OR REPLACE FUNCTION public.get_session_status(session_id_param text)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  session_data JSON;
BEGIN
  -- Validate input
  IF session_id_param IS NULL OR LENGTH(session_id_param) = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Only return non-sensitive status information
  -- This function runs with SECURITY DEFINER so it can access the table
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
$function$;

-- Revoke all public access to the table
REVOKE ALL ON public.user_sessions FROM public;
REVOKE ALL ON public.user_sessions FROM anon;  
REVOKE ALL ON public.user_sessions FROM authenticated;

-- Revoke all public access to the view
REVOKE ALL ON public.session_status_view FROM public;
REVOKE ALL ON public.session_status_view FROM anon;
REVOKE ALL ON public.session_status_view FROM authenticated;

-- Grant only specific access to service_role
GRANT ALL ON public.user_sessions TO service_role;
GRANT SELECT ON public.session_status_view TO service_role;

-- Add comprehensive comments
COMMENT ON TABLE public.user_sessions IS 'SECURITY CRITICAL: Contains OAuth tokens for Twitter/X access. NO PUBLIC ACCESS. Service role only.';
COMMENT ON VIEW public.session_status_view IS 'Safe view excluding OAuth tokens. Access via get_session_status() function only.';
COMMENT ON FUNCTION public.get_session_status IS 'PUBLIC FUNCTION: Returns safe session status without OAuth tokens. Only exposed data safe for public consumption.';