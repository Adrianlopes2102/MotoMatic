import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'

export default function Subscription() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const handleSubscribe = (plan: string) => {
    // Aqui você pode adicionar a lógica de pagamento futuramente
    console.log(`Assinando o plano: ${plan}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-yellow-500 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Escolha seu Plano</h1>
          <p className="text-white/90">Selecione o plano ideal para você</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plano Piloto */}
          <Card className="border-2 hover:border-orange-500 transition-all hover:shadow-xl">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl mb-2">Piloto</CardTitle>
              <div className="mt-4">
                <span className="text-5xl font-bold">R$ 19,90</span>
                <span className="text-gray-600">/mês</span>
              </div>
              <CardDescription className="mt-2">Ideal para pilotos individuais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Motos ilimitadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Controle de horímetro</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Registro de trilhas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Sistema de manutenção</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Notificações automáticas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Histórico completo</span>
                </div>
              </div>
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                size="lg"
                asChild
              >
                <a href="https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=63f30d0416b84943924a7914a288e6bb" target="_blank" rel="noopener noreferrer">
                  Assinar Plano Piloto
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Plano Mecânico */}
          <Card className="border-2 border-blue-500 hover:border-blue-600 transition-all hover:shadow-xl relative">
            <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-semibold">
              Profissional
            </div>
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl mb-2">Mecânico</CardTitle>
              <div className="mt-4">
                <span className="text-5xl font-bold">R$ 39,90</span>
                <span className="text-gray-600">/mês</span>
              </div>
              <CardDescription className="mt-2">Para oficinas e mecânicos profissionais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-semibold">Tudo do plano Piloto</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Acesso a motos de clientes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Registro de serviços realizados</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Histórico técnico completo</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Gestão de múltiplos clientes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">Relatórios profissionais</span>
                </div>
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
                asChild
              >
                <a href="https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=ec3c25dcb840450da01df6329e536804" target="_blank" rel="noopener noreferrer">
                  Assinar Plano Mecânico
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            Voltar
          </Button>
        </div>
      </div>
    </div>
  )
}
