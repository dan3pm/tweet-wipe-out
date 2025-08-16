-- Create table for user sessions and OAuth tokens
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  oauth_token TEXT,
  oauth_token_secret TEXT,
  access_token TEXT,
  access_token_secret TEXT,
  user_id TEXT,
  username TEXT,
  profile_image_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'authenticated', 'processing', 'completed', 'error')),
  tweets_processed INTEGER DEFAULT 0,
  total_tweets INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (but make it accessible for now since we're not using user auth)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (since we're not using Supabase auth)
CREATE POLICY "Allow all operations on user_sessions"
ON public.user_sessions
FOR ALL
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();