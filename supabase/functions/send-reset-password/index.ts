Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  }

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { email, redirectTo, resendKey } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || resendKey
    const finalRedirectTo = redirectTo || 'https://www.mototrackpro.com.br/reset-password'

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Configuração do servidor incompleta' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'Chave do serviço de email não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Gera o link de recuperação usando a API admin do Supabase
    const generateLinkResponse = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        type: 'recovery',
        email: email,
        options: { redirectTo: finalRedirectTo }
      })
    })

    const linkData = await generateLinkResponse.json()

    if (!generateLinkResponse.ok) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Se este email estiver cadastrado, você receberá as instruções em breve.'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // O Supabase retorna action_link (link completo do supabase.co que redireciona para o app)
    // e também token_hash + hashed_token que podemos usar para montar nosso próprio link
    const recoveryLink = linkData.action_link
    const tokenHash = linkData.hashed_token || linkData.token_hash

    if (!recoveryLink && !tokenHash) {
      return new Response(JSON.stringify({ error: 'Não foi possível gerar o link de recuperação' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Monta o link direto para o app com o token
    // Formato: https://www.mototrackpro.com.br/reset-password#access_token=...&type=recovery
    // Usando token_hash para montar link direto que não passa pelo supabase.co
    let finalLink = recoveryLink

    if (tokenHash) {
      // Link direto para o app — o Supabase JS no cliente processa o hash automaticamente
      finalLink = `https://www.mototrackpro.com.br/reset-password#token_hash=${tokenHash}&type=recovery`
    } else if (recoveryLink) {
      // Fallback: usa o action_link do Supabase (passa pelo supabase.co e redireciona)
      // Garante que o redirect_to aponte para o domínio correto
      try {
        const url = new URL(recoveryLink)
        const redirectParam = url.searchParams.get('redirect_to')
        if (redirectParam && (redirectParam.includes('localhost') || !redirectParam.includes('mototrackpro'))) {
          url.searchParams.set('redirect_to', finalRedirectTo)
          finalLink = url.toString()
        }
      } catch {
        // mantém o link original
      }
    }

    // Envia o email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'MotoTrack Pro <noreply@mototrackpro.com.br>',
        to: [email],
        subject: 'Redefinição de senha - MotoTrack Pro',
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px"><div style="background:linear-gradient(135deg,#f97316,#ef4444);padding:30px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:white;margin:0;font-size:28px">MotoTrack Pro</h1><p style="color:rgba(255,255,255,.9);margin:8px 0 0;font-size:14px">Gestão de Manutenção Off-Road</p></div><div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb"><h2 style="color:#1f2937;margin-top:0">Redefinição de Senha</h2><p style="color:#4b5563;font-size:16px;line-height:1.6">Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:</p><div style="text-align:center;margin:32px 0"><a href="${finalLink}" style="background:linear-gradient(135deg,#f97316,#ef4444);color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block">Redefinir minha senha</a></div><p style="color:#6b7280;font-size:14px">Este link é válido por <strong>1 hora</strong>. Se não solicitou, ignore este email.</p><hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"><p style="color:#9ca3af;font-size:12px;text-align:center">MotoTrack Pro &bull; Gestão completa de manutenção off-road</p></div></div>`
      })
    })

    if (!emailResponse.ok) {
      const emailError = await emailResponse.json()
      console.error('Erro Resend:', JSON.stringify(emailError))
      return new Response(JSON.stringify({ error: `Erro Resend: ${emailError.message || emailResponse.status}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, message: 'Email enviado com sucesso!' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Erro:', error)
    return new Response(JSON.stringify({ error: `Erro interno: ${error}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
