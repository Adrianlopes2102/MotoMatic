# Como Usar o MotoTrack Pro

## 🎬 Primeiros Passos

### 1️⃣ Configurar o Banco de Dados

**IMPORTANTE**: Antes de usar o aplicativo, você precisa criar as tabelas no Supabase!

1. Abra o arquivo `SETUP-SUPABASE.md` e siga as instruções
2. Basicamente: copie e execute o script SQL no Supabase
3. Leva menos de 1 minuto!

### 2️⃣ Criar Sua Conta

1. Abra o aplicativo (ele já está rodando no preview à direita)
2. Clique em "Cadastrar"
3. Preencha:
   - Nome completo
   - Escolha "Piloto" (para começar)
   - E-mail e senha
4. Clique em "Criar Conta Grátis"
5. Pronto! Você tem 7 dias de teste grátis 🎉

### 3️⃣ Cadastrar Sua Primeira Moto

1. Na tela inicial, clique em "Nova Moto"
2. Preencha:
   - Marca (ex: Honda, Yamaha, KTM)
   - Modelo (ex: CRF 250F, YZ 125)
   - Ano
   - Tipo (Trilha, Enduro, Motocross)
   - Horímetro atual em horas
3. Clique em "Cadastrar Moto"

### 4️⃣ Criar Manutenções Padrão

1. Clique na moto que você acabou de criar
2. Na aba "Manutenções", clique em "Criar Manutenções Padrão"
3. O sistema vai criar automaticamente 14 tipos de manutenção:
   - Óleo motor, filtros, válvulas, suspensão, freios, etc.
4. Cada manutenção tem um intervalo (ex: trocar óleo a cada 15h)

### 5️⃣ Registrar Sua Primeira Trilha

1. Na tela da moto, clique em "Registrar Trilha"
2. Preencha:
   - Data da trilha
   - Horas que você usou a moto (ex: 3h)
   - Tipo de uso:
     - **Leve**: Trilha suave (conta como 0.8x das horas)
     - **Médio**: Trilha normal (conta 1x)
     - **Pesado**: Enduro/MX extremo (conta 1.5x das horas)
   - Local (opcional)
   - Observações (opcional)
3. Clique em "Registrar Trilha"
4. O horímetro da moto será atualizado automaticamente! ✨

### 6️⃣ Acompanhar Manutenções

1. Na tela da moto, veja a lista de manutenções
2. Cada uma tem uma cor:
   - 🟢 **Verde**: Está em dia, pode pilotar tranquilo
   - 🟡 **Amarelo**: Está próxima, programe fazer em breve
   - 🔴 **Vermelho**: Está atrasada, faça o quanto antes!
3. Tem uma barra de progresso mostrando quanto falta

### 7️⃣ Registrar Uma Manutenção

1. Clique em uma manutenção (ex: "Troca de Óleo Motor")
2. Clique em "Registrar Manutenção"
3. Preencha:
   - Data que você fez
   - Horas da moto naquele momento
   - Peças que você trocou (ex: Óleo Motul 10W40)
   - Custo (opcional)
   - Observações (ex: "Óleo estava bem preto")
4. Clique em "Registrar Manutenção"
5. O sistema zera o contador daquela manutenção! 🔧

## 🎯 Fluxo Típico de Uso

```
1. Todo fim de semana de trilha:
   → Registrar Trilha (atualiza horímetro)

2. De vez em quando:
   → Checar Dashboard (ver manutenções próximas)

3. Quando algo fica amarelo/vermelho:
   → Fazer a manutenção
   → Registrar no sistema
   → Voltar para o verde! ✅
```

## 💡 Dicas Importantes

### Tipo de Uso da Trilha
- Use "Pesado" para competições e trilhas extremas
- Isso faz o horímetro computar mais horas
- Exemplo: 3h de MX = 4.5h no horímetro (3 x 1.5)
- Sua moto vai pedir manutenção mais cedo (correto!)

### Manutenções Personalizadas
- Você pode criar manutenções customizadas
- Adapte para sua moto específica
- Intervalo por horas OU por dias (ex: trocar fluido de freio a cada 180 dias)

### Período de Teste
- Você tem 7 dias grátis
- Contador aparece no topo do Dashboard
- Depois precisa assinar um plano para continuar

### Mecânico
- Se você é mecânico, crie conta como "Mecânico"
- Seus clientes podem liberar acesso às motos deles
- Você registra os serviços que fez
- Cliente vê seu trabalho documentado

## 🆘 Problemas Comuns

### "Não consigo fazer login"
- Certifique-se de ter executado o script SQL no Supabase
- Veja o arquivo `SETUP-SUPABASE.md`

### "Não aparece nenhuma moto"
- Se você é Piloto: cadastre uma moto
- Se você é Mecânico: peça para um cliente te liberar

### "Trial expirou"
- Após 7 dias, aparece a tela de upgrade
- Escolha um plano para continuar

### "Erro ao registrar trilha"
- Verifique se a data não é futura
- Horas devem ser maior que 0

## 📞 Suporte

Se tiver dúvidas ou problemas:
1. Verifique este guia
2. Veja o `README.md` para detalhes técnicos
3. Veja o `SETUP-SUPABASE.md` para problemas de banco

---

**Boa pilotagem e boas manutenções! 🏍️💨**
