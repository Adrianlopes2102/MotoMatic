-- Adicionar política de INSERT para users (faltava!)
-- Sem essa política, novos usuários não conseguem criar seu perfil
DROP POLICY IF EXISTS "Usuários podem inserir seu próprio perfil" ON public.users;

CREATE POLICY "Usuários podem inserir seu próprio perfil"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);
