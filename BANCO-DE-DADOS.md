# 🗄️ Estrutura do Banco de Dados

## Diagrama de Relacionamentos

```
┌─────────────────┐
│     users       │
│─────────────────│
│ id (PK)         │◄──────────┐
│ email           │           │
│ role            │           │
│ name            │           │
│ trial_ends_at   │           │
│ subscription_   │           │
└─────────────────┘           │
         │                    │
         │                    │
         │ user_id            │ liberado_por
         │                    │
         ▼                    │
┌─────────────────┐           │
│     motos       │           │
│─────────────────│           │
│ id (PK)         │◄──────┐   │
│ user_id (FK)    │       │   │
│ marca           │       │   │
│ modelo          │       │   │
│ ano             │       │   │
│ horimetro       │       │   │
└─────────────────┘       │   │
         │                │   │
         │ moto_id        │   │
         │                │   │
    ┌────┼────┬───────────┤   │
    │    │    │           │   │
    ▼    ▼    ▼           ▼   │
┌────────┐ ┌────────┐ ┌──────────────────┐
│trilhas │ │manut.  │ │liberacoes_       │
│        │ │        │ │mecanico          │
│        │ │        │ │──────────────────│
│        │ │        │ │ mecanico_id (FK) ├─┘
│        │ │        │ │ liberado_por (FK)│
└────────┘ └────────┘ └──────────────────┘
              │
              │ manutencao_id
              │
              ▼
         ┌──────────────────┐
         │registros_        │
         │manutencao        │
         │──────────────────│
         │ realizado_por(FK)│
         └──────────────────┘
```

## Tabelas Detalhadas

### 📋 users (Usuários)

Armazena todos os usuários do sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único (mesmo do Supabase Auth) |
| `email` | TEXT | E-mail do usuário |
| `role` | TEXT | Tipo: `piloto`, `mecanico`, `admin` |
| `name` | TEXT | Nome completo |
| `phone` | TEXT | Telefone (opcional) |
| `trial_ends_at` | TIMESTAMP | Quando termina o trial gratuito |
| `subscription_status` | TEXT | `trial`, `active`, `expired` |
| `subscription_plan` | TEXT | `free`, `pro_piloto`, `oficina` |
| `created_at` | TIMESTAMP | Data de criação |

**Regras RLS:**
- Usuários veem apenas o próprio perfil
- Usuários podem atualizar o próprio perfil

---

### 🏍️ motos (Motos)

Cadastro das motos dos pilotos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único da moto |
| `user_id` | UUID | Dono da moto (FK → users) |
| `marca` | TEXT | Marca (Honda, Yamaha, KTM...) |
| `modelo` | TEXT | Modelo (CRF 250F, YZ 125...) |
| `ano` | INTEGER | Ano de fabricação |
| `tipo` | TEXT | trilha, enduro, motocross, rally |
| `foto_url` | TEXT | URL da foto (opcional) |
| `horimetro` | DECIMAL | Horas totais de uso |
| `created_at` | TIMESTAMP | Data de cadastro |

**Regras RLS:**
- Pilotos veem suas motos
- Mecânicos veem motos liberadas para eles
- Pilotos podem criar/atualizar suas motos

---

### 🔧 manutencoes (Templates de Manutenção)

Define quais manutenções existem para cada moto.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único |
| `moto_id` | UUID | Moto (FK → motos) |
| `categoria` | TEXT | Motor, Suspensão, Freios... |
| `nome` | TEXT | Ex: "Troca de Óleo Motor" |
| `intervalo_horas` | INTEGER | A cada X horas (opcional) |
| `intervalo_dias` | INTEGER | A cada X dias (opcional) |
| `tipo_uso` | TEXT | leve, medio, pesado |
| `created_at` | TIMESTAMP | Data de criação |

**Regras RLS:**
- Donos da moto podem ver/criar/editar
- Mecânicos liberados podem ver

---

### 📝 registros_manutencao (Histórico de Manutenções)

Registra cada vez que uma manutenção foi feita.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único |
| `manutencao_id` | UUID | Qual manutenção (FK → manutencoes) |
| `moto_id` | UUID | Moto (FK → motos) |
| `realizado_por` | UUID | Quem fez (FK → users) |
| `data` | DATE | Quando foi feito |
| `horas_moto` | DECIMAL | Horímetro naquele momento |
| `observacoes` | TEXT | Notas (opcional) |
| `pecas_trocadas` | TEXT | Peças usadas (opcional) |
| `custo` | DECIMAL | Valor gasto (opcional) |
| `fotos` | TEXT[] | URLs de fotos (opcional) |
| `created_at` | TIMESTAMP | Data de criação do registro |

