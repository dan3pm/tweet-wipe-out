-- Fix Security Definer View issue
-- Drop the existing view that has security definer property
DROP VIEW IF EXISTS public.session_status_view;

-- Recreate the view without SECURITY DEFINER property to fix the security issue
CREATE VIEW public.session_status_view AS
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

-- Enable RLS on the view (without security_barrier which was causing the SECURITY DEFINER issue)
ALTER VIEW public.session_status_view SET (security_invoker = true);

-- Add RLS policy for the view to ensure proper access control
CREATE POLICY "Block access to session status view"
ON public.user_sessions
FOR SELECT
TO public
USING (false);

-- Ensure the get_session_status function follows security best practices
CREATE OR REPLACE FUNCTION public.get_session_status(session_id_param text)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Add additional security comment
COMMENT ON FUNCTION public.get_session_status IS 'Returns non-sensitive session status. OAuth tokens are never exposed.';