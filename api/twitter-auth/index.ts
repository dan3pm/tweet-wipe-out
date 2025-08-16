-- Parte 1: Cria a tabela para guardar as sessões temporárias
CREATE TABLE public.sessions (
  session_id uuid PRIMARY KEY,
  oauth_token text NOT NULL,
  oauth_token_secret text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Habilita a segurança a nível de linha na nova tabela
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Parte 2: Cria a função que o seu código está tentando chamar
CREATE OR REPLACE FUNCTION extensions.create_user_session(
    p_session_id uuid,
    p_oauth_token text,
    p_oauth_token_secret text,
    p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.sessions (session_id, oauth_token, oauth_token_secret, status)
  VALUES (p_session_id, p_oauth_token, p_oauth_token_secret, p_status);
END;
$$;
