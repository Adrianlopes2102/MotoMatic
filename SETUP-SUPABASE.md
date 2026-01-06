# Setup do Supabase - MotoTrack Pro

## Passo a Passo para Criar o Banco de Dados

### 1. Acesse o Supabase
- Vá para: https://supabase.com
- Faça login no projeto: **juapdhrbhrkaqyhjlwam**

### 2. Execute o Script SQL
1. No menu lateral, clique em **SQL Editor**
2. Clique em **New Query**
3. Copie todo o conteúdo do arquivo `supabase-schema.sql`
4. Cole no editor SQL
5. Clique em **Run** (ou pressione Ctrl+Enter)

### 3. Verificar Criação das Tabelas
Após executar o script, verifique se as seguintes tabelas foram criadas:

- ✓ users
- ✓ motos
- ✓ manutencoes
- ✓ registros_manutencao
- ✓ trilhas
- ✓ liberacoes_mecanico

### 4. Testar o Aplicativo
Após criar as tabelas, você pode:

1. Acessar a página de login do aplicativo
2. Criar uma conta (piloto ou mecânico)
3. Cadastrar sua primeira moto
4. Começar a usar o sistema de manutenção!

## Estrutura das Tabelas

### users
Armazena dados dos usuários (pilotos, mecânicos e admins)
- Controle de trial gratuito de 7 dias
- Status de assinatura
- Tipo de plano

### motos
Cadastro das motos off-road
- Marca, modelo, ano, tipo
- Horímetro (atualizado automaticamente)
- Foto (opcional)

### manutencoes
Template de manutenções para cada moto
- Intervalo por horas ou dias
- Categoria (Motor, Suspensão, etc.)
- Tipo de uso

### registros_manutencao
Histórico de manutenções realizadas
- Data e horas da moto
- Peças trocadas e custo
- Observações e fotos

### trilhas
Registro de uso da moto
- Horas de uso
- Tipo de uso (leve, médio, pesado)
- Local e observações

### liberacoes_mecanico
Controle de acesso de mecânicos às motos dos clientes
- Validade da liberação
- Status ativo/inativo

## Segurança (RLS)
Todas as tabelas possuem Row Level Security ativado:
- Pilotos só veem suas próprias motos
- Mecânicos só acessam motos liberadas
- Ninguém pode apagar histórico de outros
