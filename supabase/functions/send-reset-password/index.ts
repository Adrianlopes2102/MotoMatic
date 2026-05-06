Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  }

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { email, redirectTo } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const finalRedirectTo = redirectTo || 'https://mototrackpro.lasy.dev/reset-password'

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Configuração do servidor incompleta' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY não configurado' }), {
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
        options: {
          redirectTo: finalRedirectTo
        }
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

    const recoveryLink = linkData.action_link

    if (!recoveryLink) {
      return new Response(JSON.stringify({ error: 'Não foi possível gerar o link' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Envia o email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'MotoTrack Pro <onboarding@resend.dev>',
        to: [email],
        subject: 'Redefinição de senha - MotoTrack Pro',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background: linear-gradient(135deg, #f97316, #ef4444); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">MotoTrack Pro</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Gestão de Manutenção Off-Road</p>
            </div>
            <div style="background: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 22px;">Redefinição de Senha</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta no MotoTrack Pro. Clique no botão abaixo para criar uma nova senha:
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${recoveryLink}"
                   style="background: linear-gradient(135deg, #f97316, #ef4444); color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
                  Redefinir minha senha
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
                Este link é válido por <strong>1 hora</strong>.<br>
                Se você não solicitou a redefinição de senha, ignore este email.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                MotoTrack Pro &bull; Gestão completa de manutenção off-road
              </p>
            </div>
          </div>
        `
      })
    })

    if (!emailResponse.ok) {
      const emailError = await emailResponse.json()
      console.error('Erro Resend:', JSON.stringify(emailError))
      return new Response(JSON.stringify({ error: `Erro ao enviar email: ${emailError.message || emailResponse.status}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Email de recuperação enviado com sucesso!'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Erro na Edge Function:', error)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
