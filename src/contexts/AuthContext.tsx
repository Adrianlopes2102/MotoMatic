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
    console.log('🔵 loadProfile iniciou:', userId)

    try {
      console.log('🟡 Tentando consultar tabela users...')

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      console.log('🟢 Resultado da consulta users:', {
        data,
        error,
      })

      if (error) {
        console.error('🔴 Erro ao carregar perfil:', error)
        setProfile(null)
        return
      }

      if (!data) {
        console.warn(
          '🟠 Perfil do usuário não encontrado na tabela users.'
        )

        setProfile(null)
        return
      }

      console.log('✅ Perfil carregado com sucesso:', data)

      setProfile(data as UserProfile)
    } catch (error) {
      console.error(
        '🔴 Erro inesperado ao carregar perfil:',
        error
      )

      setProfile(null)
    }
  }

  // ============================================================
  // INICIALIZAÇÃO DA AUTENTICAÇÃO
  // ============================================================

  useEffect(() => {
    let mounted = true

    console.log('🔵 AuthProvider iniciado')

    const safetyTimeout = setTimeout(() => {
      console.warn(
        '🟠 Timeout de segurança da autenticação atingido.'
      )

      if (mounted) {
        setLoading(false)
      }
    }, 10000)

    const initializeAuth = async () => {
      console.log('🔵 Inicializando autenticação...')

      try {
        console.log('🟡 Obtendo sessão do Supabase...')

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        console.log('🟢 Resultado getSession:', {
          session,
          error,
        })

        if (error) {
          console.error(
            '🔴 Erro ao obter sessão:',
            error
          )

          if (mounted) {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }

          return
        }

        if (!mounted) return

        const currentUser = session?.user ?? null

        console.log(
          '👤 Usuário atual:',
          currentUser
        )

        setUser(currentUser)

        if (currentUser) {
          console.log(
            '🟡 Usuário autenticado. Carregando perfil...'
          )

          await loadProfile(currentUser.id)
        } else {
          console.log(
            '🟠 Nenhum usuário autenticado.'
          )

          setProfile(null)
        }
      } catch (error) {
        console.error(
          '🔴 Erro ao inicializar autenticação:',
          error
        )

        if (mounted) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        clearTimeout(safetyTimeout)

        if (mounted) {
          setLoading(false)
        }

        console.log(
          '🟢 Inicialização da autenticação finalizada.'
        )
      }
    }

    initializeAuth()

    // ============================================================
    // OBSERVAR ALTERAÇÕES DE AUTENTICAÇÃO
    // ============================================================

    console.log(
      '🔵 Registrando observador de autenticação...'
    )

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return

        console.log(
          '🔵 Alteração de autenticação:',
          _event
        )

        const currentUser = session?.user ?? null

        console.log(
          '👤 Usuário após alteração:',
          currentUser
        )

        setUser(currentUser)

        if (currentUser) {
          console.log(
            '🟡 Carregando perfil após alteração de autenticação...'
          )

          await loadProfile(currentUser.id)
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => {
      console.log(
        '🧹 Limpando AuthProvider...'
      )

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

    console.log(
      '🔵 Tentando fazer login:',
      cleanEmail
    )

    const { error } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

    if (error) {
      console.error(
        '🔴 Erro no login:',
        error
      )

      throw error
    }

    console.log(
      '✅ Login realizado com sucesso.'
    )
  }

  // ============================================================
  // CADASTRO
  //
  // O trigger do banco cria automaticamente
  // o perfil em users.
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

    console.log(
      '🔵 Criando conta:',
      cleanEmail
    )

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
      console.error(
        '🔴 Erro no cadastro:',
        error
      )

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

    console.log(
      '✅ Conta criada:',
      data.user.id
    )

    if (data.session) {
      setUser(data.user)

      await new Promise((resolve) =>
        setTimeout(resolve, 300)
      )

      await loadProfile(data.user.id)
    }
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  const signOut = async (): Promise<void> => {
    console.log('🔵 Fazendo logout...')

    const { error } =
      await supabase.auth.signOut()

    if (error) {
      console.error(
        '🔴 Erro ao fazer logout:',
        error
      )

      throw error
    }

    setUser(null)
    setProfile(null)

    console.log(
      '✅ Logout realizado.'
    )
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

    const redirectTo =
      `${window.location.origin}/reset-password`

    console.log(
      '🔵 Solicitando recuperação de senha:',
      {
        email: cleanEmail,
        redirectTo,
      }
    )

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo,
        }
      )

    if (error) {
      console.error(
        '🔴 Erro na recuperação de senha:',
        error
      )

      throw error
    }

    console.log(
      '✅ E-mail de recuperação solicitado.'
    )
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

      const trialEnd =
        new Date(profile.trial_ends_at)

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
      console.log(
        '🟠 refreshProfile chamado sem usuário.'
      )

      setProfile(null)
      return
    }

    console.log(
      '🔵 Atualizando perfil:',
      user.id
    )

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