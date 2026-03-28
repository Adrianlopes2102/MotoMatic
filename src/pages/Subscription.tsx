import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'

export default function Subscription() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handleSubscribe = async (plan: string, fallbackUrl: string) => {
    setLoadingPlan(plan)

    // Salva o plano pendente no banco antes de redirecionar
    if (user) {
      await supabase
        .from('users')
        .update({ pending_plan: plan })
        .eq('id', user.id)
    }

    try {
      // Tenta gerar checkout via Edge Function (tem back_url configurado)
      const { data: { session } } = await supabase.auth.getSession()
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

      const res = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan })
      })

      if (res.ok) {
        const data = await res.json()
        // Em produção usa init_point, em teste usa sandbox_init_point
        const url = data.sandbox_init_point || data.init_point || fallbackUrl
        window.location.href = url
        return
      }
    } catch (e) {
      console.warn('Edge function falhou, usando fallback:', e)
    }

    // Fallback: link direto do Mercado Pago
    window.location.href = fallbackUrl
  }

  return (
    <div className="min-h-screen bg-[#1e293b] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Escolha seu Plano</h1>
          <p className="text-slate-400">Selecione o plano ideal para você</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plano Piloto */}
          <Card className="border-2 border-slate-700 bg-slate-800 hover:border-orange-500 transition-all hover:shadow-xl">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl mb-2 text-white">Piloto</CardTitle>
              <div className="mt-4">
                <span className="text-5xl font-bold text-white">R$ 19,90</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <CardDescription className="mt-2 text-slate-400">Ideal para pilotos individuais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 mb-8">
                {['Motos ilimitadas', 'Controle de horímetro', 'Registro de trilhas', 'Sistema de manutenção', 'Notificações automáticas', 'Histórico completo'].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-slate-300">{f}</span>
                  </div>
                ))}
              </div>
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                size="lg"
                disabled={loadingPlan !== null}
                onClick={() => handleSubscribe('pro_piloto', 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=63f30d0416b84943924a7914a288e6bb')}
              >
                {loadingPlan === 'pro_piloto' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Assinar Plano Piloto
              </Button>
            </CardContent>
          </Card>

          {/* Plano Mecânico */}
          <Card className="border-2 border-blue-500 bg-slate-800 hover:border-blue-400 transition-all hover:shadow-xl relative">
            <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-semibold">
              Profissional
            </div>
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl mb-2 text-white">Mecânico</CardTitle>
              <div className="mt-4">
                <span className="text-5xl font-bold text-white">R$ 39,90</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <CardDescription className="mt-2 text-slate-400">Para oficinas e mecânicos profissionais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 mb-8">
                {['Tudo do plano Piloto', 'Acesso a motos de clientes', 'Registro de serviços realizados', 'Histórico técnico completo', 'Gestão de múltiplos clientes', 'Relatórios profissionais'].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className={`text-sm ${f === 'Tudo do plano Piloto' ? 'font-semibold text-white' : 'text-slate-300'}`}>{f}</span>
                  </div>
                ))}
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
                disabled={loadingPlan !== null}
                onClick={() => handleSubscribe('oficina', 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=ec3c25dcb840450da01df6329e536804')}
              >
                {loadingPlan === 'oficina' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Assinar Plano Mecânico
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-slate-700"
            onClick={() => navigate(-1)}
          >
            Voltar
          </Button>
        </div>
      </div>
    </div>
  )
}
