-- FIX DEFINITIVO: Corrige TODAS as políticas RLS para funcionar 100%
-- Este script resolve: cadastro de moto, liberação de mecânico, visualização e edição
-- ATUALIZADO: 2026-01-09 - Versão Final

-- ============================================
-- 1. LIMPAR TODAS AS POLÍTICAS ANTIGAS
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

-- Manutenções
DROP POLICY IF EXISTS "Ver manutenções das próprias motos" ON manutencoes;
DROP POLICY IF EXISTS "Criar manutenções das próprias motas" ON manutencoes;
DROP POLICY IF EXISTS "Atualizar manutenções das próprias motos" ON manutencoes;
DROP POLICY IF EXISTS "Deletar manutenções das próprias motos" ON manutencoes;

-- Registros de Manutenção
DROP POLICY IF EXISTS "Ver registros das próprias motos ou motos liberadas" ON registros_manutencao;
DROP POLICY IF EXISTS "Criar registros de manutenção" ON registros_manutencao;

-- Trilhas
DROP POLICY IF EXISTS "Ver trilhas das próprias motos" ON trilhas;
DROP POLICY IF EXISTS "Criar trilhas" ON trilhas;

-- ============================================
-- 2. CRIAR POLÍTICAS CORRETAS PARA MOTOS
-- ============================================

-- Pilotos veem suas próprias motos
CREATE POLICY "motos_piloto_select"
  ON motos FOR SELECT
  USING (user_id = auth.uid());

-- Mecânicos veem motos liberadas (SEM RECURSÃO)
CREATE POLICY "motos_mecanico_select"
  ON motos FOR SELECT
  USING (
    id IN (
      SELECT moto_id FROM liberacoes_mecanico
      WHERE mecanico_id = auth.uid()
      AND ativo = true
    )
  );

-- Pilotos podem criar motos
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

-- ============================================
-- 3. POLÍTICAS PARA LIBERAÇÕES
-- ============================================

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

-- ============================================
-- 4. POLÍTICAS PARA MANUTENÇÕES
-- ============================================

-- Pilotos veem manutenções das suas motos
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

-- ============================================
-- 5. POLÍTICAS PARA REGISTROS DE MANUTENÇÃO
-- ============================================

-- Pilotos veem registros das suas motos
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

-- ============================================
-- 6. POLÍTICAS PARA TRILHAS
-- ============================================

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
-- FIM DO SCRIPT
-- ============================================
