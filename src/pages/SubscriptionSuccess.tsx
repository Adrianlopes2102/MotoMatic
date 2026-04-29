import { useEffect, useState } from 'react'
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
  const { refreshProfile } = useAuth()

  // Parâmetros que o Mercado Pago envia no redirect
  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id')
  const status = searchParams.get('status') || searchParams.get('collection_status')
  const preapprovalId = searchParams.get('preapproval_id')

  useEffect(() => {
    activateSubscription()
  }, [])

  const activateSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setErrorMsg('Sessão expirada. Faça login novamente.')
        setUpdating(false)
        return
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

      // Chama a Edge Function segura que verifica o pagamento diretamente na API do MP
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
          status: status,
        }),
      })

      const data = await res.json()

      if (res.ok && (data.ok || data.already_active)) {
        await refreshProfile()
        setSuccess(true)
      } else {
        console.error('Falha na verificação:', data)
        setErrorMsg(
          'Não foi possível confirmar o pagamento automaticamente. ' +
          'Se o valor foi cobrado, entre em contato com o suporte informando o ID abaixo.'
        )
      }
    } catch (err) {
      console.error('Erro ao processar confirmação:', err)
      setErrorMsg('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setUpdating(false)
    }
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
              ? 'Confirmando com o Mercado Pago, aguarde...'
              : success
              ? 'Seu pagamento foi aprovado e o acesso foi liberado'
              : 'Não foi possível confirmar automaticamente'}
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

          {paymentId && (
            <div className="text-xs text-slate-500">
              ID do Pagamento: {paymentId}
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
                  onClick={activateSubscription}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Tentar novamente
                </Button>
              )}
            </div>
          )}

          {updating && (
            <Button
              disabled
              className="w-full bg-orange-500 text-white"
            >
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Aguarde...
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