**Regras RLS:**
- Donos da moto podem ver/criar
- Mecânicos liberados podem ver/criar
- Ninguém pode deletar (auditoria)

---

### 🗺️ trilhas (Registro de Uso)

Registra cada trilha/uso da moto.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único |
| `moto_id` | UUID | Moto (FK → motos) |
| `user_id` | UUID | Quem pilotou (FK → users) |
| `data` | DATE | Data da trilha |
| `horas_uso` | DECIMAL | Horas que pilotou |
| `tipo_uso` | TEXT | leve, medio, pesado |
| `local` | TEXT | Onde foi (opcional) |
| `observacoes` | TEXT | Notas (opcional) |
| `created_at` | TIMESTAMP | Data de criação |

**Cálculo Automático:**
```javascript
horas_computadas = horas_uso * multiplicador
// leve: x0.8
// medio: x1.0
// pesado: x1.5

horimetro_novo = horimetro_atual + horas_computadas
```

**Regras RLS:**
- Donos podem criar/ver/editar suas trilhas
- Mecânicos podem ver (histórico)

---

### 🔓 liberacoes_mecanico (Acesso de Mecânicos)

Controla quais mecânicos podem acessar quais motos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único |
| `moto_id` | UUID | Moto liberada (FK → motos) |
| `mecanico_id` | UUID | Mecânico (FK → users) |
| `liberado_por` | UUID | Dono que liberou (FK → users) |
| `valido_ate` | DATE | Data de expiração (opcional) |
| `ativo` | BOOLEAN | Se ainda está ativo |
| `created_at` | TIMESTAMP | Data da liberação |

**Regras RLS:**
- Donos podem criar/ver/editar suas liberações
- Mecânicos podem ver suas próprias liberações

---

## 🔐 Segurança (Row Level Security)

Todas as tabelas possuem RLS ativado:

### Pilotos
✅ Veem suas motos
✅ Criam/editam suas motos
✅ Registram trilhas
✅ Registram manutenções
✅ Liberam mecânicos
❌ Não veem motos de outros

### Mecânicos
✅ Veem motos liberadas
✅ Registram manutenções
✅ Veem histórico completo
❌ Não editam dados da moto
❌ Não deletam registros

### Admins
✅ Acesso total

---

## 📊 Índices (Performance)

Criados para consultas rápidas:

```sql
idx_motos_user_id                    → Buscar motos por usuário
idx_manutencoes_moto_id              → Buscar manutenções por moto
idx_registros_manutencao_moto_id     → Histórico por moto
idx_registros_manutencao_manutencao_id → Histórico por tipo
idx_trilhas_moto_id                  → Trilhas por moto
idx_trilhas_user_id                  → Trilhas por usuário
idx_liberacoes_mecanico_id           → Liberações por mecânico
idx_liberacoes_moto_id               → Liberações por moto
```

---

## 🔄 Fluxos de Dados

### Registro de Trilha
```
1. User registra trilha
2. System calcula: horas_computadas = horas * multiplicador
3. System atualiza: horimetro = horimetro + horas_computadas
4. System salva registro na tabela trilhas
```

### Registro de Manutenção
```
1. User/Mecânico registra manutenção
2. System salva em registros_manutencao
3. System marca: realizado_por = user_id
4. System "zera" contador (próximo intervalo começa)
```

### Status de Manutenção
```
1. System busca último registro da manutenção
2. Calcula: horas_desde_ultima = horimetro_atual - horas_ultimo_registro
3. Calcula: porcentagem = (horas_desde_ultima / intervalo) * 100
4. Define cor:
   - Verde: 0-79%
   - Amarelo: 80-99%
   - Vermelho: 100%+
```

---

## 🚀 Queries Comuns

### Buscar motos do usuário
```sql
SELECT * FROM motos WHERE user_id = 'xxx'
```

### Manutenções de uma moto com status
```sql
SELECT
  m.*,
  (SELECT rm.horas_moto
   FROM registros_manutencao rm
   WHERE rm.manutencao_id = m.id
   ORDER BY rm.data DESC
   LIMIT 1) as ultima_manutencao
FROM manutencoes m
WHERE m.moto_id = 'yyy'
```

### Trilhas recentes
```sql
SELECT * FROM trilhas
WHERE moto_id = 'zzz'
ORDER BY data DESC
LIMIT 10
```

---

**Banco robusto e seguro! 🔒💪**
