import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const mercadoPagoToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!

    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = await req.json()
    console.log('Webhook recebido:', JSON.stringify(body, null, 2))

    // Mercado Pago envia diferentes tipos de notificação
    if (body.type === 'payment') {
      const paymentId = body.data?.id

      if (!paymentId) {
        return new Response(JSON.stringify({ error: 'Payment ID not found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Buscar detalhes do pagamento no Mercado Pago
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mercadoPagoToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!mpResponse.ok) {
        throw new Error('Erro ao buscar pagamento no Mercado Pago')
      }

      const paymentData = await mpResponse.json()
      console.log('Dados do pagamento:', JSON.stringify(paymentData, null, 2))

      // Atualizar banco de dados baseado no status
      if (paymentData.status === 'approved') {
        const userEmail = paymentData.payer?.email

        if (!userEmail) {
          console.error('Email do pagador não encontrado')
          return new Response(JSON.stringify({ error: 'Email not found' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Determinar o plano baseado no valor
        let subscriptionPlan = 'free'
        const amount = paymentData.transaction_amount

        if (amount >= 39.90) {
          subscriptionPlan = 'oficina' // Plano Mecânico
        } else if (amount >= 19.90) {
          subscriptionPlan = 'pro_piloto' // Plano Piloto
        }

        // Atualizar usuário no banco
        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_status: 'active',
            subscription_plan: subscriptionPlan,
            trial_ends_at: null, // Remove trial
          })
          .eq('email', userEmail)

        if (updateError) {
          console.error('Erro ao atualizar usuário:', updateError)
          throw updateError
        }

        console.log(`✅ Assinatura ativada para ${userEmail} - Plano: ${subscriptionPlan}`)
      }
    } else if (body.type === 'subscription_preapproval' || body.action === 'payment.created') {
      // Webhook de assinatura recorrente
      const preapprovalId = body.data?.id

      if (!preapprovalId) {
        return new Response(JSON.stringify({ ok: true, message: 'No action needed' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Buscar detalhes da assinatura
      const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
        headers: {
          'Authorization': `Bearer ${mercadoPagoToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!mpResponse.ok) {
        throw new Error('Erro ao buscar assinatura no Mercado Pago')
      }

      const subscriptionData = await mpResponse.json()
      console.log('Dados da assinatura:', JSON.stringify(subscriptionData, null, 2))

      // Atualizar banco baseado no status
      if (subscriptionData.status === 'authorized') {
        const userEmail = subscriptionData.payer_email

        // Determinar plano baseado no preapproval_plan_id ou auto_recurring.transaction_amount
        let subscriptionPlan = 'pro_piloto'
        const planId = subscriptionData.preapproval_plan_id
        const amount = subscriptionData.auto_recurring?.transaction_amount || 0

        if (planId === 'ec3c25dcb840450da01df6329e536804' || amount >= 39.90) {
          subscriptionPlan = 'oficina'
        } else if (planId === '63f30d0416b84943924a7914a288e6bb' || amount >= 19.90) {
          subscriptionPlan = 'pro_piloto'
        }

        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_status: 'active',
            subscription_plan: subscriptionPlan,
            trial_ends_at: null,
          })
          .eq('email', userEmail)

        if (updateError) {
          console.error('Erro ao atualizar usuário:', updateError)
          throw updateError
        }

        console.log(`✅ Assinatura ativada para ${userEmail} - Plano: ${subscriptionPlan}`)
      } else if (subscriptionData.status === 'cancelled') {
        const userEmail = subscriptionData.payer_email

        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_status: 'expired',
          })
          .eq('email', userEmail)

        if (updateError) {
          console.error('Erro ao atualizar usuário:', updateError)
          throw updateError
        }

        console.log(`❌ Assinatura cancelada para ${userEmail}`)
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro no webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
