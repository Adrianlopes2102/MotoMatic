import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function SubscriptionSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [updating, setUpdating] = useState(true)
  const [error, setError] = useState(false)

  const paymentId = searchParams.get('payment_id')
  const status = searchParams.get('status')
  const externalReference = searchParams.get('external_reference')

  useEffect(() => {
    updateSubscription()
  }, [])

  const updateSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError(true)
        setUpdating(false)
        return
      }

      // Determinar o plano com base no external_reference ou role do usuário
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      const plan = profile?.role === 'mecanico' ? 'oficina' : 'pro_piloto'

      // Calcular data de expiração (1 mês a partir de agora)
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + 1)

      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_status: 'active',
          subscription_plan: plan,
          subscription_expires_at: expiresAt.toISOString(),
          last_payment_id: paymentId,
          last_payment_status: status,
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Erro ao atualizar assinatura:', updateError)
        setError(true)
      }
    } catch (err) {
      console.error('Erro ao processar confirmação:', err)
      setError(true)
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
            ) : (
              <CheckCircle className="h-20 w-20 text-green-500" />
            )}
          </div>
          <CardTitle className="text-2xl text-white">
            {updating ? 'Ativando sua assinatura...' : 'Assinatura Confirmada!'}
          </CardTitle>
          <CardDescription className="mt-2 text-slate-400">
            {updating
              ? 'Aguarde enquanto ativamos seu acesso'
              : 'Seu pagamento foi aprovado e o acesso foi liberado'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!updating && !error && (
            <div className="bg-green-950 border border-green-800 rounded-lg p-4 text-sm text-green-300">
              <p className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Pagamento processado
              </p>
              <p className="mt-1 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Acesso liberado imediatamente
              </p>
              <p className="mt-1 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Recibo enviado por email
              </p>
            </div>
          )}

          {error && (
            <div className="bg-yellow-950 border border-yellow-800 rounded-lg p-4 text-sm text-yellow-300">
              <p className="font-medium">Pagamento recebido!</p>
              <p className="mt-1 text-xs">
                Seu pagamento foi processado. Caso o acesso não seja liberado em instantes, entre em contato com o suporte.
              </p>
            </div>
          )}

          {paymentId && (
            <div className="text-xs text-slate-500">
              ID do Pagamento: {paymentId}
            </div>
          )}

          <Button
            onClick={() => navigate('/')}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            disabled={updating}
          >
            {updating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aguarde...
              </>
            ) : (
              'Ir para o Dashboard'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
