-- Setup: Criar função exec_sql para executar migrations
-- Esta função permite executar comandos SQL dinamicamente

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
  RETURN 'Success';
END;
$$;
