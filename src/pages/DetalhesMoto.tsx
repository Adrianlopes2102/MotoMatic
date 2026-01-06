import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft,
  Bike,
  Clock,
  Wrench,
  History,
  Plus,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  MapPin,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Moto {
  id: string
  marca: string
  modelo: string
  ano: number
  tipo: string
  horimetro: number
  foto_url?: string
  user_id: string
}

interface Manutencao {
  id: string
  nome: string
  categoria: string
  intervalo_horas?: number
  intervalo_dias?: number
  tipo_uso: string
  ultimo_registro?: {
    data: string
    horas_moto: number
  }
}

interface Trilha {
  id: string
  data: string
  horas_uso: number
  tipo_uso: string
  local?: string
  observacoes?: string
}

export default function DetalhesMoto() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { toast } = useToast()

  const [moto, setMoto] = useState<Moto | null>(null)
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [trilhas, setTrilhas] = useState<Trilha[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMoto()
    loadManutencoes()
    loadTrilhas()
  }, [id])

  const loadMoto = async () => {
    try {
      const { data, error } = await supabase.from('motos').select('*').eq('id', id).single()

      if (error) throw error
      setMoto(data)
    } catch (error) {
      toast({ title: 'Erro ao carregar moto', variant: 'destructive' })
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const loadManutencoes = async () => {
    try {
      const { data, error } = await supabase
        .from('manutencoes')
        .select(
          `
          *,
          registros_manutencao (
            data,
            horas_moto
          )
        `
        )
        .eq('moto_id', id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const manutencoesComUltimoRegistro = data?.map((m: any) => ({
        ...m,
        ultimo_registro:
          m.registros_manutencao && m.registros_manutencao.length > 0 ? m.registros_manutencao[0] : null,
      }))

      setManutencoes(manutencoesComUltimoRegistro || [])
    } catch (error) {
      console.error('Erro ao carregar manutenções:', error)
    }
  }

  const loadTrilhas = async () => {
    try {
      const { data, error } = await supabase
        .from('trilhas')
        .select('*')
        .eq('moto_id', id)
        .order('data', { ascending: false })
        .limit(10)

      if (error) throw error
      setTrilhas(data || [])
    } catch (error) {
      console.error('Erro ao carregar trilhas:', error)
    }
  }

  const getStatusManutencao = (manutencao: Manutencao, horimetroAtual: number) => {
    if (!manutencao.ultimo_registro) {
      return { status: 'atrasada', color: 'red', icon: AlertCircle, text: 'Nunca feita' }
    }

    if (manutencao.intervalo_horas) {
      const horasDesdeUltima = horimetroAtual - manutencao.ultimo_registro.horas_moto
      const porcentagem = (horasDesdeUltima / manutencao.intervalo_horas) * 100

      if (porcentagem >= 100) {
        return { status: 'atrasada', color: 'red', icon: AlertCircle, text: 'Atrasada', porcentagem: 100 }
      } else if (porcentagem >= 80) {
        return { status: 'proxima', color: 'yellow', icon: AlertTriangle, text: 'Próxima', porcentagem }
      } else {
        return { status: 'ok', color: 'green', icon: CheckCircle, text: 'Em dia', porcentagem }
      }
    }

    return { status: 'ok', color: 'green', icon: CheckCircle, text: 'Em dia', porcentagem: 0 }
  }

  const criarManutencoesIniciais = async () => {
    if (!moto) return

    const manutencoesIniciais = [
      { nome: 'Troca de Óleo Motor', categoria: 'Motor', intervalo_horas: 15, tipo_uso: 'medio' },
      { nome: 'Troca de Filtro de Óleo', categoria: 'Motor', intervalo_horas: 15, tipo_uso: 'medio' },
      { nome: 'Troca de Filtro de Ar', categoria: 'Motor', intervalo_horas: 10, tipo_uso: 'medio' },
      { nome: 'Regulagem de Válvulas', categoria: 'Motor', intervalo_horas: 30, tipo_uso: 'medio' },
      { nome: 'Troca de Óleo da Transmissão', categoria: 'Transmissão', intervalo_horas: 20, tipo_uso: 'medio' },
      { nome: 'Troca da Relação (Coroa/Pinhão)', categoria: 'Transmissão', intervalo_horas: 40, tipo_uso: 'medio' },
      { nome: 'Revisão Suspensão Dianteira', categoria: 'Suspensão', intervalo_horas: 50, tipo_uso: 'medio' },
      { nome: 'Revisão Suspensão Traseira', categoria: 'Suspensão', intervalo_horas: 50, tipo_uso: 'medio' },
      { nome: 'Pastilhas de Freio Dianteiro', categoria: 'Freios', intervalo_horas: 35, tipo_uso: 'medio' },
      { nome: 'Pastilhas de Freio Traseiro', categoria: 'Freios', intervalo_horas: 35, tipo_uso: 'medio' },
      { nome: 'Troca de Fluido de Freio', categoria: 'Freios', intervalo_dias: 180, tipo_uso: 'medio' },
      { nome: 'Rolamentos de Direção', categoria: 'Chassi', intervalo_horas: 60, tipo_uso: 'medio' },
      { nome: 'Rolamentos de Roda', categoria: 'Chassi', intervalo_horas: 60, tipo_uso: 'medio' },
      { nome: 'Lubrificação da Corrente', categoria: 'Transmissão', intervalo_horas: 5, tipo_uso: 'medio' },
    ]

    try {
      const { error } = await supabase.from('manutencoes').insert(
        manutencoesIniciais.map((m) => ({
          ...m,
          moto_id: moto.id,
        }))
      )

      if (error) throw error
      toast({ title: 'Manutenções criadas com sucesso!' })
      loadManutencoes()
    } catch (error: any) {
      toast({ title: 'Erro ao criar manutenções', description: error.message, variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-white">Carregando...</p>
      </div>
    )
  }

  if (!moto) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Bike className="h-8 w-8 text-orange-500" />
          <div>
            <h1 className="text-xl font-bold text-white">
              {moto.marca} {moto.modelo}
            </h1>
            <p className="text-xs text-slate-400">
              {moto.tipo} • {moto.ano}
            </p>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Horímetro Atual</p>
                <p className="text-4xl font-bold text-orange-500">{moto.horimetro}h</p>
              </div>
              {profile?.role === 'piloto' && (
                <Button onClick={() => navigate(`/motos/${moto.id}/trilha`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Trilha
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="manutencoes" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800">
            <TabsTrigger value="manutencoes">Manutenções</TabsTrigger>
            <TabsTrigger value="trilhas">Trilhas</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="manutencoes" className="space-y-4">
            {manutencoes.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center">
                  <Wrench className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-4">Nenhuma manutenção cadastrada</p>
                  <Button onClick={criarManutencoesIniciais}>Criar Manutenções Padrão</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {['Motor', 'Transmissão', 'Suspensão', 'Freios', 'Chassi'].map((categoria) => {
                  const manutencoesCategoria = manutencoes.filter((m) => m.categoria === categoria)
                  if (manutencoesCategoria.length === 0) return null

                  return (
                    <div key={categoria}>
                      <h3 className="text-white font-semibold mb-2">{categoria}</h3>
                      <div className="space-y-2">
                        {manutencoesCategoria.map((manutencao) => {
                          const status = getStatusManutencao(manutencao, moto.horimetro)
                          const Icon = status.icon

                          return (
                            <Card
                              key={manutencao.id}
                              className="bg-slate-800 border-slate-700 hover:border-orange-500 transition-all cursor-pointer"
                              onClick={() => navigate(`/motos/${moto.id}/manutencao/${manutencao.id}`)}
                            >
                              <CardContent className="py-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <Icon
                                      className={`h-5 w-5 ${
                                        status.color === 'green'
                                          ? 'text-green-500'
                                          : status.color === 'yellow'
                                          ? 'text-yellow-500'
                                          : 'text-red-500'
                                      }`}
                                    />
                                    <div>
                                      <p className="text-white font-medium">{manutencao.nome}</p>
                                      <p className="text-xs text-slate-400">
                                        A cada {manutencao.intervalo_horas}h
                                      </p>
                                    </div>
                                  </div>
                                  <Badge
                                    variant={
                                      status.color === 'green'
                                        ? 'default'
                                        : status.color === 'yellow'
                                        ? 'secondary'
                                        : 'destructive'
                                    }
                                  >
                                    {status.text}
                                  </Badge>
                                </div>
                                {status.porcentagem !== undefined && (
                                  <Progress value={status.porcentagem} className="h-2" />
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="trilhas" className="space-y-4">
            {trilhas.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center">
                  <MapPin className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-4">Nenhuma trilha registrada</p>
                  {profile?.role === 'piloto' && (
                    <Button onClick={() => navigate(`/motos/${moto.id}/trilha`)}>Registrar Primeira Trilha</Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {trilhas.map((trilha) => (
                  <Card key={trilha.id} className="bg-slate-800 border-slate-700">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">
                            {trilha.local || 'Trilha'} • {trilha.horas_uso}h
                          </p>
                          <p className="text-xs text-slate-400">
                            {format(new Date(trilha.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge
                          variant={
                            trilha.tipo_uso === 'leve'
                              ? 'default'
                              : trilha.tipo_uso === 'medio'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {trilha.tipo_uso}
                        </Badge>
                      </div>
                      {trilha.observacoes && <p className="text-sm text-slate-400 mt-2">{trilha.observacoes}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="historico">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="py-12 text-center">
                <History className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Histórico completo em breve</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
