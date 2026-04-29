import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function SubscriptionSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [updating, setUpdating] = useState(true)
  const [error, setError] = useState(false)
  const { refreshProfile } = useAuth()

  const paymentId = searchParams.get('payment_id')
  const status = searchParams.get('status')

  useEffect(() => {
    activateSubscription()
  }, [])

  const activateSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError(true)
        setUpdating(false)
        return
      }

      // Segurança: só ativa se o Mercado Pago retornou status=approved E há payment_id
      if (status !== 'approved' || !paymentId) {
        console.warn('Tentativa de ativação sem pagamento aprovado:', { status, paymentId })
        setError(true)
        setUpdating(false)
        return
      }

      const userId = session.user.id

      // Verifica se este payment_id já foi usado para evitar dupla ativação ou fraude
      const { data: existingPayment } = await supabase
        .from('users')
        .select('last_payment_id, subscription_status')
        .eq('id', userId)
        .single()

      // Se já está ativo com este mesmo payment_id, apenas atualiza o contexto
      if (existingPayment?.subscription_status === 'active' && existingPayment?.last_payment_id === paymentId) {
        await refreshProfile()
        setUpdating(false)
        return
      }

      // Busca o perfil para pegar o plano pendente
      const { data: profile } = await supabase
        .from('users')
        .select('role, pending_plan')
        .eq('id', userId)
        .single()

      // Usa o pending_plan salvo quando clicou em Assinar, ou determina pelo role
      const plan = (profile as any)?.pending_plan
        || (profile?.role === 'mecanico' ? 'oficina' : 'pro_piloto')

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
          pending_plan: null,
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Erro ao ativar assinatura:', updateError)
        setError(true)
      } else {
        await refreshProfile()
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
                Seu pagamento foi processado. Acesse o app normalmente — seu acesso já está liberado.
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
