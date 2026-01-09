-- ============================================
-- FIX SEM RECURSÃO - SOLUÇÃO DEFINITIVA
-- Remove TODAS as políticas e cria novas SEM recursão
-- ============================================

-- PARTE 1: REMOVER TODAS AS POLÍTICAS
DROP POLICY IF EXISTS "Pilotos podem ver suas motos" ON motos;
DROP POLICY IF EXISTS "Pilotos podem criar motos" ON motos;
DROP POLICY IF EXISTS "Pilotos podem atualizar suas motos" ON motos;
DROP POLICY IF EXISTS "Pilotos podem deletar suas motos" ON motos;
DROP POLICY IF EXISTS "select_own_motos" ON motos;
DROP POLICY IF EXISTS "insert_own_motos" ON motos;
DROP POLICY IF EXISTS "update_own_motos" ON motos;
DROP POLICY IF EXISTS "delete_own_motos" ON motos;
DROP POLICY IF EXISTS "select_motos_liberadas_mecanico" ON motos;
DROP POLICY IF EXISTS "motos_select_policy" ON motos;
DROP POLICY IF EXISTS "motos_insert_policy" ON motos;
DROP POLICY IF EXISTS "motos_update_policy" ON motos;
DROP POLICY IF EXISTS "motos_delete_policy" ON motos;
DROP POLICY IF EXISTS "motos_select_own" ON motos;
DROP POLICY IF EXISTS "motos_select_liberadas" ON motos;
DROP POLICY IF EXISTS "motos_insert" ON motos;
DROP POLICY IF EXISTS "motos_update" ON motos;
DROP POLICY IF EXISTS "motos_delete" ON motos;
DROP POLICY IF EXISTS "motos_piloto_select" ON motos;
DROP POLICY IF EXISTS "motos_mecanico_select" ON motos;
DROP POLICY IF EXISTS "motos_piloto_insert" ON motos;
DROP POLICY IF EXISTS "motos_piloto_update" ON motos;
DROP POLICY IF EXISTS "motos_mecanico_update" ON motos;
DROP POLICY IF EXISTS "motos_piloto_delete" ON motos;

DROP POLICY IF EXISTS "Ver liberações das próprias motos" ON liberacoes_mecanico;
DROP POLICY IF EXISTS "Criar liberações para as próprias motos" ON liberacoes_mecanico;
DROP POLICY IF EXISTS "Atualizar liberações das próprias motos" ON liberacoes_mecanico;
DROP POLICY IF EXISTS "select_liberacoes_own_motos" ON liberacoes_mecanico;
DROP POLICY IF EXISTS "select_liberacoes_as_mecanico" ON liberacoes_mecanico;
DROP POLICY IF EXISTS "insert_liberacoes" ON liberacoes_mecanico;
DROP POLICY IF EXISTS "update_liberacoes" ON liberacoes_mecanico;
DROP POLICY IF EXISTS "liberacoes_select_as_mecanico" ON liberacoes_mecanico;
DROP POLICY IF EXISTS "liberacoes_select_own_motos" ON liberacoes_mecanico;
DROP POLICY IF EXISTS "liberacoes_insert" ON liberacoes_mecanico;
DROP POLICY IF EXISTS "liberacoes_update" ON liberacoes_mecanico;
DROP POLICY IF EXISTS "liberacoes_mecanico_select" ON liberacoes_mecanico;
DROP POLICY IF EXISTS "liberacoes_piloto_select" ON liberacoes_mecanico;
DROP POLICY IF EXISTS "liberacoes_piloto_insert" ON liberacoes_mecanico;
DROP POLICY IF EXISTS "liberacoes_piloto_update" ON liberacoes_mecanico;

-- PARTE 2: DESABILITAR RLS TEMPORARIAMENTE
ALTER TABLE motos DISABLE ROW LEVEL SECURITY;
ALTER TABLE liberacoes_mecanico DISABLE ROW LEVEL SECURITY;

-- PARTE 3: REABILITAR RLS
ALTER TABLE motos ENABLE ROW LEVEL SECURITY;
ALTER TABLE liberacoes_mecanico ENABLE ROW LEVEL SECURITY;

-- PARTE 4: CRIAR POLÍTICAS SIMPLES PARA MOTOS (SEM EXISTS, SEM SUBQUERY)
CREATE POLICY "motos_owner_all"
  ON motos
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- PARTE 5: CRIAR POLÍTICAS PARA LIBERAÇÕES (SEM RECURSÃO)
CREATE POLICY "liberacoes_mecanico_view"
  ON liberacoes_mecanico FOR SELECT
  USING (mecanico_id = auth.uid());

CREATE POLICY "liberacoes_owner_all"
  ON liberacoes_mecanico
  USING (liberado_por = auth.uid())
  WITH CHECK (liberado_por = auth.uid());

-- PARTE 6: CRIAR FUNÇÃO PARA MECÂNICOS VEREM MOTOS LIBERADAS
CREATE OR REPLACE FUNCTION get_motos_liberadas_mecanico(mecanico_uuid UUID)
RETURNS SETOF motos
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT m.* FROM motos m
  INNER JOIN liberacoes_mecanico lm ON lm.moto_id = m.id
  WHERE lm.mecanico_id = mecanico_uuid
  AND lm.ativo = true;
$$;

GRANT EXECUTE ON FUNCTION get_motos_liberadas_mecanico(UUID) TO authenticated;

-- PARTE 7: CRIAR FUNÇÃO PARA MECÂNICOS ATUALIZAREM MOTOS LIBERADAS
CREATE OR REPLACE FUNCTION update_moto_liberada(
  moto_uuid UUID,
  mecanico_uuid UUID,
  novo_horimetro INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tem_acesso BOOLEAN;
BEGIN
  -- Verificar se mecânico tem acesso
  SELECT EXISTS(
    SELECT 1 FROM liberacoes_mecanico
    WHERE moto_id = moto_uuid
    AND mecanico_id = mecanico_uuid
    AND ativo = true
  ) INTO tem_acesso;

  IF tem_acesso THEN
    UPDATE motos SET horimetro = novo_horimetro WHERE id = moto_uuid;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION update_moto_liberada(UUID, UUID, INTEGER) TO authenticated;
