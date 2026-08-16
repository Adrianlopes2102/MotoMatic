import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string
  role: 'piloto' | 'mecanico' | 'admin'
  name: string
  phone?: string | null
  created_at?: string
  trial_ends_at?: string | null
  subscription_status: 'trial' | 'active' | 'expired'
  subscription_plan?: 'free' | 'pro_piloto' | 'oficina' | null
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean

  signIn: (email: string, password: string) => Promise<void>

  signUp: (
    email: string,
    password: string,
    name: string,
    role: 'piloto' | 'mecanico'
  ) => Promise<void>

  signOut: () => Promise<void>

  resetPassword: (email: string) => Promise<void>

  isSubscriptionActive: () => boolean

  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // ============================================================
  // CARREGAR PERFIL DO USUÁRIO
  // ============================================================

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Erro ao carregar perfil:', error)
        setProfile(null)
        return
      }

      if (!data) {
        console.warn(
          'Perfil do usuário ainda não encontrado na tabela users.'
        )
        setProfile(null)
        return
      }

      setProfile(data as UserProfile)
    } catch (error) {
      console.error('Erro inesperado ao carregar perfil:', error)
      setProfile(null)
    }
  }

  // ============================================================
  // INICIALIZAÇÃO DA AUTENTICAÇÃO
  // ============================================================

  useEffect(() => {
    let mounted = true

    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        setLoading(false)
      }
    }, 10000)

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error('Erro ao obter sessão:', error)

          if (mounted) {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }

          return
        }

        if (!mounted) return

        const currentUser = session?.user ?? null

        setUser(currentUser)

        if (currentUser) {
          await loadProfile(currentUser.id)
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error)

        if (mounted) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        clearTimeout(safetyTimeout)

        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // ============================================================
    // OBSERVAR ALTERAÇÕES DE AUTENTICAÇÃO
    // ============================================================

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      const currentUser = session?.user ?? null

      setUser(currentUser)

      if (currentUser) {
        await loadProfile(currentUser.id)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => {
      mounted = false
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, [])

  // ============================================================
  // LOGIN
  // ============================================================

  const signIn = async (
    email: string,
    password: string
  ): Promise<void> => {
    const cleanEmail = email.trim().toLowerCase()

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (error) {
      throw error
    }
  }

  // ============================================================
  // CADASTRO
  //
  // O trigger do banco cria automaticamente o perfil em users.
  // ============================================================

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: 'piloto' | 'mecanico'
  ): Promise<void> => {
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()

    if (!cleanEmail) {
      throw new Error('Digite seu e-mail.')
    }

    if (!cleanName) {
      throw new Error('Digite seu nome.')
    }

    if (password.length < 6) {
      throw new Error(
        'A senha precisa ter pelo menos 6 caracteres.'
      )
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: cleanName,
          role,
        },
      },
    })

    if (error) {
      const message = error.message.toLowerCase()

      if (
        message.includes('already registered') ||
        message.includes('already been registered') ||
        message.includes('user already registered')
      ) {
        throw new Error(
          'Este email já está cadastrado. Tente fazer login ou recuperar sua senha.'
        )
      }

      throw error
    }

    if (
      data.user &&
      data.user.identities &&
      data.user.identities.length === 0
    ) {
      throw new Error(
        'Este email já está cadastrado. Tente fazer login ou recuperar sua senha.'
      )
    }

    if (!data.user) {
      throw new Error(
        'Não foi possível criar a conta. Tente novamente.'
      )
    }

    if (data.session) {
      setUser(data.user)

      await new Promise((resolve) => setTimeout(resolve, 300))

      await loadProfile(data.user.id)
    }
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }

    setUser(null)
    setProfile(null)
  }

  // ============================================================
  // RECUPERAÇÃO DE SENHA
  // ============================================================

  const resetPassword = async (
    email: string
  ): Promise<void> => {
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail) {
      throw new Error('Digite seu e-mail.')
    }

    // Usa automaticamente o endereço onde o aplicativo está aberto.
    //
    // Local:
    // http://localhost:8080/reset-password
    //
    // Produção:
    // https://www.mototrackpro.com.br/reset-password
    //
    // Isso evita deixar o localhost preso ao endereço de produção
    // durante os testes.
    const redirectTo = `${window.location.origin}/reset-password`

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo,
        }
      )

    if (error) {
      throw error
    }
  }

  // ============================================================
  // VERIFICAR ASSINATURA / TRIAL
  // ============================================================

  const isSubscriptionActive = (): boolean => {
    if (!profile) {
      return false
    }

    // Administrador possui acesso total.
    if (profile.role === 'admin') {
      return true
    }

    // Assinatura paga ativa.
    if (profile.subscription_status === 'active') {
      return true
    }

    // Verificar período de teste.
    if (profile.subscription_status === 'trial') {
      if (!profile.trial_ends_at) {
        return true
      }

      const trialEnd = new Date(profile.trial_ends_at)
      const now = new Date()

      return trialEnd > now
    }

    // Expirado.
    return false
  }

  // ============================================================
  // ATUALIZAR PERFIL
  // ============================================================

  const refreshProfile = async (): Promise<void> => {
    if (!user) {
      setProfile(null)
      return
    }

    await loadProfile(user.id)
  }

  // ============================================================
  // PROVIDER
  // ============================================================

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

// ============================================================
// HOOK useAuth
// ============================================================

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error(
      'useAuth deve ser usado dentro de um AuthProvider'
    )
  }

  return context
}