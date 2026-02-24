import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'

export default function SubscriptionPending() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const paymentId = searchParams.get('payment_id')
  const status = searchParams.get('status')

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-500 via-orange-500 to-amber-500 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Clock className="h-20 w-20 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl">Pagamento Pendente</CardTitle>
          <CardDescription className="mt-2">
            Aguardando confirmação do pagamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-900">
            <p className="font-medium">⏳ Seu pagamento está em processamento</p>
            <p className="mt-2">
              Para pagamentos via PIX, o processamento é instantâneo.
              Para boleto bancário, pode levar até 2 dias úteis.
            </p>
          </div>

          {paymentId && (
            <div className="text-xs text-gray-500">
              ID do Pagamento: {paymentId}
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={() => navigate('/')}
              className="w-full bg-yellow-600 hover:bg-yellow-700"
            >
              Voltar ao Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/upgrade')}
              className="w-full"
            >
              Ver Planos Novamente
            </Button>
          </div>

          <p className="text-xs text-gray-600 mt-4">
            Você receberá um email quando o pagamento for confirmado
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
