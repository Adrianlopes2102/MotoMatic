import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'

export default function SubscriptionFailure() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const paymentId = searchParams.get('payment_id')
  const status = searchParams.get('status')

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-pink-500 to-rose-500 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <XCircle className="h-20 w-20 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Pagamento Não Processado</CardTitle>
          <CardDescription className="mt-2">
            Não foi possível processar seu pagamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-900">
            <p className="font-medium">❌ O pagamento foi recusado</p>
            <p className="mt-2">
              Isso pode acontecer por diversos motivos:
            </p>
            <ul className="text-left mt-2 space-y-1 ml-4">
              <li>• Saldo insuficiente</li>
              <li>• Dados do cartão incorretos</li>
              <li>• Limite de crédito excedido</li>
              <li>• Problemas com a operadora</li>
            </ul>
          </div>

          {paymentId && (
            <div className="text-xs text-gray-500">
              ID da Tentativa: {paymentId}
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={() => navigate('/upgrade')}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Tentar Novamente
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full"
            >
              Voltar ao Dashboard
            </Button>
          </div>

          <p className="text-xs text-gray-600 mt-4">
            Você pode tentar novamente com outro método de pagamento
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
