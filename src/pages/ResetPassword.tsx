import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Bike, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    let subscription: { unsubscribe: () => void } | null = null

    const processToken = async () => {
      setVerifying(true)

      // Lê parâmetros do hash (#token_hash=...&type=recovery) E de query params (?token_hash=...&type=recovery)
      const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
      const queryParams = new URLSearchParams(window.location.search)

      const tokenHash = hashParams.get('token_hash') || queryParams.get('token_hash')
      const type = hashParams.get('type') || queryParams.get('type')
      const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token')

      // Estratégia 1: token_hash (link direto que geramos)
      if (tokenHash && type === 'recovery') {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        })
        if (verifyError) {
          setError('Link inválido ou expirado. Solicite um novo link de recuperação.')
        } else {
          setSessionReady(true)
        }
        setVerifying(false)
        return
      }

      // Estratégia 2: access_token + refresh_token (action_link do Supabase)
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (sessionError) {
          setError('Link inválido ou expirado. Solicite um novo link de recuperação.')
        } else {
          setSessionReady(true)
        }
        setVerifying(false)
        return
      }

      // Estratégia 3: aguarda evento PASSWORD_RECOVERY (Supabase processa o hash automaticamente)
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session) {
          setSessionReady(true)
          setVerifying(false)
          clearTimeout(timeout)
        }
      })
      subscription = sub

      timeout = setTimeout(() => {
        setVerifying(false)
        setError('Link inválido ou expirado. Solicite um novo link de recuperação.')
        sub.unsubscribe()
      }, 8000)
    }

    processToken()

    return () => {
      clearTimeout(timeout)
      subscription?.unsubscribe()
    }
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas diferentes',
        description: 'As senhas digitadas não coincidem.',
        variant: 'destructive',
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setDone(true)
      toast({
        title: 'Senha redefinida com sucesso!',
        description: 'Você já pode fazer login com a nova senha.',
      })
      setTimeout(() => navigate('/login'), 3000)
    } catch (error: any) {
      toast({
        title: 'Erro ao redefinir senha',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-yellow-500 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Bike className="h-12 w-12 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold">MotoTrack Pro</CardTitle>
          <CardDescription>Redefinição de senha</CardDescription>
        </CardHeader>
        <CardContent>
          {verifying ? (
            <div className="text-center space-y-4 py-6">
              <Loader2 className="h-10 w-10 text-orange-500 mx-auto animate-spin" />
              <p className="text-sm text-slate-500">Verificando seu link...</p>
            </div>
          ) : error ? (
            <div className="text-center space-y-4 py-4">
              <AlertCircle className="h-14 w-14 text-red-500 mx-auto" />
              <p className="text-base font-semibold text-red-700">Link inválido ou expirado</p>
              <p className="text-sm text-slate-500">{error}</p>
              <Button className="w-full mt-2" onClick={() => navigate('/login')}>
                Voltar para o login
              </Button>
            </div>
          ) : done ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <p className="text-lg font-semibold text-green-700">Senha redefinida!</p>
              <p className="text-sm text-slate-500">Você será redirecionado para o login em instantes...</p>
            </div>
          ) : sessionReady ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3 mb-2">
                <Lock className="h-4 w-4 text-orange-600 shrink-0" />
                <p className="text-xs text-orange-700">Digite sua nova senha abaixo. Mínimo de 6 caracteres.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </Button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-xs text-center text-slate-500 hover:text-slate-700 w-full"
              >
                Voltar para o login
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4 py-4">
              <AlertCircle className="h-14 w-14 text-orange-500 mx-auto" />
              <p className="text-base font-semibold text-slate-700">Link não reconhecido</p>
              <p className="text-sm text-slate-500">Solicite um novo link de recuperação de senha.</p>
              <Button className="w-full mt-2" onClick={() => navigate('/login')}>
                Voltar para o login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
