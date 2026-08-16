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
import {
  ArrowLeft,
  Wrench,
  History,
  Clock,
  DollarSign,
  CheckCircle,
  Trash2,
} from 'lucide-react'
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
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Define o comportamento de acordo com o tipo de usuário.
  const isMecanico = profile?.role === 'mecanico'
  const isPiloto = profile?.role === 'piloto'

  useEffect(() => {
    loadData()
  }, [motoId, manutencaoId, profile?.role])

  const loadData = async () => {
    if (!motoId || !manutencaoId) return

    try {
      /*
       * MECÂNICO:
       * A moto foi liberada pelo piloto, mas o SELECT direto em `motos`
       * pode ser bloqueado pelo RLS porque a moto pertence ao piloto.
       * Por isso, usamos a mesma RPC utilizada pelo Dashboard/DetalhesMoto
       * para obter somente as motos liberadas para o mecânico autenticado.
       *
       * PILOTO:
       * Continua usando o SELECT normal da própria moto.
       */
      let motoCarregada: any = null

      if (isMecanico && user?.id) {
        // O mecânico só pode abrir a moto se existir uma liberação ativa.
        // Buscamos a própria moto pela liberação para evitar depender
        // de uma RPC diferente do esquema atual.
        const { data: liberacao, error: liberacaoError } = await supabase
          .from('liberacoes_mecanico')
          .select('moto_id')
          .eq('moto_id', motoId)
          .eq('mecanico_id', user.id)
          .eq('ativo', true)
          .maybeSingle()

        if (liberacaoError) throw liberacaoError

        if (!liberacao) {
          throw new Error(
            'Esta moto não está liberada para este mecânico ou a liberação não está mais ativa.'
          )
        }

        // A política de SELECT de motos do mecânico deve permitir esta
        // moto liberada. Se não permitir, o próximo passo será ajustar
        // somente essa política no Supabase.
        const { data, error } = await supabase
          .from('motos')
          .select('*')
          .eq('id', motoId)
          .single()

        if (error) throw error

        motoCarregada = data
      } else {
        const { data, error } = await supabase
          .from('motos')
          .select('*')
          .eq('id', motoId)
          .single()

        if (error) throw error
        motoCarregada = data
      }

      // A manutenção também precisa pertencer à moto aberta.
      const { data: manutencaoData, error: manutencaoError } = await supabase
        .from('manutencoes')
        .select('*')
        .eq('id', manutencaoId)
        .eq('moto_id', motoId)
        .single()

      if (manutencaoError) throw manutencaoError

      setMoto(motoCarregada)
      setManutencao(manutencaoData)
      setHorasMoto(motoCarregada.horimetro?.toString() || '')

      // MECÂNICO:
      // Não busca o histórico de manutenções.
      //
      // PILOTO:
      // Continua podendo visualizar o histórico.
      if (profile?.role === 'piloto') {
        const { data: registrosData, error: registrosError } = await supabase
          .from('registros_manutencao')
          .select('*')
          .eq('manutencao_id', manutencaoId)
          .order('data', { ascending: false })
          .limit(5)

        if (registrosError) throw registrosError

        setRegistros(registrosData || [])
      } else {
        setRegistros([])
      }
    } catch (error) {
      console.error('Erro ao carregar dados da manutenção:', error)

      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar a manutenção.',
        variant: 'destructive',
      })

      navigate('/')
    }
  }

  const handleDeleteRegistro = async (registroId: string) => {
    if (!registroId) return

    const confirmar = window.confirm(
      'Tem certeza que deseja excluir esta manutenção do histórico? Esta ação não pode ser desfeita.'
    )

    if (!confirmar) return

    setDeletingId(registroId)

    try {
      const { error } = await supabase
        .from('registros_manutencao')
        .delete()
        .eq('id', registroId)
        .eq('manutencao_id', manutencaoId)

      if (error) throw error

      setRegistros((registrosAtuais) =>
        registrosAtuais.filter((registro) => registro.id !== registroId)
      )

      toast({
        title: 'Manutenção excluída',
        description: 'O registro foi removido do histórico com sucesso.',
      })
    } catch (error: any) {
      console.error('Erro ao excluir manutenção:', error)

      toast({
        title: 'Erro ao excluir manutenção',
        description:
          error.message ||
          'Não foi possível excluir esta manutenção. Verifique as permissões do banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.id) {
      toast({
        title: 'Usuário não identificado',
        description: 'Faça login novamente para continuar.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const horas = parseFloat(horasMoto)

      if (isNaN(horas)) {
        throw new Error('Informe um valor válido para as horas da moto.')
      }

      const valorCusto = custo.trim()
        ? parseFloat(custo.replace(',', '.'))
        : null

      if (valorCusto !== null && isNaN(valorCusto)) {
        throw new Error('Informe um valor válido para o custo.')
      }

      const { error } = await supabase
        .from('registros_manutencao')
        .insert({
          manutencao_id: manutencaoId,
          moto_id: motoId,
          realizado_por: user.id,
          data,
          horas_moto: horas,
          observacoes,
          pecas_trocadas: pecasTrocadas,
          custo: valorCusto,
        })

      if (error) throw error

      toast({
        title: 'Manutenção registrada!',
        description: isMecanico
          ? 'A manutenção foi registrada e o piloto poderá visualizar o custo.'
          : 'O histórico foi atualizado com sucesso.',
      })

      navigate(`/motos/${motoId}`)
    } catch (error: any) {
      toast({
        title: 'Erro ao registrar manutenção',
        description: error.message || 'Não foi possível registrar a manutenção.',
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
          <Button
            variant="ghost"
            size="icon"
            className="text-white"
            onClick={() => navigate(`/motos/${motoId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <Wrench className="h-8 w-8 text-orange-500" />

          <div>
            <h1 className="text-xl font-bold text-white">
              Registrar Manutenção
            </h1>

            <p className="text-xs text-slate-400">
              {manutencao.nome}
            </p>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-2xl">

        {/* INFORMAÇÕES DA MOTO */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-center">

              <div>
                <p className="text-slate-400 text-sm">
                  Moto
                </p>

                <p className="text-lg font-bold text-white">
                  {moto.marca} {moto.modelo}
                </p>
              </div>

              <div>
                <p className="text-slate-400 text-sm">
                  Horímetro
                </p>

                <p className="text-lg font-bold text-orange-500">
                  {moto.horimetro}h
                </p>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* MANUTENÇÃO */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">
              {manutencao.nome}
            </CardTitle>

            <CardDescription className="text-slate-400">
              Categoria: {manutencao.categoria} • A cada{' '}
              {manutencao.intervalo_horas}h
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* DATA + HORÍMETRO */}
              <div className="grid grid-cols-2 gap-4">

                <div className="space-y-2">
                  <Label
                    htmlFor="data"
                    className="text-white"
                  >
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
                  <Label
                    htmlFor="horas"
                    className="text-white"
                  >
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

              {/* PEÇAS */}
              <div className="space-y-2">
                <Label
                  htmlFor="pecas"
                  className="text-white"
                >
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

              {/* CUSTO */}
              <div className="space-y-2">
                <Label
                  htmlFor="custo"
                  className="text-white"
                >
                  Custo da Manutenção
                </Label>

                <Input
                  id="custo"
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 250,00"
                  value={custo}
                  onChange={(e) => setCusto(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />

                {isMecanico && (
                  <p className="text-xs text-slate-400">
                    O valor informado aqui ficará disponível para o piloto.
                  </p>
                )}
              </div>

              {/* OBSERVAÇÕES */}
              <div className="space-y-2">
                <Label
                  htmlFor="observacoes"
                  className="text-white"
                >
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

              {/* REALIZADO POR */}
              <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-4">
                <p className="text-sm text-white font-semibold">
                  Realizado por
                </p>

                <p className="text-xs text-slate-300 mt-1">
                  {profile?.name || 'Usuário'} (
                  {isPiloto ? 'Piloto' : 'Mecânico'}
                  )
                </p>
              </div>

              {/* BOTÕES */}
              <div className="flex gap-3 pt-4">

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/motos/${motoId}`)}
                  className="flex-1"
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading
                    ? 'Registrando...'
                    : 'Registrar Manutenção'}
                </Button>

              </div>

            </form>
          </CardContent>
        </Card>

        {/* =====================================================
            HISTÓRICO
            SOMENTE O PILOTO VÊ
           ===================================================== */}
        {isPiloto && registros.length > 0 && (
          <Card className="bg-slate-800 border-slate-700 mt-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-orange-500" />

                <CardTitle className="text-white">
                  Histórico de Manutenções
                </CardTitle>
              </div>

              <CardDescription className="text-slate-400">
                Últimas {registros.length} manutenções realizadas
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">

              {registros.map((registro, index) => (
                <div key={registro.id}>

                  {index > 0 && (
                    <Separator className="my-4 bg-slate-700" />
                  )}

                  <div className="space-y-3">

                    <div className="flex items-start justify-between">

                      <div className="flex items-center gap-2">

                        <CheckCircle className="h-5 w-5 text-green-500" />

                        <div>

                          <p className="text-white font-medium">
                            {format(
                              new Date(registro.data),
                              "dd 'de' MMMM 'de' yyyy",
                              { locale: ptBR }
                            )}
                          </p>

                          <p className="text-xs text-slate-400">
                            {registro.horas_moto}h no horímetro
                          </p>

                        </div>

                      </div>

                      <div className="flex items-center gap-2">
                        {registro.custo !== null &&
                          registro.custo !== undefined && (
                            <Badge
                              variant="secondary"
                              className="gap-1"
                            >
                              <DollarSign className="h-3 w-3" />

                              R${' '}
                              {Number(registro.custo).toFixed(2)}
                            </Badge>
                          )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Excluir manutenção"
                          aria-label="Excluir manutenção"
                          onClick={() => handleDeleteRegistro(registro.id)}
                          disabled={deletingId === registro.id}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                    </div>

                    {registro.pecas_trocadas && (
                      <div className="bg-slate-900 rounded-lg p-3">

                        <p className="text-xs text-slate-400 mb-1">
                          Peças Trocadas
                        </p>

                        <p className="text-sm text-white">
                          {registro.pecas_trocadas}
                        </p>

                      </div>
                    )}

                    {registro.observacoes && (
                      <div className="bg-slate-900 rounded-lg p-3">

                        <p className="text-xs text-slate-400 mb-1">
                          Observações
                        </p>

                        <p className="text-sm text-slate-300">
                          {registro.observacoes}
                        </p>

                      </div>
                    )}

                  </div>
                </div>
              ))}

            </CardContent>
          </Card>
        )}

        {/* =====================================================
            PRÓXIMA MANUTENÇÃO
            MECÂNICO E PILOTO PODEM VER
           ===================================================== */}
        {manutencao?.intervalo_horas && (
          <Card className="bg-slate-800 border-orange-700 mt-6">
            <CardContent className="pt-6">

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>

                <div className="flex-1">

                  <p className="text-white font-semibold mb-1">
                    Próxima Manutenção
                  </p>

                  <p className="text-sm text-slate-300">
                    Recomendada em{' '}

                    <span className="text-orange-400 font-bold">
                      {parseFloat(horasMoto) +
                        manutencao.intervalo_horas}
                      h
                    </span>
                  </p>

                  <p className="text-xs text-slate-400 mt-1">
                    Faltam aproximadamente{' '}

                    <span className="text-slate-300 font-medium">
                      {manutencao.intervalo_horas}h
                    </span>{' '}
                    de uso
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