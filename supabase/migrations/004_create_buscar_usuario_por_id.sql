-- Criar função para buscar usuário por ID (contorna RLS)
-- Necessário para carregar dados dos mecânicos liberados

CREATE OR REPLACE FUNCTION buscar_usuario_por_id(user_id UUID)
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
  WHERE u.id = user_id;
END;
$$;

-- Permitir que usuários autenticados usem esta função
GRANT EXECUTE ON FUNCTION buscar_usuario_por_id(UUID) TO authenticated;
