-- Fix: Remove recursão infinita nas políticas RLS
-- SOLUÇÃO DEFINITIVA: Políticas simples sem consultas aninhadas

-- 1. REMOVER TODAS as políticas da tabela motos
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

-- 2. CRIAR políticas EXTREMAMENTE SIMPLES (SEM EXISTS, SEM SUBQUERIES)
CREATE POLICY "motos_select_own"
  ON motos FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "motos_select_liberadas"
  ON motos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM liberacoes_mecanico lm
      WHERE lm.moto_id = motos.id
      AND lm.mecanico_id = auth.uid()
      AND lm.ativo = true
    )
  );

CREATE POLICY "motos_insert"
  ON motos FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "motos_update"
  ON motos FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "motos_delete"
  ON motos FOR DELETE
  USING (user_id = auth.uid());

-- 3. Garantir que mecânicos possam ver suas liberações
DROP POLICY IF EXISTS "select_liberacoes_own_motos" ON liberacoes_mecanico;
DROP POLICY IF EXISTS "select_liberacoes_as_mecanico" ON liberacoes_mecanico;
DROP POLICY IF EXISTS "insert_liberacoes" ON liberacoes_mecanico;
DROP POLICY IF EXISTS "update_liberacoes" ON liberacoes_mecanico;

CREATE POLICY "liberacoes_select_as_mecanico"
  ON liberacoes_mecanico FOR SELECT
  USING (mecanico_id = auth.uid());

CREATE POLICY "liberacoes_select_own_motos"
  ON liberacoes_mecanico FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM motos m
      WHERE m.id = liberacoes_mecanico.moto_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "liberacoes_insert"
  ON liberacoes_mecanico FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM motos m
      WHERE m.id = liberacoes_mecanico.moto_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "liberacoes_update"
  ON liberacoes_mecanico FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM motos m
      WHERE m.id = liberacoes_mecanico.moto_id
      AND m.user_id = auth.uid()
    )
  );
