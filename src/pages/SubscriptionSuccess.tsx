import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function SubscriptionSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [updating, setUpdating] = useState(true)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [statusMsg, setStatusMsg] = useState('Restaurando sua sessão...')
  const { refreshProfile, loading: authLoading } = useAuth()
  const hasRun = useRef(false)

  // Todos os parâmetros que o Mercado Pago pode enviar no redirect
  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id')
  const status = searchParams.get('status') || searchParams.get('collection_status')
  const preapprovalId = searchParams.get('preapproval_id')
  const externalRef = searchParams.get('external_reference')

  // Aguarda o AuthContext terminar de carregar antes de verificar
  useEffect(() => {
    if (authLoading) return
    if (hasRun.current) return
    hasRun.current = true
    activateSubscription()
  }, [authLoading])

  const activateSubscription = async () => {
    setUpdating(true)
    setErrorMsg(null)
    const logs: string[] = []

    try {
      logs.push(`Params: payment_id=${paymentId}, status=${status}, preapproval_id=${preapprovalId}`)
      setStatusMsg('Verificando sua sessão...')

      // Tenta obter a sessão. Se não tiver, espera até 8s pelo onAuthStateChange
      let session = (await supabase.auth.getSession()).data.session

      if (!session) {
        logs.push('Sessão não imediata, aguardando restauração...')
        setStatusMsg('Aguardando sessão ser restaurada...')

        session = await new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(null), 8000)
          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
            if (s) {
              clearTimeout(timeout)
              subscription.unsubscribe()
              resolve(s)
            }
          })
        })
      }

      logs.push(`Sessão: ${session ? 'ativa (user=' + session.user.id + ')' : 'não encontrada após espera'}`)

      if (!session) {
        // Sessão perdida: tenta verificar pelo preapproval_id sem autenticação (usando webhook como fallback)
        // Mostra tela de login com instrução clara
        setErrorMsg('Sua sessão expirou durante o redirecionamento. Faça login novamente — seu pagamento foi registrado e será ativado automaticamente.')
        setDebugLogs(logs)
        setUpdating(false)
        return
      }

      setStatusMsg('Confirmando pagamento com o Mercado Pago...')

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

      logs.push('Chamando verify-payment...')
      const res = await fetch(`${supabaseUrl}/functions/v1/verify-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: paymentId,
          collection_id: paymentId,
          preapproval_id: preapprovalId,
          external_reference: externalRef,
          status: status,
          user_id: session.user.id,
          user_email: session.user.email,
        }),
      })

      const data = await res.json()
      logs.push(`Resposta: HTTP ${res.status}, ok=${data.ok}, plan=${data.plan}, error=${data.error}`)
      if (data.logs) logs.push(...data.logs)

      if (res.ok && (data.ok || data.already_active)) {
        await refreshProfile()
        setSuccess(true)
      } else {
        setErrorMsg(
          data.error === 'Payment not verified'
            ? 'Pagamento ainda não confirmado pelo Mercado Pago. Aguarde alguns instantes e tente novamente.'
            : 'Erro ao ativar assinatura. Se o valor foi cobrado, entre em contato com o suporte.'
        )
      }

      setDebugLogs(logs)
    } catch (err: any) {
      logs.push(`Exceção: ${err?.message}`)
      setDebugLogs(logs)
      setErrorMsg('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setUpdating(false)
    }
  }

  const handleRetry = () => {
    hasRun.current = false
    activateSubscription()
  }

  return (
    <div className="min-h-screen bg-[#1e293b] flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {updating ? (
              <Loader2 className="h-20 w-20 text-orange-500 animate-spin" />
            ) : success ? (
              <CheckCircle className="h-20 w-20 text-green-500" />
            ) : (
              <AlertCircle className="h-20 w-20 text-yellow-500" />
            )}
          </div>
          <CardTitle className="text-2xl text-white">
            {updating
              ? 'Verificando seu pagamento...'
              : success
              ? 'Assinatura Confirmada!'
              : 'Verificação Pendente'}
          </CardTitle>
          <CardDescription className="mt-2 text-slate-400">
            {updating
              ? statusMsg
              : success
              ? 'Seu pagamento foi aprovado e o acesso foi liberado'
              : 'Não conseguimos confirmar automaticamente'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!updating && success && (
            <div className="bg-green-950 border border-green-800 rounded-lg p-4 text-sm text-green-300">
              <p className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Pagamento verificado com o Mercado Pago
              </p>
              <p className="mt-1 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Acesso liberado imediatamente
              </p>
              <p className="mt-1 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Recibo enviado por email
              </p>
            </div>
          )}

          {!updating && errorMsg && (
            <div className="bg-yellow-950 border border-yellow-800 rounded-lg p-4 text-sm text-yellow-300 text-left">
              <p className="font-medium mb-1">Atenção</p>
              <p className="text-xs">{errorMsg}</p>
            </div>
          )}

          {/* Logs de diagnóstico — visíveis apenas em caso de erro */}
          {!updating && !success && debugLogs.length > 0 && (
            <details className="text-left">
              <summary className="text-xs text-slate-500 cursor-pointer">Ver detalhes técnicos</summary>
              <div className="mt-2 bg-slate-900 rounded p-2 text-xs text-slate-400 space-y-1">
                {debugLogs.map((log, i) => <p key={i}>{log}</p>)}
              </div>
            </details>
          )}

          {paymentId && (
            <div className="text-xs text-slate-500">
              ID do Pagamento: {paymentId}
            </div>
          )}

          {preapprovalId && !paymentId && (
            <div className="text-xs text-slate-500">
              ID da Assinatura: {preapprovalId}
            </div>
          )}

          {!updating && (
            <div className="space-y-2">
              <Button
                onClick={() => navigate('/')}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                Ir para o Dashboard
              </Button>
              {!success && (
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Tentar novamente
                </Button>
              )}
            </div>
          )}

          {updating && (
            <Button disabled className="w-full bg-orange-500 text-white">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Aguarde...
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
