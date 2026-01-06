# MotoTrack Pro - Sistema de Gestão de Manutenção Off-Road

Sistema SaaS completo para controle de manutenção de motos de trilha, enduro e motocross.

## 🏍️ Funcionalidades Principais

### Para Pilotos
- **Cadastro de Motos**: Registre todas as suas motos com fotos, marca, modelo e ano
- **Horímetro Inteligente**: Controle automático de horas de uso com ajuste por tipo de trilha
- **Sistema de Manutenção**: Acompanhe todas as manutenções necessárias com alertas visuais
- **Registro de Trilhas**: Documente cada trilha com horas, tipo de uso e observações
- **Histórico Completo**: Veja todo o histórico técnico da sua moto
- **Notificações**: Receba alertas de manutenções próximas ou atrasadas
- **Liberação de Mecânico**: Dê acesso temporário para mecânicos registrarem serviços

### Para Mecânicos
- **Acesso a Motas de Clientes**: Veja apenas motos liberadas pelos donos
- **Registro de Serviços**: Documente manutenções realizadas com peças e custos
- **Histórico Protegido**: Não pode apagar registros (auditoria completa)
- **Perfil Profissional**: Mostre seu trabalho para os clientes

## 💰 Planos de Assinatura

### Free (Trial)
- 7 dias de teste grátis
- Acesso completo a todas as funcionalidades

### Pro Piloto - R$ 29,90/mês
- Motos ilimitadas
- Sistema completo de manutenção
- Notificações automáticas

### Oficina/Mecânico - R$ 49,90/mês
- Tudo do Pro Piloto
- Acesso a motos de clientes
- Registro profissional de serviços

## 🔧 Sistema de Manutenção

### Categorias
Motor, Transmissão, Suspensão, Freios, Elétrica, Chassi

### Status Visuais
- 🟢 Verde: Em dia (0-79%)
- 🟡 Amarelo: Próxima (80-99%)
- 🔴 Vermelho: Atrasada (100%+)

## 🚀 Tecnologias

- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth)
- Vite 6

## 📦 Setup

### 1. Instalar
```bash
npm install
```

### 2. Configurar Supabase
Execute o script `supabase-schema.sql` no SQL Editor do Supabase
(Veja instruções em `SETUP-SUPABASE.md`)

### 3. Rodar
```bash
npm run dev
```

## 🔐 Segurança

Row Level Security ativado em todas as tabelas:
- Pilotos só veem suas motos
- Mecânicos só acessam motos liberadas
- Registros protegidos contra exclusão
