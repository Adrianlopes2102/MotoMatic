import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Autentica o usuário pelo token JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const mercadoPagoToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!

    // Verifica quem é o usuário autenticado
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json()
    const { payment_id, collection_id, status: redirectStatus, preapproval_id } = body

    // Busca o perfil do usuário para pegar o pending_plan
    const { data: profile } = await supabase
      .from('users')
      .select('pending_plan, role, subscription_status, last_payment_id')
      .eq('id', user.id)
      .single()

    // Se já está ativo com o mesmo payment, retorna sucesso direto
    const incomingPaymentId = payment_id || collection_id
    if (
      profile?.subscription_status === 'active' &&
      profile?.last_payment_id === incomingPaymentId
    ) {
      return new Response(JSON.stringify({ ok: true, already_active: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let subscriptionPlan = profile?.pending_plan
      || (profile?.role === 'mecanico' ? 'oficina' : 'pro_piloto')
    let verified = false
    let finalPaymentId = incomingPaymentId

    // --- Caso 1: pagamento avulso (cartão, pix, boleto) ---
    if (incomingPaymentId && (redirectStatus === 'approved' || redirectStatus === 'authorized')) {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${incomingPaymentId}`, {
        headers: { 'Authorization': `Bearer ${mercadoPagoToken}` }
      })
      if (mpRes.ok) {
        const mpData = await mpRes.json()
        console.log('Verificação de pagamento:', JSON.stringify({ id: mpData.id, status: mpData.status, amount: mpData.transaction_amount }))
        if (mpData.status === 'approved') {
          verified = true
          if (mpData.transaction_amount >= 39.90) subscriptionPlan = 'oficina'
          else if (mpData.transaction_amount >= 19.90) subscriptionPlan = 'pro_piloto'
        }
      }
    }

    // --- Caso 2: assinatura recorrente (preapproval) ---
    // O MP redireciona com preapproval_id ou o payment_id pode ser de uma preapproval
    if (!verified && (preapproval_id || (incomingPaymentId && redirectStatus === 'authorized'))) {
      const lookupId = preapproval_id || incomingPaymentId
      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${lookupId}`, {
        headers: { 'Authorization': `Bearer ${mercadoPagoToken}` }
      })
      if (mpRes.ok) {
        const mpData = await mpRes.json()
        console.log('Verificação de assinatura:', JSON.stringify({ id: mpData.id, status: mpData.status, plan: mpData.preapproval_plan_id }))
        if (mpData.status === 'authorized' || mpData.status === 'active') {
          verified = true
          finalPaymentId = mpData.id
          const planId = mpData.preapproval_plan_id
          const amount = mpData.auto_recurring?.transaction_amount || 0
          if (planId === 'ec3c25dcb840450da01df6329e536804' || amount >= 39.90) {
            subscriptionPlan = 'oficina'
          } else if (planId === '63f30d0416b84943924a7914a288e6bb' || amount >= 19.90) {
            subscriptionPlan = 'pro_piloto'
          }
        }
      }
    }

    // --- Caso 3: busca assinaturas ativas do usuário pelo email (fallback robusto) ---
    if (!verified) {
      // Busca todas assinaturas deste usuário no MP pelo email
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single()

      if (userProfile?.email) {
        const mpRes = await fetch(
          `https://api.mercadopago.com/preapproval/search?payer_email=${encodeURIComponent(userProfile.email)}&status=authorized&limit=5`,
          { headers: { 'Authorization': `Bearer ${mercadoPagoToken}` } }
        )
        if (mpRes.ok) {
          const mpData = await mpRes.json()
          const activeSubscription = mpData.results?.find((s: any) =>
            s.status === 'authorized' || s.status === 'active'
          )
          if (activeSubscription) {
            verified = true
            finalPaymentId = activeSubscription.id
            const planId = activeSubscription.preapproval_plan_id
            const amount = activeSubscription.auto_recurring?.transaction_amount || 0
            if (planId === 'ec3c25dcb840450da01df6329e536804' || amount >= 39.90) {
              subscriptionPlan = 'oficina'
            } else if (planId === '63f30d0416b84943924a7914a288e6bb' || amount >= 19.90) {
              subscriptionPlan = 'pro_piloto'
            }
            console.log('Assinatura encontrada por email:', activeSubscription.id)
          }
        }
      }
    }

    if (!verified) {
      console.warn('Pagamento não verificado para usuário:', user.id, { payment_id, redirectStatus })
      return new Response(JSON.stringify({ error: 'Payment not verified', verified: false }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Ativa a assinatura no banco
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 1)

    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_plan: subscriptionPlan,
        subscription_expires_at: expiresAt.toISOString(),
        last_payment_id: finalPaymentId?.toString(),
        last_payment_status: 'approved',
        trial_ends_at: null,
        pending_plan: null,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Erro ao ativar assinatura:', updateError)
      throw updateError
    }

    console.log(`✅ Assinatura ativada via verify-payment: user=${user.id}, plan=${subscriptionPlan}`)

    return new Response(JSON.stringify({ ok: true, plan: subscriptionPlan }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro em verify-payment:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
