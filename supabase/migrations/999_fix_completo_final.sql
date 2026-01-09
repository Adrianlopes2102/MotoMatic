-- ============================================
-- FIX COMPLETO E DEFINITIVO - ATUALIZADO
-- Este arquivo contém TODAS as correções necessárias
-- Execute este SQL UMA VEZ e tudo vai funcionar
-- VERSÃO FINAL: 2026-01-09
-- ============================================

-- ============================================
-- PARTE 1: FUNÇÕES RPC
-- ============================================

-- Função para buscar usuário por email
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

GRANT EXECUTE ON FUNCTION buscar_usuario_por_email(TEXT) TO authenticated;

-- Função para buscar usuário por ID
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

GRANT EXECUTE ON FUNCTION buscar_usuario_por_id(UUID) TO authenticated;

-- ============================================
-- PARTE 2: LIMPAR TODAS AS POLÍTICAS ANTIGAS
-- ============================================

-- Motos
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

-- Liberações
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

-- Manutenções
DROP POLICY IF EXISTS "Ver manutenções das próprias motos" ON manutencoes;
DROP POLICY IF EXISTS "Criar manutenções das próprias motas" ON manutencoes;
DROP POLICY IF EXISTS "Atualizar manutenções das próprias motos" ON manutencoes;
DROP POLICY IF EXISTS "Deletar manutenções das próprias motos" ON manutencoes;
DROP POLICY IF EXISTS "manutencoes_piloto_select" ON manutencoes;
DROP POLICY IF EXISTS "manutencoes_mecanico_select" ON manutencoes;
DROP POLICY IF EXISTS "manutencoes_piloto_insert" ON manutencoes;
DROP POLICY IF EXISTS "manutencoes_piloto_update" ON manutencoes;
DROP POLICY IF EXISTS "manutencoes_piloto_delete" ON manutencoes;

-- Registros de Manutenção
DROP POLICY IF EXISTS "Ver registros das próprias motos ou motos liberadas" ON registros_manutencao;
DROP POLICY IF EXISTS "Criar registros de manutenção" ON registros_manutencao;
DROP POLICY IF EXISTS "registros_piloto_select" ON registros_manutencao;
DROP POLICY IF EXISTS "registros_mecanico_select" ON registros_manutencao;
DROP POLICY IF EXISTS "registros_insert" ON registros_manutencao;

-- Trilhas
DROP POLICY IF EXISTS "Ver trilhas das próprias motos" ON trilhas;
DROP POLICY IF EXISTS "Criar trilhas" ON trilhas;
DROP POLICY IF EXISTS "trilhas_piloto_select" ON trilhas;
DROP POLICY IF EXISTS "trilhas_mecanico_select" ON trilhas;
DROP POLICY IF EXISTS "trilhas_piloto_insert" ON trilhas;

-- ============================================
-- PARTE 3: CRIAR POLÍTICAS CORRETAS
-- ============================================

-- ===== MOTOS =====

-- Pilotos veem suas motos
CREATE POLICY "motos_piloto_select"
  ON motos FOR SELECT
  USING (user_id = auth.uid());

-- Mecânicos veem motos liberadas
CREATE POLICY "motos_mecanico_select"
  ON motos FOR SELECT
  USING (
    id IN (
      SELECT moto_id FROM liberacoes_mecanico
      WHERE mecanico_id = auth.uid()
      AND ativo = true
    )
  );

-- Pilotos criam motos
CREATE POLICY "motos_piloto_insert"
  ON motos FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Pilotos atualizam suas motos
CREATE POLICY "motos_piloto_update"
  ON motos FOR UPDATE
  USING (user_id = auth.uid());

-- Mecânicos atualizam motos liberadas
CREATE POLICY "motos_mecanico_update"
  ON motos FOR UPDATE
  USING (
    id IN (
      SELECT moto_id FROM liberacoes_mecanico
      WHERE mecanico_id = auth.uid()
      AND ativo = true
    )
  );

-- Pilotos deletam suas motos
CREATE POLICY "motos_piloto_delete"
  ON motos FOR DELETE
  USING (user_id = auth.uid());

-- ===== LIBERAÇÕES =====

