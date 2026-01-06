-- MotoTrack Pro - Schema Supabase
-- Script corrigido - Clique em "Execute" para criar as tabelas
-- Versão 2.0 - Políticas RLS simplificadas

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('piloto', 'mecanico', 'admin')),
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ,
  subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired')),
  subscription_plan TEXT CHECK (subscription_plan IN ('free', 'pro_piloto', 'oficina'))
);

-- Tabela de motos
CREATE TABLE IF NOT EXISTS motos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  ano INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  foto_url TEXT,
  horimetro DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de manutenções (template)
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

-- Tabela de registros de manutenção
CREATE TABLE IF NOT EXISTS registros_manutencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manutencao_id UUID NOT NULL REFERENCES manutencoes(id) ON DELETE CASCADE,
  moto_id UUID NOT NULL REFERENCES motos(id) ON DELETE CASCADE,
  realizado_por UUID NOT NULL REFERENCES users(id),
  data DATE NOT NULL,
  horas_moto DECIMAL(10, 2) NOT NULL,
  observacoes TEXT,
  pecas_trocadas TEXT,
  custo DECIMAL(10, 2),
  fotos TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de trilhas
CREATE TABLE IF NOT EXISTS trilhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moto_id UUID NOT NULL REFERENCES motos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  horas_uso DECIMAL(10, 2) NOT NULL,
  tipo_uso TEXT NOT NULL CHECK (tipo_uso IN ('leve', 'medio', 'pesado')),
  local TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de liberações para mecânicos
CREATE TABLE IF NOT EXISTS liberacoes_mecanico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moto_id UUID NOT NULL REFERENCES motos(id) ON DELETE CASCADE,
  mecanico_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  liberado_por UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  valido_ate DATE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_motos_user_id ON motos(user_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_moto_id ON manutencoes(moto_id);
CREATE INDEX IF NOT EXISTS idx_registros_manutencao_moto_id ON registros_manutencao(moto_id);
CREATE INDEX IF NOT EXISTS idx_registros_manutencao_manutencao_id ON registros_manutencao(manutencao_id);
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

-- Políticas RLS para users
CREATE POLICY "Users podem ver próprio perfil" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users podem atualizar próprio perfil" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users podem inserir próprio perfil" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas RLS para motos (corrigidas para evitar recursão)
CREATE POLICY IF NOT EXISTS "Pilotos veem suas motos" ON motos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Mecanicos veem motos liberadas" ON motos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM liberacoes_mecanico
      WHERE liberacoes_mecanico.moto_id = motos.id
        AND liberacoes_mecanico.mecanico_id = auth.uid()
        AND liberacoes_mecanico.ativo = true
    )
  );

CREATE POLICY IF NOT EXISTS "Pilotos criam suas motos" ON motos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Pilotos atualizam suas motos" ON motos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Pilotos deletam suas motos" ON motos
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para manutenções (simplificadas)
CREATE POLICY IF NOT EXISTS "Ver manutencoes" ON manutencoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = manutencoes.moto_id
        AND motos.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Criar manutencoes" ON manutencoes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = manutencoes.moto_id
        AND motos.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Atualizar manutencoes" ON manutencoes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = manutencoes.moto_id
        AND motos.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Deletar manutencoes" ON manutencoes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = manutencoes.moto_id
        AND motos.user_id = auth.uid()
    )
  );

-- Políticas RLS para registros_manutencao (simplificadas)
CREATE POLICY IF NOT EXISTS "Ver registros" ON registros_manutencao
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = registros_manutencao.moto_id
        AND motos.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Criar registros" ON registros_manutencao
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = registros_manutencao.moto_id
        AND motos.user_id = auth.uid()
    )
  );

-- Políticas RLS para trilhas (simplificadas)
CREATE POLICY IF NOT EXISTS "Ver trilhas" ON trilhas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Criar trilhas" ON trilhas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Atualizar trilhas" ON trilhas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Deletar trilhas" ON trilhas
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para liberacoes_mecanico (simplificadas)
CREATE POLICY IF NOT EXISTS "Ver liberacoes" ON liberacoes_mecanico
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = liberacoes_mecanico.moto_id
        AND motos.user_id = auth.uid()
    ) OR
    mecanico_id = auth.uid()
  );

CREATE POLICY IF NOT EXISTS "Criar liberacoes" ON liberacoes_mecanico
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = liberacoes_mecanico.moto_id
        AND motos.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Atualizar liberacoes" ON liberacoes_mecanico
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = liberacoes_mecanico.moto_id
        AND motos.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Deletar liberacoes" ON liberacoes_mecanico
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM motos
      WHERE motos.id = liberacoes_mecanico.moto_id
        AND motos.user_id = auth.uid()
    )
  );
