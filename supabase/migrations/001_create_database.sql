-- Migration: Create MotoTrack Pro Database
-- Descrição: Cria todas as tabelas necessárias para o app funcionar
-- Atualizado: Execute este SQL para criar o banco de dados completo

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('piloto', 'mecanico', 'admin')),
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ,
  subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired')),
  subscription_plan TEXT CHECK (subscription_plan IN ('free', 'pro_piloto', 'oficina'))
);

-- Tabela de Motos
CREATE TABLE IF NOT EXISTS motos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  ano INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  foto_url TEXT,
  horimetro INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Manutenções (Templates)
CREATE TABLE IF NOT EXISTS manutencoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moto_id UUID NOT NULL REFERENCES motos(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  nome TEXT NOT NULL,
  intervalo_horas INTEGER,
  intervalo_dias INTEGER,
  tipo_uso TEXT NOT NULL CHECK (tipo_uso IN ('leve', 'medio', 'pesado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Registros de Manutenção
CREATE TABLE IF NOT EXISTS registros_manutencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manutencao_id UUID NOT NULL REFERENCES manutencoes(id) ON DELETE CASCADE,
  moto_id UUID NOT NULL REFERENCES motos(id) ON DELETE CASCADE,
  realizado_por TEXT NOT NULL,
  data DATE NOT NULL,
  horas_moto INTEGER NOT NULL,
  observacoes TEXT,
  pecas_trocadas TEXT,
  custo DECIMAL(10, 2),
  fotos TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Trilhas
CREATE TABLE IF NOT EXISTS trilhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moto_id UUID NOT NULL REFERENCES motos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  horas_uso DECIMAL(5, 2) NOT NULL,
  tipo_uso TEXT NOT NULL CHECK (tipo_uso IN ('leve', 'medio', 'pesado')),
  local TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Liberações de Mecânico
CREATE TABLE IF NOT EXISTS liberacoes_mecanico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moto_id UUID NOT NULL REFERENCES motos(id) ON DELETE CASCADE,
  mecanico_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  liberado_por UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  valido_ate TIMESTAMPTZ,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_motos_user_id ON motos(user_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_moto_id ON manutencoes(moto_id);
CREATE INDEX IF NOT EXISTS idx_registros_manutencao_id ON registros_manutencao(manutencao_id);
CREATE INDEX IF NOT EXISTS idx_registros_moto_id ON registros_manutencao(moto_id);
CREATE INDEX IF NOT EXISTS idx_trilhas_moto_id ON trilhas(moto_id);
CREATE INDEX IF NOT EXISTS idx_trilhas_user_id ON trilhas(user_id);
CREATE INDEX IF NOT EXISTS idx_liberacoes_mecanico_id ON liberacoes_mecanico(mecanico_id);
CREATE INDEX IF NOT EXISTS idx_liberacoes_moto_id ON liberacoes_mecanico(moto_id);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE motos ENABLE ROW LEVEL SECURITY;
ALTER TABLE manutencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE trilhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE liberacoes_mecanico ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança para Users
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Políticas de Segurança para Motos
CREATE POLICY "Pilotos podem ver suas motos"
  ON motos FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM liberacoes_mecanico
      WHERE moto_id = motos.id
      AND mecanico_id = auth.uid()
      AND ativo = true
    )
  );

CREATE POLICY "Pilotos podem criar motos"
  ON motos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Pilotos podem atualizar suas motos"
  ON motos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Pilotos podem deletar suas motos"
  ON motos FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas de Segurança para Manutenções
CREATE POLICY "Ver manutenções das próprias motos"
  ON manutencoes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = manutencoes.moto_id
      AND motos.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM liberacoes_mecanico
      WHERE moto_id = manutencoes.moto_id
      AND mecanico_id = auth.uid()
      AND ativo = true
    )
  );

CREATE POLICY "Criar manutenções das próprias motos"
  ON manutencoes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = manutencoes.moto_id
      AND motos.user_id = auth.uid()
    )
  );

CREATE POLICY "Atualizar manutenções das próprias motos"
  ON manutencoes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = manutencoes.moto_id
      AND motos.user_id = auth.uid()
    )
  );

CREATE POLICY "Deletar manutenções das próprias motos"
  ON manutencoes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = manutencoes.moto_id
      AND motos.user_id = auth.uid()
    )
  );

-- Políticas de Segurança para Registros de Manutenção
CREATE POLICY "Ver registros das próprias motos ou motos liberadas"
  ON registros_manutencao FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = registros_manutencao.moto_id
      AND motos.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM liberacoes_mecanico
      WHERE moto_id = registros_manutencao.moto_id
      AND mecanico_id = auth.uid()
      AND ativo = true
    )
  );

CREATE POLICY "Criar registros de manutenção"
  ON registros_manutencao FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = registros_manutencao.moto_id
      AND motos.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM liberacoes_mecanico
      WHERE moto_id = registros_manutencao.moto_id
      AND mecanico_id = auth.uid()
      AND ativo = true
    )
  );

-- Políticas de Segurança para Trilhas
CREATE POLICY "Ver trilhas das próprias motos"
  ON trilhas FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = trilhas.moto_id
      AND motos.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM liberacoes_mecanico
      WHERE moto_id = trilhas.moto_id
      AND mecanico_id = auth.uid()
      AND ativo = true
    )
  );

CREATE POLICY "Criar trilhas"
  ON trilhas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Políticas de Segurança para Liberações de Mecânico
CREATE POLICY "Ver liberações das próprias motos"
  ON liberacoes_mecanico FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = liberacoes_mecanico.moto_id
      AND motos.user_id = auth.uid()
    )
    OR mecanico_id = auth.uid()
  );

CREATE POLICY "Criar liberações para as próprias motos"
  ON liberacoes_mecanico FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = liberacoes_mecanico.moto_id
      AND motos.user_id = auth.uid()
    )
  );

CREATE POLICY "Atualizar liberações das próprias motos"
  ON liberacoes_mecanico FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = liberacoes_mecanico.moto_id
      AND motos.user_id = auth.uid()
    )
  );
