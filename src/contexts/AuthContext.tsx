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

    // Tenta via Edge Function primeiro (contorna restrições de URL de redirecionamento)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      if (supabaseUrl && supabaseAnonKey) {
        const projectRef = supabaseUrl.replace('https://', '').split('.')[0]
        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-reset-password`

        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ email, redirectTo }),
        })

        const data = await response.json()
        if (response.ok && data.success) return
      }
    } catch {
      // Se a Edge Function falhar, cai no método padrão abaixo
    }

    // Fallback: método padrão do Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })
    if (error) throw error
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
