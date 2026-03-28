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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  UserPlus,
  X,
  Pencil,
  Trash2,
  Settings,
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

interface RegistroManutencao {
  id: string
  data: string
  horas_moto: number
  pecas_trocadas?: string
  custo?: number
  observacoes?: string
  manutencao_nome?: string
  manutencao_categoria?: string
}

type EventoHistorico =
  | { tipo: 'trilha'; data: string; item: Trilha }
  | { tipo: 'manutencao'; data: string; item: RegistroManutencao }

interface Liberacao {
  id: string
  mecanico_id: string
  valido_ate?: string
  ativo: boolean
  users: {
    name: string
    email: string
  }
}

export default function DetalhesMoto() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { toast } = useToast()

  const [moto, setMoto] = useState<Moto | null>(null)
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [trilhas, setTrilhas] = useState<Trilha[]>([])
  const [liberacoes, setLiberacoes] = useState<Liberacao[]>([])
  const [registrosHistorico, setRegistrosHistorico] = useState<RegistroManutencao[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMotoOpen, setEditMotoOpen] = useState(false)
  const [emailMecanico, setEmailMecanico] = useState('')
  const [validoAte, setValidoAte] = useState('')
  // Campos de edição da moto
  const [editMarca, setEditMarca] = useState('')
  const [editModelo, setEditModelo] = useState('')
  const [editAno, setEditAno] = useState('')
  const [editTipo, setEditTipo] = useState('')
  const [editHorimetro, setEditHorimetro] = useState('')
  const [savingMoto, setSavingMoto] = useState(false)

  useEffect(() => {
    loadMoto()
    loadManutencoes()
    loadTrilhas()
    loadLiberacoes()
    loadHistorico()
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

  const loadHistorico = async () => {
    try {
      const { data, error } = await supabase
        .from('registros_manutencao')
        .select(`
          *,
          manutencoes (
            nome,
            categoria
          )
        `)
        .eq('moto_id', id)
        .order('data', { ascending: false })

      if (error) throw error

      const registros = (data || []).map((r: any) => ({
        ...r,
        manutencao_nome: r.manutencoes?.nome,
        manutencao_categoria: r.manutencoes?.categoria,
      }))

      setRegistrosHistorico(registros)
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    }
  }

  const loadLiberacoes = async () => {
    try {
      const { data: liberacoesData, error } = await supabase
        .from('liberacoes_mecanico')
        .select('id, mecanico_id, valido_ate, ativo')
        .eq('moto_id', id)
        .eq('ativo', true)

      if (error) throw error

      if (!liberacoesData || liberacoesData.length === 0) {
        setLiberacoes([])
        return
      }

      // Buscar dados dos mecânicos usando a função RPC
      const liberacoesComDados = await Promise.all(
        liberacoesData.map(async (lib) => {
          const { data: userData } = await supabase.rpc('buscar_usuario_por_id', {
            user_id: lib.mecanico_id
          })

          const mecanicoInfo = Array.isArray(userData) && userData.length > 0
            ? userData[0]
            : userData

          return {
            ...lib,
            users: mecanicoInfo || { name: 'Mecânico', email: 'Email não disponível' }
          }
        })
      )

      setLiberacoes(liberacoesComDados)
    } catch (error) {
      console.error('Erro ao carregar liberações:', error)
    }
  }

  const liberarMecanico = async () => {
    if (!emailMecanico.trim()) {
      toast({ title: 'Digite o email do mecânico', variant: 'destructive' })
      return
    }

    try {
      // Buscar mecânico pelo email usando RPC para contornar RLS
      const { data: mecanico, error: mecanicoError } = await supabase.rpc('buscar_usuario_por_email', {
        email_busca: emailMecanico.toLowerCase().trim()
      })

      if (mecanicoError) {
        console.error('Erro ao buscar mecânico:', mecanicoError)
        toast({ title: 'Mecânico não encontrado', description: 'Verifique o email digitado', variant: 'destructive' })
        return
      }

      if (!mecanico || mecanico.length === 0) {
        toast({ title: 'Mecânico não encontrado', description: 'Verifique o email digitado', variant: 'destructive' })
        return
      }

      const mecanicoData = Array.isArray(mecanico) ? mecanico[0] : mecanico

      if (mecanicoData.role !== 'mecanico') {
        toast({ title: 'Erro', description: 'Este usuário não é um mecânico', variant: 'destructive' })
        return
      }

      // Criar liberação
      const { error } = await supabase.from('liberacoes_mecanico').insert({
        moto_id: id,
        mecanico_id: mecanicoData.id,
        liberado_por: user?.id,
        valido_ate: validoAte || null,
        ativo: true,
      })

      if (error) throw error

      toast({ title: 'Mecânico liberado com sucesso!' })
      setDialogOpen(false)
      setEmailMecanico('')
      setValidoAte('')
      loadLiberacoes()
    } catch (error: any) {
      console.error('Erro completo:', error)
      toast({ title: 'Erro ao liberar mecânico', description: error.message, variant: 'destructive' })
    }
  }

  const removerLiberacao = async (liberacaoId: string) => {
    try {
      const { error } = await supabase
        .from('liberacoes_mecanico')
        .update({ ativo: false })
        .eq('id', liberacaoId)

      if (error) throw error

      toast({ title: 'Liberação removida com sucesso!' })
      loadLiberacoes()
    } catch (error: any) {
      toast({ title: 'Erro ao remover liberação', description: error.message, variant: 'destructive' })
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

  const abrirEdicaoMoto = () => {
    if (!moto) return
    setEditMarca(moto.marca)
    setEditModelo(moto.modelo)
    setEditAno(moto.ano.toString())
    setEditTipo(moto.tipo)
    setEditHorimetro(moto.horimetro.toString())
    setEditMotoOpen(true)
  }

  const salvarEdicaoMoto = async () => {
    if (!moto) return
    setSavingMoto(true)
    try {
      const { error } = await supabase.from('motos').update({
        marca: editMarca,
        modelo: editModelo,
        ano: parseInt(editAno),
        tipo: editTipo,
        horimetro: parseFloat(editHorimetro),
      }).eq('id', moto.id)
      if (error) throw error
      toast({ title: 'Moto atualizada com sucesso!' })
      setEditMotoOpen(false)
      loadMoto()
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar moto', description: error.message, variant: 'destructive' })
    } finally {
      setSavingMoto(false)
    }
  }

  const excluirMoto = async () => {
    if (!moto) return
    try {
      const { error } = await supabase.from('motos').delete().eq('id', moto.id)
      if (error) throw error
      toast({ title: 'Moto excluída!' })
      navigate('/')
    } catch (error: any) {
      toast({ title: 'Erro ao excluir moto', description: error.message, variant: 'destructive' })
    }
  }

  const excluirTrilha = async (trilhaId: string, horasComputadas: number) => {
    try {
      const { error } = await supabase.from('trilhas').delete().eq('id', trilhaId)
      if (error) throw error
      // Reverter horímetro
      if (moto) {
        const novoHorimetro = Math.max(0, moto.horimetro - horasComputadas)
        await supabase.from('motos').update({ horimetro: novoHorimetro }).eq('id', moto.id)
      }
      toast({ title: 'Trilha excluída!' })
      loadTrilhas()
      loadMoto()
    } catch (error: any) {
      toast({ title: 'Erro ao excluir trilha', description: error.message, variant: 'destructive' })
    }
  }

  const excluirRegistroManutencao = async (registroId: string) => {
    try {
      const { error } = await supabase.from('registros_manutencao').delete().eq('id', registroId)
      if (error) throw error
      toast({ title: 'Registro excluído!' })
      loadManutencoes()
      loadHistorico()
    } catch (error: any) {
      toast({ title: 'Erro ao excluir registro', description: error.message, variant: 'destructive' })
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
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">
              {moto.marca} {moto.modelo}
            </h1>
            <p className="text-xs text-slate-400">
              {moto.tipo} • {moto.ano}
            </p>
          </div>
          {profile?.role === 'piloto' && (
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={abrirEdicaoMoto}>
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-800 border-slate-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Excluir moto?</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400">
                      Todos os dados desta moto (trilhas, manutenções, histórico) serão excluídos permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-slate-600 text-white">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={excluirMoto} className="bg-red-600 hover:bg-red-700">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </nav>

      {/* Modal de Edição da Moto */}
      <Dialog open={editMotoOpen} onOpenChange={setEditMotoOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Moto</DialogTitle>
            <DialogDescription className="text-slate-400">Atualize as informações da sua moto</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-white">Marca</Label>
                <Input value={editMarca} onChange={(e) => setEditMarca(e.target.value)} className="bg-slate-900 border-slate-600 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Modelo</Label>
                <Input value={editModelo} onChange={(e) => setEditModelo(e.target.value)} className="bg-slate-900 border-slate-600 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-white">Ano</Label>
                <Input type="number" value={editAno} onChange={(e) => setEditAno(e.target.value)} className="bg-slate-900 border-slate-600 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Horímetro (h)</Label>
                <Input type="number" step="0.1" value={editHorimetro} onChange={(e) => setEditHorimetro(e.target.value)} className="bg-slate-900 border-slate-600 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Tipo</Label>
              <Select value={editTipo} onValueChange={setEditTipo}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Enduro">Enduro</SelectItem>
                  <SelectItem value="Motocross">Motocross</SelectItem>
                  <SelectItem value="Trail">Trail</SelectItem>
                  <SelectItem value="Trilha">Trilha</SelectItem>
                  <SelectItem value="Cross">Cross</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setEditMotoOpen(false)} className="border-slate-600 text-white">Cancelar</Button>
            <Button onClick={salvarEdicaoMoto} disabled={savingMoto}>
              {savingMoto ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-8">
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Horímetro Atual</p>
                <p className="text-4xl font-bold text-orange-500">{moto.horimetro}h</p>
              </div>
              {profile?.role === 'piloto' && (
                <div className="flex gap-2">
                  <Button onClick={() => navigate(`/motos/${moto.id}/trilha`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Trilha
                  </Button>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Liberar Mecânico
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-800 border-slate-700">
                      <DialogHeader>
                        <DialogTitle className="text-white">Liberar Acesso ao Mecânico</DialogTitle>
                        <DialogDescription className="text-slate-400">
                          Digite o email do mecânico que terá acesso a esta moto
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-white">
                            Email do Mecânico
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="mecanico@exemplo.com"
                            value={emailMecanico}
                            onChange={(e) => setEmailMecanico(e.target.value)}
                            className="bg-slate-900 border-slate-600 text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="valido-ate" className="text-white">
                            Válido até (opcional)
                          </Label>
                          <Input
                            id="valido-ate"
                            type="date"
                            value={validoAte}
                            onChange={(e) => setValidoAte(e.target.value)}
                            className="bg-slate-900 border-slate-600 text-white"
                          />
                          <p className="text-xs text-slate-400">Deixe em branco para acesso permanente</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={liberarMecanico}>Liberar Acesso</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {profile?.role === 'piloto' && liberacoes.length > 0 && (
          <Card className="bg-slate-800 border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-lg">Mecânicos com Acesso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {liberacoes.map((liberacao) => (
                  <div
                    key={liberacao.id}
                    className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-medium">{liberacao.users?.name || 'Mecânico'}</p>
                      <p className="text-xs text-slate-400">{liberacao.users?.email || 'Email não disponível'}</p>
                      {liberacao.valido_ate && (
                        <p className="text-xs text-slate-500 mt-1">
                          Válido até: {format(new Date(liberacao.valido_ate), "dd/MM/yyyy")}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removerLiberacao(liberacao.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                {trilhas.map((trilha) => {
                  const horasComputadas = trilha.tipo_uso === 'pesado'
                    ? trilha.horas_uso * 1.5
                    : trilha.tipo_uso === 'leve'
                    ? trilha.horas_uso * 0.8
                    : trilha.horas_uso
                  return (
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
                          <div className="flex items-center gap-2">
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
                            {profile?.role === 'piloto' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 h-7 w-7">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-800 border-slate-700">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">Excluir trilha?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400">
                                      O horímetro será revertido em {horasComputadas.toFixed(1)}h.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="border-slate-600 text-white">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => excluirTrilha(trilha.id, horasComputadas)} className="bg-red-600 hover:bg-red-700">
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                        {trilha.observacoes && <p className="text-sm text-slate-400 mt-2">{trilha.observacoes}</p>}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="historico">
            {registrosHistorico.length === 0 && trilhas.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center">
                  <History className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Nenhuma atividade registrada ainda</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Registre trilhas e manutenções para ver o histórico aqui
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Combinar e ordenar por data */}
                {[
                  ...trilhas.map((t) => ({ tipo: 'trilha' as const, data: t.data, item: t })),
                  ...registrosHistorico.map((r) => ({ tipo: 'manutencao' as const, data: r.data, item: r })),
                ]
                  .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                  .map((evento) => {
                    if (evento.tipo === 'trilha') {
                      const trilha = evento.item as Trilha
                      return (
                        <Card key={`trilha-${trilha.id}`} className="bg-slate-800 border-slate-700 border-l-4 border-l-orange-500">
                          <CardContent className="py-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                  <MapPin className="h-4 w-4 text-orange-500" />
                                </div>
                                <div>
                                  <p className="text-white font-medium">
                                    {trilha.local || 'Trilha registrada'}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {format(new Date(trilha.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                  </p>
                                  {trilha.observacoes && (
                                    <p className="text-xs text-slate-500 mt-1">{trilha.observacoes}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end gap-1">
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
                                <span className="text-xs text-slate-400">{trilha.horas_uso}h de uso</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    } else {
                      const registro = evento.item as RegistroManutencao
                      return (
                        <Card key={`manutencao-${registro.id}`} className="bg-slate-800 border-slate-700 border-l-4 border-l-blue-500">
                          <CardContent className="py-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                  <Wrench className="h-4 w-4 text-blue-400" />
                                </div>
                                <div>
                                  <p className="text-white font-medium">
                                    {registro.manutencao_nome || 'Manutenção'}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {format(new Date(registro.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                    {registro.horas_moto ? ` • ${registro.horas_moto}h` : ''}
                                  </p>
                                  {registro.pecas_trocadas && (
                                    <p className="text-xs text-slate-500 mt-1">
                                      Peças: {registro.pecas_trocadas}
                                    </p>
                                  )}
                                  {registro.observacoes && (
                                    <p className="text-xs text-slate-500 mt-1">{registro.observacoes}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end gap-1">
                                {registro.manutencao_categoria && (
                                  <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                                    {registro.manutencao_categoria}
                                  </Badge>
                                )}
                                {registro.custo != null && registro.custo > 0 && (
                                  <span className="text-xs text-green-400 font-medium">
                                    R$ {registro.custo.toFixed(2)}
                                  </span>
                                )}
                                {profile?.role === 'piloto' && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 h-6 w-6">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-slate-800 border-slate-700">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-white">Excluir registro?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-400">
                                          Este registro de manutenção será excluído permanentemente.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="border-slate-600 text-white">Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => excluirRegistroManutencao(registro.id)} className="bg-red-600 hover:bg-red-700">
                                          Excluir
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    }
                  })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
