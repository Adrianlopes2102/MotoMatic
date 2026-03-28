-- Adicionar campos de assinatura na tabela users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_status TEXT;
