-- Criar função para buscar usuário por email (contorna RLS)
-- Necessário para permitir que pilotos busquem mecânicos pelo email

CREATE OR REPLACE FUNCTION buscar_usuario_por_email(email_busca TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.name, u.role
  FROM users u
  WHERE LOWER(u.email) = LOWER(email_busca);
END;
$$;

-- Permitir que usuários autenticados usem esta função
GRANT EXECUTE ON FUNCTION buscar_usuario_por_email(TEXT) TO authenticated;
