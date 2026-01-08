import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Wrench, History, Calendar, Clock, DollarSign, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function RegistrarManutencao() {
  const { id: motoId, manutencaoId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { toast } = useToast()

  const [moto, setMoto] = useState<any>(null)
  const [manutencao, setManutencao] = useState<any>(null)
  const [registros, setRegistros] = useState<any[]>([])
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [horasMoto, setHorasMoto] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [pecasTrocadas, setPecasTrocadas] = useState('')
  const [custo, setCusto] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [motoId, manutencaoId])

  const loadData = async () => {
    try {
      const [motoData, manutencaoData, registrosData] = await Promise.all([
        supabase.from('motos').select('*').eq('id', motoId).single(),
        supabase.from('manutencoes').select('*').eq('id', manutencaoId).single(),
        supabase
          .from('registros_manutencao')
          .select('*, users(name)')
          .eq('manutencao_id', manutencaoId)
          .order('data', { ascending: false })
          .limit(5),
      ])

      if (motoData.error) throw motoData.error
      if (manutencaoData.error) throw manutencaoData.error

      setMoto(motoData.data)
      setManutencao(manutencaoData.data)
      setRegistros(registrosData.data || [])
      setHorasMoto(motoData.data.horimetro.toString())
    } catch (error) {
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' })
      navigate('/')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from('registros_manutencao').insert({
        manutencao_id: manutencaoId,
        moto_id: motoId,
        realizado_por: user!.id,
        data,
        horas_moto: parseFloat(horasMoto),
        observacoes,
        pecas_trocadas: pecasTrocadas,
        custo: custo ? parseFloat(custo) : null,
      })

      if (error) throw error

      toast({
        title: 'Manutenção registrada!',
        description: 'O histórico foi atualizado com sucesso',
      })
      navigate(`/motos/${motoId}`)
    } catch (error: any) {
      toast({
        title: 'Erro ao registrar manutenção',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!moto || !manutencao) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-white">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => navigate(`/motos/${motoId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Wrench className="h-8 w-8 text-orange-500" />
          <div>
            <h1 className="text-xl font-bold text-white">Registrar Manutenção</h1>
            <p className="text-xs text-slate-400">{manutencao.nome}</p>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-slate-400 text-sm">Moto</p>
                <p className="text-lg font-bold text-white">
                  {moto.marca} {moto.modelo}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Horímetro</p>
                <p className="text-lg font-bold text-orange-500">{moto.horimetro}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">{manutencao.nome}</CardTitle>
            <CardDescription className="text-slate-400">
              Categoria: {manutencao.categoria} • A cada {manutencao.intervalo_horas}h
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data" className="text-white">
                    Data da Manutenção
                  </Label>
                  <Input
                    id="data"
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    required
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horas" className="text-white">
                    Horas da Moto
                  </Label>
                  <Input
                    id="horas"
                    type="number"
                    value={horasMoto}
                    onChange={(e) => setHorasMoto(e.target.value)}
                    required
                    min="0"
                    step="0.1"
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pecas" className="text-white">
                  Peças Trocadas
                </Label>
                <Input
                  id="pecas"
                  placeholder="Ex: Óleo Motul 10W40, Filtro K&N"
                  value={pecasTrocadas}
                  onChange={(e) => setPecasTrocadas(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custo" className="text-white">
                  Custo (opcional)
                </Label>
                <Input
                  id="custo"
                  type="number"
                  placeholder="0.00"
                  value={custo}
                  onChange={(e) => setCusto(e.target.value)}
                  min="0"
                  step="0.01"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes" className="text-white">
                  Observações
                </Label>
                <Textarea
                  id="observacoes"
                  placeholder="Detalhes da manutenção, condições encontradas, próximos cuidados..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                  rows={5}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium">Realizado por</p>
                <p className="text-xs text-blue-600 mt-1">
                  {profile?.name} ({profile?.role === 'piloto' ? 'Piloto' : 'Mecânico'})
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(`/motos/${motoId}`)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Registrando...' : 'Registrar Manutenção'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {registros.length > 0 && (
          <Card className="bg-slate-800 border-slate-700 mt-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-white">Histórico de Manutenções</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Últimas {registros.length} manutenções realizadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {registros.map((registro, index) => (
                <div key={registro.id}>
                  {index > 0 && <Separator className="my-4 bg-slate-700" />}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-white font-medium">
                            {format(new Date(registro.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-slate-400">
                            {registro.horas_moto}h no horímetro
                          </p>
                        </div>
                      </div>
                      {registro.custo && (
                        <Badge variant="secondary" className="gap-1">
                          <DollarSign className="h-3 w-3" />
                          R$ {registro.custo.toFixed(2)}
                        </Badge>
                      )}
                    </div>

                    {registro.pecas_trocadas && (
                      <div className="bg-slate-900 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-1">Peças Trocadas</p>
                        <p className="text-sm text-white">{registro.pecas_trocadas}</p>
                      </div>
                    )}

                    {registro.observacoes && (
                      <div className="bg-slate-900 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-1">Observações</p>
                        <p className="text-sm text-slate-300">{registro.observacoes}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>Realizado por: {registro.users?.name || 'Desconhecido'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {manutencao?.intervalo_horas && (
          <Card className="bg-gradient-to-br from-orange-900/20 to-yellow-900/20 border-orange-700 mt-6">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-orange-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-white font-medium mb-1">Próxima Manutenção</p>
                  <p className="text-sm text-slate-300">
                    Recomendada em <span className="text-orange-500 font-bold">
                      {parseFloat(horasMoto) + manutencao.intervalo_horas}h
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Faltam aproximadamente {manutencao.intervalo_horas}h de uso
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
