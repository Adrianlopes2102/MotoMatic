# 🔔 Configuração do Webhook Mercado Pago

## URL do Webhook

Sua Edge Function está deployada em:
```
https://juapdhrbhrkaqyhjlwam.supabase.co/functions/v1/mercadopago-webhook
```

## Como Configurar no Mercado Pago

1. **Acesse o Painel do Mercado Pago**
   - Entre em: https://www.mercadopago.com.br/developers/panel
   - Faça login com sua conta

2. **Configure as Notificações (IPN)**
   - Vá em **"Suas integrações"** → **"Configurações"**
   - Role até a seção **"Notificações"**
   - Clique em **"Configurar notificações"**

3. **Adicione a URL do Webhook**
   - **URL de notificação**: `https://juapdhrbhrkaqyhjlwam.supabase.co/functions/v1/mercadopago-webhook`
   - **Eventos a notificar**:
     - ✅ Pagamentos
     - ✅ Assinaturas (Preapproval)
   - Clique em **"Salvar"**

4. **Teste o Webhook**
   - O Mercado Pago oferece uma opção de teste
   - Clique em **"Enviar teste"** para verificar se está funcionando

## O que o Webhook Faz Automaticamente

Quando um usuário assina um plano:

1. ✅ Mercado Pago processa o pagamento
2. ✅ Envia notificação para o webhook
3. ✅ Webhook busca dados do pagamento via API
4. ✅ Atualiza o banco de dados:
   - `subscription_status` → `'active'`
   - `subscription_plan` → `'pro_piloto'` ou `'oficina'`
   - Remove `trial_ends_at`
5. ✅ Usuário ganha acesso imediatamente

## Testes com Cartão de Teste

Use estes dados para testar pagamentos:

**Cartão Aprovado:**
- Número: `5031 4332 1540 6351`
- Data: Qualquer data futura
- CVV: Qualquer 3 dígitos
- Titular: Qualquer nome

**Cartão Recusado:**
- Número: `5031 7557 3453 0604`

## Logs e Monitoramento

Você pode ver os logs do webhook em:
- **Supabase Dashboard**: https://supabase.com/dashboard/project/juapdhrbhrkaqyhjlwam/functions/mercadopago-webhook
- Clique em **"Logs"** para ver todas as requisições

## Troubleshooting

**Webhook não está sendo chamado:**
- Verifique se a URL está correta no painel do Mercado Pago
- Certifique-se de que os eventos estão selecionados
- Verifique os logs no Supabase

**Pagamento não atualiza o usuário:**
- Verifique os logs da Edge Function
- Confirme que o email do pagador corresponde ao email cadastrado
- Verifique se o `MERCADO_PAGO_ACCESS_TOKEN` está configurado

**Como verificar se está funcionando:**
1. Faça um pagamento de teste
2. Vá no dashboard do Mercado Pago → Notificações
3. Deve aparecer a tentativa de envio do webhook
4. Status 200 = sucesso ✅
5. Qualquer outro código = erro ❌
