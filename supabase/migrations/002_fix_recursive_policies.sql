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

-- 2. CRIAR políticas EXTREMAMENTE SIMPLES (SEM EXISTS, SEM SUBQUERIES)
CREATE POLICY "motos_select_policy"
  ON motos FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "motos_insert_policy"
  ON motos FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "motos_update_policy"
  ON motos FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "motos_delete_policy"
  ON motos FOR DELETE
  USING (user_id = auth.uid());