-- Mecânicos veem suas liberações
CREATE POLICY "liberacoes_mecanico_select"
  ON liberacoes_mecanico FOR SELECT
  USING (mecanico_id = auth.uid());

-- Pilotos veem liberações das suas motos
CREATE POLICY "liberacoes_piloto_select"
  ON liberacoes_mecanico FOR SELECT
  USING (
    moto_id IN (
      SELECT id FROM motos WHERE user_id = auth.uid()
    )
  );

-- Pilotos criam liberações
CREATE POLICY "liberacoes_piloto_insert"
  ON liberacoes_mecanico FOR INSERT
  WITH CHECK (
    moto_id IN (
      SELECT id FROM motos WHERE user_id = auth.uid()
    )
  );

-- Pilotos atualizam liberações
CREATE POLICY "liberacoes_piloto_update"
  ON liberacoes_mecanico FOR UPDATE
  USING (
    moto_id IN (
      SELECT id FROM motos WHERE user_id = auth.uid()
    )
  );

-- ===== MANUTENÇÕES =====

-- Pilotos veem manutenções
CREATE POLICY "manutencoes_piloto_select"
  ON manutencoes FOR SELECT
  USING (
    moto_id IN (
      SELECT id FROM motos WHERE user_id = auth.uid()
    )
  );

-- Mecânicos veem manutenções de motos liberadas
CREATE POLICY "manutencoes_mecanico_select"
  ON manutencoes FOR SELECT
  USING (
    moto_id IN (
      SELECT moto_id FROM liberacoes_mecanico
      WHERE mecanico_id = auth.uid()
      AND ativo = true
    )
  );

-- Pilotos criam manutenções
CREATE POLICY "manutencoes_piloto_insert"
  ON manutencoes FOR INSERT
  WITH CHECK (
    moto_id IN (
      SELECT id FROM motos WHERE user_id = auth.uid()
    )
  );

-- Pilotos atualizam manutenções
CREATE POLICY "manutencoes_piloto_update"
  ON manutencoes FOR UPDATE
  USING (
    moto_id IN (
      SELECT id FROM motos WHERE user_id = auth.uid()
    )
  );

-- Pilotos deletam manutenções
CREATE POLICY "manutencoes_piloto_delete"
  ON manutencoes FOR DELETE
  USING (
    moto_id IN (
      SELECT id FROM motos WHERE user_id = auth.uid()
    )
  );

-- ===== REGISTROS DE MANUTENÇÃO =====

-- Pilotos veem registros
CREATE POLICY "registros_piloto_select"
  ON registros_manutencao FOR SELECT
  USING (
    moto_id IN (
      SELECT id FROM motos WHERE user_id = auth.uid()
    )
  );

-- Mecânicos veem registros de motos liberadas
CREATE POLICY "registros_mecanico_select"
  ON registros_manutencao FOR SELECT
  USING (
    moto_id IN (
      SELECT moto_id FROM liberacoes_mecanico
      WHERE mecanico_id = auth.uid()
      AND ativo = true
    )
  );

-- Pilotos e mecânicos criam registros
CREATE POLICY "registros_insert"
  ON registros_manutencao FOR INSERT
  WITH CHECK (
    moto_id IN (
      SELECT id FROM motos WHERE user_id = auth.uid()
    )
    OR
    moto_id IN (
      SELECT moto_id FROM liberacoes_mecanico
      WHERE mecanico_id = auth.uid()
      AND ativo = true
    )
  );

-- ===== TRILHAS =====

-- Pilotos veem suas trilhas
CREATE POLICY "trilhas_piloto_select"
  ON trilhas FOR SELECT
  USING (user_id = auth.uid());

-- Mecânicos veem trilhas de motos liberadas
CREATE POLICY "trilhas_mecanico_select"
  ON trilhas FOR SELECT
  USING (
    moto_id IN (
      SELECT moto_id FROM liberacoes_mecanico
      WHERE mecanico_id = auth.uid()
      AND ativo = true
    )
  );

-- Pilotos criam trilhas
CREATE POLICY "trilhas_piloto_insert"
  ON trilhas FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- FIM - TUDO PRONTO!
-- ============================================
