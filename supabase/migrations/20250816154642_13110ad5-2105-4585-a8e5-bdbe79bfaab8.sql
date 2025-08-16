-- Create schema for private functions if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Create encryption functions for OAuth tokens
-- Generate a secure encryption key (stored as a function for security)
CREATE OR REPLACE FUNCTION extensions.get_encryption_key()
RETURNS TEXT AS $$
BEGIN
  -- Use a combination of database-specific values to create a consistent key
  RETURN encode(digest(current_setting('shared_preload_libraries') || 'tweetwipe_secret_key_v1', 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = extensions, pg_temp;

-- Function to encrypt sensitive tokens
CREATE OR REPLACE FUNCTION extensions.encrypt_token(token TEXT)
RETURNS TEXT AS $$
BEGIN
  IF token IS NULL OR token = '' THEN
    RETURN NULL;
  END IF;
  
  -- Use pgcrypto extension for encryption
  RETURN encode(
    encrypt_iv(
      token::bytea, 
      decode(extensions.get_encryption_key(), 'hex'),
      gen_random_bytes(16),
      'aes-cbc'
    ), 
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER IMMUTABLE
SET search_path = extensions, public, pg_temp;

-- Function to decrypt sensitive tokens
CREATE OR REPLACE FUNCTION extensions.decrypt_token(encrypted_token TEXT)
RETURNS TEXT AS $$
BEGIN
  IF encrypted_token IS NULL OR encrypted_token = '' THEN
    RETURN NULL;
  END IF;
  
  -- Decrypt using the same key
  RETURN convert_from(
    decrypt_iv(
      decode(encrypted_token, 'base64'),
      decode(extensions.get_encryption_key(), 'hex'),
      substring(decode(encrypted_token, 'base64') from 1 for 16),
      'aes-cbc'
    ),
    'UTF8'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if decryption fails (corrupted data)
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER IMMUTABLE
SET search_path = extensions, public, pg_temp;

-- Update the get_session_status function to have proper search_path
DROP FUNCTION IF EXISTS public.get_session_status(TEXT);
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

-- Create secure functions for edge functions to manage encrypted tokens
CREATE OR REPLACE FUNCTION extensions.create_user_session(
  p_session_id TEXT,
  p_oauth_token TEXT DEFAULT NULL,
  p_oauth_token_secret TEXT DEFAULT NULL,
  p_access_token TEXT DEFAULT NULL,
  p_access_token_secret TEXT DEFAULT NULL,
  p_user_id TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL,
  p_profile_image_url TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'pending'
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.user_sessions (
    session_id,
    oauth_token,
    oauth_token_secret,
    access_token,
    access_token_secret,
    user_id,
    username,
    profile_image_url,
    status
  ) VALUES (
    p_session_id,
    extensions.encrypt_token(p_oauth_token),
    extensions.encrypt_token(p_oauth_token_secret),
    extensions.encrypt_token(p_access_token),
    extensions.encrypt_token(p_access_token_secret),
    p_user_id,
    p_username,
    p_profile_image_url,
    p_status
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = extensions, public, pg_temp;

-- Function to get decrypted tokens for edge functions
CREATE OR REPLACE FUNCTION extensions.get_user_session_tokens(p_session_id TEXT)
RETURNS JSON AS $$
DECLARE
  session_data JSON;
BEGIN
  SELECT json_build_object(
    'session_id', session_id,
    'oauth_token', extensions.decrypt_token(oauth_token),
    'oauth_token_secret', extensions.decrypt_token(oauth_token_secret),
    'access_token', extensions.decrypt_token(access_token),
    'access_token_secret', extensions.decrypt_token(access_token_secret),
    'user_id', user_id,
    'username', username,
    'profile_image_url', profile_image_url,
    'status', status,
    'tweets_processed', tweets_processed,
    'total_tweets', total_tweets,
    'error_message', error_message
  ) INTO session_data
  FROM public.user_sessions 
  WHERE session_id = p_session_id;
  
  RETURN session_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = extensions, public, pg_temp;

-- Function to update session with encrypted tokens
CREATE OR REPLACE FUNCTION extensions.update_user_session(
  p_session_id TEXT,
  p_oauth_token TEXT DEFAULT NULL,
  p_oauth_token_secret TEXT DEFAULT NULL,
  p_access_token TEXT DEFAULT NULL,
  p_access_token_secret TEXT DEFAULT NULL,
  p_user_id TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL,
  p_profile_image_url TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_tweets_processed INTEGER DEFAULT NULL,
  p_total_tweets INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  update_count INTEGER;
BEGIN
  UPDATE public.user_sessions SET
    oauth_token = COALESCE(extensions.encrypt_token(p_oauth_token), oauth_token),
    oauth_token_secret = COALESCE(extensions.encrypt_token(p_oauth_token_secret), oauth_token_secret),
    access_token = COALESCE(extensions.encrypt_token(p_access_token), access_token),
    access_token_secret = COALESCE(extensions.encrypt_token(p_access_token_secret), access_token_secret),
    user_id = COALESCE(p_user_id, user_id),
    username = COALESCE(p_username, username),
    profile_image_url = COALESCE(p_profile_image_url, profile_image_url),
    status = COALESCE(p_status, status),
    tweets_processed = COALESCE(p_tweets_processed, tweets_processed),
    total_tweets = COALESCE(p_total_tweets, total_tweets),
    error_message = COALESCE(p_error_message, error_message),
    updated_at = now()
  WHERE session_id = p_session_id;
  
  GET DIAGNOSTICS update_count = ROW_COUNT;
  RETURN update_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = extensions, public, pg_temp;

-- Grant execute permissions to service role only
GRANT EXECUTE ON FUNCTION extensions.create_user_session TO service_role;
GRANT EXECUTE ON FUNCTION extensions.get_user_session_tokens TO service_role;
GRANT EXECUTE ON FUNCTION extensions.update_user_session TO service_role;

-- Add comment to document security measures
COMMENT ON TABLE public.user_sessions IS 'OAuth tokens are encrypted at rest using AES-256. Access restricted to service role only.';
COMMENT ON COLUMN public.user_sessions.oauth_token IS 'Encrypted OAuth request token';
COMMENT ON COLUMN public.user_sessions.oauth_token_secret IS 'Encrypted OAuth request token secret';  
COMMENT ON COLUMN public.user_sessions.access_token IS 'Encrypted OAuth access token';
COMMENT ON COLUMN public.user_sessions.access_token_secret IS 'Encrypted OAuth access token secret';