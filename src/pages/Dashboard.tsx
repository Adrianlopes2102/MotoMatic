import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Bike, Plus, LogOut, User, Clock3 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
  const [profileTimeout, setProfileTimeout] = useState(false)

  // Timeout de segurança: se o profile não carregar em 8s, mostra erro
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!profile) setProfileTimeout(true)
    }, 8000)

    return () => clearTimeout(timer)
  }, [profile])

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    if (profile?.subscription_status === 'trial' && profile.trial_ends_at) {
      const trialEnd = new Date(profile.trial_ends_at)
      const now = new Date()
      const daysLeft = Math.ceil(
        (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      setTrialDaysLeft(daysLeft > 0 ? daysLeft : 0)
    } else {
      setTrialDaysLeft(null)
    }

    // Só carrega depois que temos usuário + perfil.
    if (profile?.role) {
      loadMotos()
    }
  }, [user, profile, navigate])

  const loadMotos = async () => {
    if (!user || !profile?.role) return

    setLoading(true)

    try {
      if (profile.role === 'piloto') {
        // Piloto vê suas próprias motos.
        const { data, error } = await supabase
          .from('motos')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        setMotos(data || [])
        return
      }

      if (profile.role === 'mecanico') {
        // A RPC existente no Supabase usa o parâmetro p_mecanico_id.
        const { data, error } = await supabase.rpc(
          'get_motos_liberadas_mecanico',
          {
            p_mecanico_id: user.id,
          }
        )

        if (error) {
          console.error('Erro ao buscar motos liberadas:', error)
          setMotos([])
          return
        }

        /*
         * A RPC retorna moto_id, e o Dashboard trabalha com id.
         * Normalizamos aqui para que o clique da moto navegue usando
         * o ID real da tabela motos.
         */
        const motosNormalizadas: Moto[] = (data || [])
          .map((moto: any) => ({
            id: moto.moto_id || moto.id,
            marca: moto.marca,
            modelo: moto.modelo,
            ano: Number(moto.ano),
            horimetro: Number(moto.horimetro || 0),
            foto_url: moto.foto_url || undefined,
          }))
          .filter((moto: Moto) => Boolean(moto.id))

        setMotos(motosNormalizadas)
        return
      }

      // Admin: mantém a lista vazia neste Dashboard.
      setMotos([])
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

  // Aguarda o profile carregar antes de verificar a assinatura.
  if (!profile) {
    if (profileTimeout) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-white text-lg mb-2">
              Erro ao carregar perfil
            </p>
            <p className="text-slate-400 text-sm mb-6">
              Verifique sua conexão e tente novamente
            </p>
            <Button onClick={() => window.location.reload()}>
              Recarregar
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-white">Carregando...</p>
      </div>
    )
  }

  if (!isSubscriptionActive() && profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-yellow-500 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Período de Teste Expirado</CardTitle>
            <CardDescription>
              Assine um plano para continuar usando o MotoTrack Pro
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-3">
              {profile.role === 'piloto' && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Pro Piloto</CardTitle>
                    <CardDescription>R$ 19,90/mês</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1">
                      <li>✓ Motos ilimitadas</li>
                      <li>✓ Controle de horímetro</li>
                      <li>✓ Sistema de manutenção</li>
                      <li>✓ Notificações</li>
                    </ul>

                    <Button
                      className="w-full mt-4"
                      onClick={() => navigate('/upgrade')}
                    >
                      Assinar Agora
                    </Button>
                  </CardContent>
                </Card>
              )}

              {profile.role === 'mecanico' && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Oficina/Mecânico
                    </CardTitle>
                    <CardDescription>R$ 39,90/mês</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <ul className="text-sm space-y-1">
                      <li>✓ Tudo do Pro Piloto</li>
                      <li>✓ Acesso a motos de clientes</li>
                      <li>✓ Registro de serviços</li>
                      <li>✓ Histórico técnico</li>
                    </ul>

                    <Button
                      className="w-full mt-4"
                      onClick={() => navigate('/upgrade')}
                    >
                      Assinar Agora
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
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
              <h1 className="text-xl font-bold text-white">
                MotoTrack Pro
              </h1>
              <p className="text-xs text-slate-400">
                {profile.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white"
              onClick={() => navigate('/perfil')}
            >
              <User className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-white"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {profile.subscription_status === 'trial' &&
          trialDaysLeft !== null && (
            <Card className="mb-6 overflow-hidden border-orange-500/60 bg-gradient-to-r from-slate-800 via-slate-800 to-slate-900 shadow-lg shadow-orange-500/10">
              <CardContent className="p-0">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600" />

                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10">
                          <Clock3 className="h-6 w-6 text-orange-500" />
                        </div>

                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                              Período de teste
                            </p>

                            <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-300">
                              ATIVO
                            </span>
                          </div>

                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-3xl font-extrabold tracking-tight text-white">
                              {trialDaysLeft > 0 ? trialDaysLeft : 1}
                            </span>

                            <span className="text-lg font-semibold text-slate-200">
                              {trialDaysLeft === 1
                                ? 'dia restante'
                                : 'dias restantes'}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-slate-400">
                            Aproveite todos os recursos do MotoTrack Pro
                            durante o seu teste.
                          </p>
                        </div>
                      </div>

                      <Button
                        onClick={() => navigate('/upgrade')}
                        className="w-full gap-2 bg-orange-500 font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 sm:w-auto"
                      >
                        Assinar agora
                        <span aria-hidden="true">→</span>
                      </Button>
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          Progresso do teste
                        </span>

                        <span className="font-semibold text-orange-400">
                          {Math.min(
                            100,
                            Math.max(
                              0,
                              ((7 - trialDaysLeft) / 7) * 100
                            )
                          ).toFixed(0)}
                          %
                        </span>
                      </div>

                      <Progress
                        value={Math.min(
                          100,
                          Math.max(
                            0,
                            ((7 - trialDaysLeft) / 7) * 100
                          )
                        )}
                        className="h-2 bg-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {profile.role === 'piloto' && 'Minhas Motos'}
              {profile.role === 'mecanico' && 'Motos dos Clientes'}
              {profile.role === 'admin' && 'Dashboard Admin'}
            </h2>

            <p className="text-slate-400">
              {motos.length}{' '}
              {motos.length === 1
                ? 'moto cadastrada'
                : 'motos cadastradas'}
            </p>
          </div>

          {profile.role === 'piloto' && (
            <Button
              onClick={() => navigate('/motos/nova')}
              className="gap-2"
            >
              <Plus className="h-5 w-5" />
              Nova Moto
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">
            Carregando...
          </div>
        ) : motos.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="py-12 text-center">
              <Bike className="h-16 w-16 text-slate-600 mx-auto mb-4" />

              <p className="text-slate-400 mb-4">
                {profile.role === 'piloto'
                  ? 'Você ainda não cadastrou nenhuma moto'
                  : 'Nenhuma moto liberada para você'}
              </p>

              {profile.role === 'piloto' && (
                <Button
                  onClick={() => navigate('/motos/nova')}
                >
                  Cadastrar Primeira Moto
                </Button>
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
                    <img
                      src={moto.foto_url}
                      alt={moto.modelo}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div className="w-full h-48 bg-slate-700 rounded-lg flex items-center justify-center mb-4">
                      <Bike className="h-16 w-16 text-slate-600" />
                    </div>
                  )}

                  <CardTitle className="text-white">
                    {moto.marca} {moto.modelo}
                  </CardTitle>

                  <CardDescription className="text-slate-400">
                    Ano {moto.ano}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      Horímetro
                    </span>

                    <span className="text-orange-500 font-bold">
                      {moto.horimetro}h
                    </span>
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
