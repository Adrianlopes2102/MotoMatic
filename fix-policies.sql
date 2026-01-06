-- Script para corrigir políticas RLS
-- Execute este script para resolver o erro de recursão infinita

-- Remove todas as políticas antigas da tabela motos
DROP POLICY IF EXISTS "Pilotos veem suas motos" ON motos;
DROP POLICY IF EXISTS "Mecanicos veem motos liberadas" ON motos;
DROP POLICY IF EXISTS "Pilotos criam suas motos" ON motos;
DROP POLICY IF EXISTS "Pilotos atualizam suas motos" ON motos;
DROP POLICY IF EXISTS "Pilotos deletam suas motos" ON motos;

-- Cria novas políticas simples (sem recursão)
CREATE POLICY "select_motos" ON motos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_motos" ON motos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_motos" ON motos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "delete_motos" ON motos
  FOR DELETE USING (auth.uid() = user_id);
