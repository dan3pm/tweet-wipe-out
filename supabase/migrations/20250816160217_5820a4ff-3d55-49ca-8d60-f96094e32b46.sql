-- Drop existing policies to replace with more granular ones
DROP POLICY IF EXISTS "Allow service role full access to user_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Block direct client access to user_sessions" ON public.user_sessions;

-- Policy 1: Allow service role to read all data (for edge functions that need OAuth tokens)
CREATE POLICY "Service role can read all session data"
ON public.user_sessions
FOR SELECT
TO service_role
USING (true);

-- Policy 2: Allow service role to insert session data (for twitter-auth function)
CREATE POLICY "Service role can insert session data"
ON public.user_sessions
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy 3: Allow service role to update session data (for twitter-callback and twitter-process functions)
CREATE POLICY "Service role can update session data"
ON public.user_sessions
FOR UPDATE
TO service_role
USING (true);

-- Policy 4: Block all other access (no client access to sensitive OAuth tokens)
CREATE POLICY "Block all other access to sensitive session data"
ON public.user_sessions
FOR ALL
TO public
USING (false);

-- Create a secure view for non-sensitive session status that could be accessed if needed
CREATE OR REPLACE VIEW public.session_status_view AS
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
ALTER VIEW public.session_status_view SET (security_barrier = true);

-- Add comments to document the security model
COMMENT ON TABLE public.user_sessions IS 'Contains sensitive OAuth tokens. Access restricted to service role only via RLS policies.';
COMMENT ON VIEW public.session_status_view IS 'Non-sensitive session status data. OAuth tokens are excluded for security.';

-- Add indexes for better performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON public.user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON public.user_sessions(created_at);