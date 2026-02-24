import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

export default function SubscriptionSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Captura parâmetros do Mercado Pago
  const paymentId = searchParams.get('payment_id')
  const status = searchParams.get('status')
  const externalReference = searchParams.get('external_reference')

  useEffect(() => {
    // Opcional: pode fazer uma verificação adicional aqui
    console.log('Pagamento aprovado:', { paymentId, status, externalReference })
  }, [paymentId, status, externalReference])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-20 w-20 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Assinatura Confirmada! 🎉</CardTitle>
          <CardDescription className="mt-2">
            Seu pagamento foi aprovado com sucesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-900">
            <p className="font-medium">✓ Pagamento processado</p>
            <p className="mt-1">✓ Acesso liberado imediatamente</p>
            <p className="mt-1">✓ Recibo enviado por email</p>
          </div>

          {paymentId && (
            <div className="text-xs text-gray-500">
              ID do Pagamento: {paymentId}
            </div>
          )}

          <Button
            onClick={() => navigate('/')}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Ir para o Dashboard
          </Button>

          <p className="text-xs text-gray-600 mt-4">
            Aguarde alguns segundos para que seu acesso seja ativado automaticamente
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
