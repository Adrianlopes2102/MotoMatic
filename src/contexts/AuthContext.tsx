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
  subscription_plan?:
    | 'free'
    | 'pro_piloto'
    | 'oficina'
    | null
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean

  signIn: (
    email: string,
    password: string
  ) => Promise<void>

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

const AuthContext =
  createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] =
    useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // ============================================================
  // CARREGAR PERFIL
  // ============================================================

  const loadProfile = async (
    userId: string
  ): Promise<void> => {
    try {
      console.log(
        '[Auth] Carregando perfil do usuário:',
        userId
      )

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error(
          '[Auth] Erro ao carregar perfil:',
          error
        )

        setProfile(null)
        return
      }

      if (!data) {
        console.warn(
          '[Auth] Perfil não encontrado na tabela users.'
        )

        setProfile(null)
        return
      }

      console.log('[Auth] Perfil carregado com sucesso.')

      setProfile(data as UserProfile)
    } catch (error) {
      console.error(
        '[Auth] Erro inesperado ao carregar perfil:',
        error
      )

      setProfile(null)
    }
  }

  // ============================================================
  // INICIALIZAÇÃO
  // ============================================================

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        console.log('[Auth] Inicializando autenticação...')

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error(
            '[Auth] Erro ao obter sessão:',
            error
          )

          setUser(null)
          setProfile(null)
          setLoading(false)

          return
        }

        const currentUser = session?.user ?? null

        console.log(
          '[Auth] Usuário encontrado:',
          currentUser?.id ?? 'nenhum'
        )

        setUser(currentUser)

        if (currentUser) {
          await loadProfile(currentUser.id)
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.error(
          '[Auth] Erro ao inicializar autenticação:',
          error
        )

        if (mounted) {
          setUser(null)
          setProfile(null)
        }
      } finally {
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
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return

        const currentUser = session?.user ?? null

        console.log(
          '[Auth] Alteração de autenticação:',
          _event
        )

        setUser(currentUser)

        if (!currentUser) {
          setProfile(null)
          setLoading(false)
          return
        }

        // IMPORTANTE:
        // Não usamos await aqui.
        // O callback do Supabase não deve ficar esperando
        // outra chamada ao Supabase.
        void loadProfile(currentUser.id)

        setLoading(false)
      }
    )

    return () => {
      mounted = false
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
    const cleanEmail = email
      .trim()
      .toLowerCase()

    console.log('[Auth] Tentando fazer login...')

    const { error } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

    if (error) {
      console.error(
        '[Auth] Erro no login:',
        error
      )

      throw error
    }

    console.log('[Auth] Login realizado com sucesso.')
  }

  // ============================================================
  // CADASTRO
  // ============================================================

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: 'piloto' | 'mecanico'
  ): Promise<void> => {
    const cleanEmail = email
      .trim()
      .toLowerCase()

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

    const { data, error } =
      await supabase.auth.signUp({
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
      const message =
        error.message.toLowerCase()

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

      await loadProfile(data.user.id)
    }
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  const signOut = async (): Promise<void> => {
    const { error } =
      await supabase.auth.signOut()

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
    const cleanEmail = email
      .trim()
      .toLowerCase()

    if (!cleanEmail) {
      throw new Error('Digite seu e-mail.')
    }

    const redirectTo =
      `${window.location.origin}/reset-password`

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
  // VERIFICAR ASSINATURA
  // ============================================================

  const isSubscriptionActive =
    (): boolean => {
      if (!profile) {
        return false
      }

      if (profile.role === 'admin') {
        return true
      }

      if (
        profile.subscription_status ===
        'active'
      ) {
        return true
      }

      if (
        profile.subscription_status ===
        'trial'
      ) {
        if (!profile.trial_ends_at) {
          return true
        }

        const trialEnd =
          new Date(profile.trial_ends_at)

        const now = new Date()

        return trialEnd > now
      }

      return false
    }

  // ============================================================
  // ATUALIZAR PERFIL
  // ============================================================

  const refreshProfile =
    async (): Promise<void> => {
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
  const context =
    useContext(AuthContext)

  if (context === undefined) {
    throw new Error(
      'useAuth deve ser usado dentro de um AuthProvider'
    )
  }

  return context
}