import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  Bike,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)
  const [done, setDone] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // ============================================================
  // VERIFICAR LINK DE RECUPERAÇÃO
  // ============================================================

  useEffect(() => {
    let mounted = true

    const verifyRecoverySession = async () => {
      try {
        setVerifying(true)
        setError(null)

        // --------------------------------------------------------
        // 1. Verificar se já existe uma sessão
        // --------------------------------------------------------

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          if (mounted) {
            setSessionReady(true)
            setVerifying(false)
          }

          return
        }

        // --------------------------------------------------------
        // 2. Verificar código PKCE (?code=...)
        // --------------------------------------------------------

        const searchParams = new URLSearchParams(
          window.location.search
        )

        const code = searchParams.get('code')

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            console.error(
              'Erro ao trocar código de recuperação:',
              exchangeError
            )

            if (mounted) {
              setError(
                'O link de recuperação é inválido ou expirou. Solicite um novo link.'
              )
              setVerifying(false)
            }

            return
          }

          const {
            data: { session: newSession },
          } = await supabase.auth.getSession()

          if (newSession?.user) {
            if (mounted) {
              setSessionReady(true)
              setVerifying(false)
            }

            return
          }
        }

        // --------------------------------------------------------
        // 3. Verificar token_hash
        // --------------------------------------------------------

        const hashParams = new URLSearchParams(
          window.location.hash.replace(/^#/, '')
        )

        const tokenHash =
          hashParams.get('token_hash') ||
          searchParams.get('token_hash')

        const type =
          hashParams.get('type') ||
          searchParams.get('type')

        if (tokenHash && type === 'recovery') {
          const { error: verifyError } =
            await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'recovery',
            })

          if (verifyError) {
            console.error(
              'Erro ao verificar token de recuperação:',
              verifyError
            )

            if (mounted) {
              setError(
                'O link de recuperação é inválido ou expirou. Solicite um novo link.'
              )
              setVerifying(false)
            }

            return
          }

          const {
            data: { session: recoverySession },
          } = await supabase.auth.getSession()

          if (recoverySession?.user) {
            if (mounted) {
              setSessionReady(true)
              setVerifying(false)
            }

            return
          }
        }

        // --------------------------------------------------------
        // 4. Verificar access_token + refresh_token
        //    Formato usado em alguns links antigos do Supabase
        // --------------------------------------------------------

        const accessToken =
          hashParams.get('access_token') ||
          searchParams.get('access_token')

        const refreshToken =
          hashParams.get('refresh_token') ||
          searchParams.get('refresh_token')

        const recoveryType =
          hashParams.get('type') ||
          searchParams.get('type')

        if (
          accessToken &&
          refreshToken &&
          (!recoveryType || recoveryType === 'recovery')
        ) {
          const { error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

          if (sessionError) {
            console.error(
              'Erro ao criar sessão de recuperação:',
              sessionError
            )

            if (mounted) {
              setError(
                'O link de recuperação é inválido ou expirou. Solicite um novo link.'
              )
              setVerifying(false)
            }

            return
          }

          if (mounted) {
            setSessionReady(true)
            setVerifying(false)
          }

          return
        }

        // --------------------------------------------------------
        // 5. Escutar PASSWORD_RECOVERY
        // --------------------------------------------------------

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(
          (event, currentSession) => {
            if (!mounted) return

            if (
              event === 'PASSWORD_RECOVERY' &&
              currentSession?.user
            ) {
              setSessionReady(true)
              setVerifying(false)
              setError(null)
            }

            if (
              event === 'SIGNED_IN' &&
              currentSession?.user
            ) {
              setSessionReady(true)
              setVerifying(false)
              setError(null)
            }
          }
        )

        // --------------------------------------------------------
        // 6. Última tentativa de verificar a sessão
        // --------------------------------------------------------

        const {
          data: { session: finalSession },
        } = await supabase.auth.getSession()

        if (finalSession?.user) {
          if (mounted) {
            setSessionReady(true)
            setVerifying(false)
          }

          subscription.unsubscribe()
          return
        }

        // --------------------------------------------------------
        // 7. Se nada funcionou, informar erro
        // --------------------------------------------------------

        setTimeout(() => {
          if (!mounted) return

          setVerifying(false)
          setError(
            'Não foi possível validar o link de recuperação. Solicite um novo link de recuperação de senha.'
          )

          subscription.unsubscribe()
        }, 5000)

        return () => {
          subscription.unsubscribe()
        }
      } catch (err) {
        console.error(
          'Erro inesperado ao verificar recuperação:',
          err
        )

        if (mounted) {
          setVerifying(false)
          setError(
            'Ocorreu um erro ao verificar o link de recuperação.'
          )
        }
      }
    }

    verifyRecoverySession()

    return () => {
      mounted = false
    }
  }, [])

  // ============================================================
  // ALTERAR SENHA
  // ============================================================

  const handleReset = async (
    e: React.FormEvent
  ): Promise<void> => {
    e.preventDefault()

    setError(null)

    // ----------------------------------------------------------
    // Validações
    // ----------------------------------------------------------

    if (!sessionReady) {
      toast({
        title: 'Sessão não encontrada',
        description:
          'Abra novamente o link recebido por e-mail.',
        variant: 'destructive',
      })

      return
    }

    if (!newPassword) {
      toast({
        title: 'Digite uma nova senha',
        description:
          'Informe a senha que deseja utilizar.',
        variant: 'destructive',
      })

      return
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Senha muito curta',
        description:
          'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      })

      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas diferentes',
        description:
          'As duas senhas precisam ser iguais.',
        variant: 'destructive',
      })

      return
    }

    setLoading(true)

    try {
      // --------------------------------------------------------
      // Confirmar que ainda existe sessão
      // --------------------------------------------------------

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        throw new Error(
          'Sua sessão de recuperação expirou. Solicite um novo link.'
        )
      }

      // --------------------------------------------------------
      // Atualizar senha
      // --------------------------------------------------------

      const { error: updateError } =
        await supabase.auth.updateUser({
          password: newPassword,
        })

      if (updateError) {
        throw updateError
      }

      // --------------------------------------------------------
      // Sucesso
      // --------------------------------------------------------

      setDone(true)

      toast({
        title: 'Senha redefinida com sucesso!',
        description:
          'Sua nova senha foi salva. Você já pode entrar novamente.',
      })

      // --------------------------------------------------------
      // Redirecionar para login
      // --------------------------------------------------------

      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2500)
    } catch (err: any) {
      console.error(
        'Erro ao redefinir senha:',
        err
      )

      const message =
        err?.message ||
        'Não foi possível alterar sua senha.'

      toast({
        title: 'Erro ao redefinir senha',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // VOLTAR PARA LOGIN
  // ============================================================

  const handleBackToLogin = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Não impedir a navegação caso o signOut falhe.
    }

    navigate('/login', { replace: true })
  }

  // ============================================================
  // TELA
  // ============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-yellow-500 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        {/* ======================================================
            CABEÇALHO
        ====================================================== */}

        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Bike className="h-12 w-12 text-orange-600" />
          </div>

          <CardTitle className="text-2xl font-bold">
            MotoTrack Pro
          </CardTitle>

          <CardDescription>
            Recuperação de senha
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* ====================================================
              VERIFICANDO LINK
          ==================================================== */}

          {verifying && (
            <div className="text-center space-y-4 py-8">
              <Loader2 className="h-10 w-10 text-orange-500 mx-auto animate-spin" />

              <div>
                <p className="text-base font-medium text-slate-700">
                  Verificando seu link...
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  Aguarde alguns segundos.
                </p>
              </div>
            </div>
          )}

          {/* ====================================================
              ERRO
          ==================================================== */}

          {!verifying && error && (
            <div className="text-center space-y-4 py-6">
              <AlertCircle className="h-14 w-14 text-red-500 mx-auto" />

              <div>
                <p className="text-lg font-semibold text-red-700">
                  Link inválido ou expirado
                </p>

                <p className="text-sm text-slate-500 mt-2">
                  {error}
                </p>
              </div>

              <Button
                type="button"
                className="w-full mt-2"
                onClick={handleBackToLogin}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para o login
              </Button>
            </div>
          )}

          {/* ====================================================
              SENHA ALTERADA
          ==================================================== */}

          {!verifying && !error && done && (
            <div className="text-center space-y-4 py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />

              <div>
                <p className="text-xl font-semibold text-green-700">
                  Senha redefinida!
                </p>

                <p className="text-sm text-slate-500 mt-2">
                  Sua nova senha foi salva com sucesso.
                </p>

                <p className="text-xs text-slate-400 mt-2">
                  Você será redirecionado para o login...
                </p>
              </div>
            </div>
          )}

          {/* ====================================================
              FORMULÁRIO DE NOVA SENHA
          ==================================================== */}

          {!verifying &&
            !error &&
            !done &&
            sessionReady && (
              <form
                onSubmit={handleReset}
                className="space-y-5"
              >
                <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <Lock className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />

                  <div>
                    <p className="text-sm font-semibold text-orange-800">
                      Crie uma nova senha
                    </p>

                    <p className="text-xs text-orange-700 mt-1">
                      A senha deve ter pelo menos 6 caracteres.
                    </p>
                  </div>
                </div>

                {/* ==================================================
                    NOVA SENHA
                ================================================== */}

                <div className="space-y-2">
                  <Label htmlFor="new-password">
                    Nova senha
                  </Label>

                  <div className="relative">
                    <Input
                      id="new-password"
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      placeholder="Digite sua nova senha"
                      value={newPassword}
                      onChange={(e) =>
                        setNewPassword(
                          e.target.value
                        )
                      }
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="pr-11"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      aria-label={
                        showPassword
                          ? 'Ocultar senha'
                          : 'Mostrar senha'
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* ==================================================
                    CONFIRMAR SENHA
                ================================================== */}

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">
                    Confirmar nova senha
                  </Label>

                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={
                        showConfirmPassword
                          ? 'text'
                          : 'password'
                      }
                      placeholder="Digite a senha novamente"
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(
                          e.target.value
                        )
                      }
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="pr-11"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (value) => !value
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      aria-label={
                        showConfirmPassword
                          ? 'Ocultar confirmação'
                          : 'Mostrar confirmação'
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* ==================================================
                    BOTÃO
                ================================================== */}

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando nova senha...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Salvar nova senha
                    </>
                  )}
                </Button>

                {/* ==================================================
                    VOLTAR
                ================================================== */}

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-700 w-full"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar para o login
                </button>
              </form>
            )}

          {/* ====================================================
              LINK NÃO RECONHECIDO
          ==================================================== */}

          {!verifying &&
            !error &&
            !done &&
            !sessionReady && (
              <div className="text-center space-y-4 py-6">
                <AlertCircle className="h-14 w-14 text-orange-500 mx-auto" />

                <div>
                  <p className="text-lg font-semibold text-slate-700">
                    Link não reconhecido
                  </p>

                  <p className="text-sm text-slate-500 mt-2">
                    Solicite um novo link de recuperação
                    de senha.
                  </p>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={handleBackToLogin}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para o login
                </Button>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}