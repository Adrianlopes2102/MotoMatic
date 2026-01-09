import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Bike, Wrench, Bell, Plus, LogOut, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Moto {
  id: string
  marca: string
  modelo: string
  ano: number
  horimetro: number
  foto_url?: string
}

export default function Dashboard() {
  const { user, profile, signOut, isSubscriptionActive } = useAuth()
  const navigate = useNavigate()
  const [motos, setMotos] = useState<Moto[]>([])
  const [loading, setLoading] = useState(true)
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    if (profile?.subscription_status === 'trial' && profile.trial_ends_at) {
      const trialEnd = new Date(profile.trial_ends_at)
      const now = new Date()
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      setTrialDaysLeft(daysLeft > 0 ? daysLeft : 0)
    }

    loadMotos()
  }, [user, profile, navigate])

  const loadMotos = async () => {
    if (!user) return

    try {
      if (profile?.role === 'piloto') {
        // Piloto vê suas próprias motos
        const { data, error } = await supabase
          .from('motos')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setMotos(data || [])
      } else if (profile?.role === 'mecanico') {
        // Mecânico vê motos liberadas para ele
        const { data: liberacoes, error: libError } = await supabase
          .from('liberacoes_mecanico')
          .select('moto_id')
          .eq('mecanico_id', user.id)
          .eq('ativo', true)

        if (libError) {
          console.error('Erro ao buscar liberações:', libError)
          setMotos([])
          return
        }

        if (!liberacoes || liberacoes.length === 0) {
          setMotos([])
          return
        }

        const motoIds = liberacoes.map((l) => l.moto_id)

        // Buscar motos liberadas
        const { data, error } = await supabase
          .from('motos')
          .select('*')
          .in('id', motoIds)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Erro ao buscar motos:', error)
          setMotos([])
          return
        }

        setMotos(data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar motos:', error)
      setMotos([])
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // Aguarda o profile carregar antes de verificar a assinatura
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-white">Carregando...</p>
      </div>
    )
  }

  if (!isSubscriptionActive() && profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-yellow-500 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Período de Teste Expirado</CardTitle>
            <CardDescription>Assine um plano para continuar usando o MotoTrack Pro</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-lg">Pro Piloto</CardTitle>
                  <CardDescription>R$ 29,90/mês</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1">
                    <li>✓ Motos ilimitadas</li>
                    <li>✓ Controle de horímetro</li>
                    <li>✓ Sistema de manutenção</li>
                    <li>✓ Notificações</li>
                  </ul>
                  <Button className="w-full mt-4" onClick={() => navigate('/upgrade')}>
                    Assinar Agora
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg">Oficina/Mecânico</CardTitle>
                  <CardDescription>R$ 49,90/mês</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1">
                    <li>✓ Tudo do Pro Piloto</li>
                    <li>✓ Acesso a motos de clientes</li>
                    <li>✓ Registro de serviços</li>
                    <li>✓ Histórico técnico</li>
                  </ul>
                  <Button className="w-full mt-4" onClick={() => navigate('/upgrade')}>
                    Assinar Agora
                  </Button>
                </CardContent>
              </Card>
            </div>
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bike className="h-8 w-8 text-orange-500" />
            <div>
              <h1 className="text-xl font-bold text-white">MotoTrack Pro</h1>
              <p className="text-xs text-slate-400">{profile?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {profile?.subscription_status === 'trial' && trialDaysLeft !== null && (
          <Card className="mb-6 border-yellow-500 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-yellow-900">
                    {trialDaysLeft > 0
                      ? `${trialDaysLeft} ${trialDaysLeft === 1 ? 'dia' : 'dias'} restantes no período de teste`
                      : 'Último dia de teste!'}
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">Assine agora e continue aproveitando</p>
                </div>
                <Button onClick={() => navigate('/upgrade')}>Assinar</Button>
              </div>
              {trialDaysLeft !== null && <Progress value={(7 - trialDaysLeft) * (100 / 7)} className="mt-3" />}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {profile?.role === 'piloto' && 'Minhas Motos'}
              {profile?.role === 'mecanico' && 'Motos dos Clientes'}
              {profile?.role === 'admin' && 'Dashboard Admin'}
            </h2>
            <p className="text-slate-400">
              {motos.length} {motos.length === 1 ? 'moto cadastrada' : 'motos cadastradas'}
            </p>
          </div>
          {profile?.role === 'piloto' && (
            <Button onClick={() => navigate('/motos/nova')} className="gap-2">
              <Plus className="h-5 w-5" />
              Nova Moto
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Carregando...</div>
        ) : motos.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="py-12 text-center">
              <Bike className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">
                {profile?.role === 'piloto'
                  ? 'Você ainda não cadastrou nenhuma moto'
                  : 'Nenhuma moto liberada para você'}
              </p>
              {profile?.role === 'piloto' && (
                <Button onClick={() => navigate('/motos/nova')}>Cadastrar Primeira Moto</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {motos.map((moto) => (
              <Card
                key={moto.id}
                className="bg-slate-800 border-slate-700 hover:border-orange-500 transition-all cursor-pointer"
                onClick={() => navigate(`/motos/${moto.id}`)}
              >
                <CardHeader>
                  {moto.foto_url ? (
                    <img src={moto.foto_url} alt={moto.modelo} className="w-full h-48 object-cover rounded-lg mb-4" />
                  ) : (
                    <div className="w-full h-48 bg-slate-700 rounded-lg flex items-center justify-center mb-4">
                      <Bike className="h-16 w-16 text-slate-600" />
                    </div>
                  )}
                  <CardTitle className="text-white">
                    {moto.marca} {moto.modelo}
                  </CardTitle>
                  <CardDescription className="text-slate-400">Ano {moto.ano}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Horímetro</span>
                    <span className="text-orange-500 font-bold">{moto.horimetro}h</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
