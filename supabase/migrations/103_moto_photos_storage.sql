-- Migration: Storage bucket para fotos de motos

-- Criar bucket para fotos de motos
INSERT INTO storage.buckets (id, name, public)
VALUES ('moto-photos', 'moto-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage para moto-photos
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de fotos" ON storage.objects;
CREATE POLICY "Usuários autenticados podem fazer upload de fotos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'moto-photos');

DROP POLICY IF EXISTS "Fotos de motos são públicas" ON storage.objects;
CREATE POLICY "Fotos de motos são públicas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'moto-photos');

DROP POLICY IF EXISTS "Usuários podem atualizar suas fotos" ON storage.objects;
CREATE POLICY "Usuários podem atualizar suas fotos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'moto-photos');

DROP POLICY IF EXISTS "Usuários podem deletar suas fotos" ON storage.objects;
CREATE POLICY "Usuários podem deletar suas fotos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'moto-photos');
