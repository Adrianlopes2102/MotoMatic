import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string
  role: 'piloto' | 'mecanico' | 'admin'
  name: string
  phone?: string
  trial_ends_at?: string
  subscription_status: 'trial' | 'active' | 'expired'
  subscription_plan?: 'free' | 'pro_piloto' | 'oficina'
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string, role: 'piloto' | 'mecanico') => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  isSubscriptionActive: () => boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Timeout de segurança: se em 10s o loading não terminar, força false
    const safetyTimeout = setTimeout(() => {
      setLoading(false)
    }, 10000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        clearTimeout(safetyTimeout)
        setLoading(false)
      }
    }).catch(() => {
      clearTimeout(safetyTimeout)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // Se o perfil não existe, cria um perfil padrão
        if (error.code === 'PGRST116') {
          const { data: authUser } = await supabase.auth.getUser()
          if (authUser.user) {
            const trialEndsAt = new Date()
            trialEndsAt.setDate(trialEndsAt.getDate() + 7)

            const { data: newProfile, error: insertError } = await supabase
              .from('users')
              .insert({
                id: userId,
                email: authUser.user.email!,
                name: authUser.user.email?.split('@')[0] || 'Usuário',
                role: 'piloto',
                trial_ends_at: trialEndsAt.toISOString(),
                subscription_status: 'trial',
                subscription_plan: 'free',
              })
              .select()
              .single()

            if (insertError) {
              console.error('Erro ao criar perfil:', insertError)
              // Mesmo com erro, libera o loading para não travar
              setLoading(false)
              return
            }
            setProfile(newProfile)
            return
          }
        }
        // Qualquer outro erro: loga e libera o loading
        console.error('Erro ao carregar perfil:', error)
        setLoading(false)
        return
      }
      setProfile(data)
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, name: string, role: 'piloto' | 'mecanico') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error

    if (data.user) {
      const trialEndsAt = new Date()
      trialEndsAt.setDate(trialEndsAt.getDate() + 7)

      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        email,
        name,
        role,
        trial_ends_at: trialEndsAt.toISOString(),
        subscription_status: 'trial',
        subscription_plan: 'free',
      })

      if (profileError) throw profileError
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const resetPassword = async (email: string) => {
    const redirectTo = 'https://mototrackpro.lasy.dev/reset-password'
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    const resendApiKey = import.meta.env.VITE_RESEND_API_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuração do servidor incompleta.')
    }

    if (!resendApiKey) {
      throw new Error('Serviço de email não configurado. Contate o suporte.')
    }

    // Gera o link de recuperação via API admin do Supabase
    const generateLinkResponse = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        type: 'recovery',
        email,
        options: { redirectTo },
      }),
    })

    const linkData = await generateLinkResponse.json()

    // Se usuário não existe, retorna silenciosamente (segurança)
    if (!generateLinkResponse.ok) {
      return
    }

    const recoveryLink = linkData.action_link
    if (!recoveryLink) {
      throw new Error('Não foi possível gerar o link de recuperação.')
    }

    // Envia o email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'MotoTrack Pro <onboarding@resend.dev>',
        to: [email],
        subject: 'Redefinição de senha - MotoTrack Pro',
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px"><div style="background:linear-gradient(135deg,#f97316,#ef4444);padding:30px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:white;margin:0;font-size:28px">MotoTrack Pro</h1><p style="color:rgba(255,255,255,.9);margin:8px 0 0;font-size:14px">Gestão de Manutenção Off-Road</p></div><div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb"><h2 style="color:#1f2937;margin-top:0">Redefinição de Senha</h2><p style="color:#4b5563;font-size:16px;line-height:1.6">Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo:</p><div style="text-align:center;margin:32px 0"><a href="${recoveryLink}" style="background:linear-gradient(135deg,#f97316,#ef4444);color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;display:inline-block">Redefinir minha senha</a></div><p style="color:#6b7280;font-size:14px">Este link é válido por <strong>1 hora</strong>. Se não solicitou, ignore este email.</p><hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"><p style="color:#9ca3af;font-size:12px;text-align:center">MotoTrack Pro &bull; Gestão completa de manutenção off-road</p></div></div>`,
      }),
    })

    if (!emailResponse.ok) {
      const emailError = await emailResponse.json()
      throw new Error(`Erro ao enviar email: ${emailError.message || emailResponse.status}`)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id)
    }
  }

  const isSubscriptionActive = () => {
    if (!profile) return false
    if (profile.role === 'admin') return true
    if (profile.subscription_status === 'active') return true

    // Se está em trial, verifica a data
    if (profile.subscription_status === 'trial') {
      if (!profile.trial_ends_at) return true // Se não tem data de término, libera
      const trialEnd = new Date(profile.trial_ends_at)
      const now = new Date()
      return trialEnd > now
    }

    return false
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        isSubscriptionActive,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
