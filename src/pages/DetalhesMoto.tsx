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
  Camera,
  Upload,
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
  horimetro_inicio?: number
  horimetro_atual?: number
  horas_acumuladas?: number
  horas_restantes?: number
  porcentagem?: number
  vencida?: boolean
  nunca_feita?: boolean
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
  realizado_por?: string
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
  const [uploadingFoto, setUploadingFoto] = useState(false)
  // Estados para adicionar manutenção
  const [addManutencaoOpen, setAddManutencaoOpen] = useState(false)
  const [novoManutNome, setNovoManutNome] = useState('')
  const [novoManutCategoria, setNovoManutCategoria] = useState('Motor')
  const [novoManutIntervaloHoras, setNovoManutIntervaloHoras] = useState('')
  const [novoManutTipoUso, setNovoManutTipoUso] = useState('medio')
  const [savingManut, setSavingManut] = useState(false)
  // Estados para editar horas de manutenção
  const [editManutOpen, setEditManutOpen] = useState(false)
  const [editManutId, setEditManutId] = useState<string | null>(null)
  const [editManutIntervalo, setEditManutIntervalo] = useState('')
  const [savingEditManut, setSavingEditManut] = useState(false)

  useEffect(() => {
    const carregarDados = async () => {
      const motoCarregada = await loadMoto()

      const tarefas: Promise<any>[] = [
        loadManutencoes(motoCarregada),
        loadHistorico(),
      ]

      if (profile?.role === 'piloto') {
        tarefas.push(loadTrilhas(), loadLiberacoes())
      }

      await Promise.all(tarefas)
    }

    carregarDados()
  }, [id])

  const loadMoto = async (): Promise<Moto | null> => {
    try {
      const { data, error } = await supabase
        .from('motos')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setMoto(data)
      return data
    } catch (error) {
      toast({ title: 'Erro ao carregar moto', variant: 'destructive' })
      navigate('/')
      return null
    } finally {
      setLoading(false)
    }
  }

  const calcularHorasComputadas = (trilha: {
    horas_uso: number
    tipo_uso: string
  }) => {
    const horas = Number(trilha.horas_uso || 0)

    if (trilha.tipo_uso === 'pesado') return horas * 1.5
    if (trilha.tipo_uso === 'leve') return horas * 0.8

    return horas
  }

  const loadManutencoes = async (motoAtual: Moto | null = moto) => {
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

      const horimetroAtual = Number(motoAtual?.horimetro || 0)

      const manutencoesComProgresso = (data || []).map((m: any) => {
        const registros = Array.isArray(m.registros_manutencao)
          ? m.registros_manutencao
          : []

        const ultimoRegistro =
          registros.length > 0
            ? [...registros].sort(
                (a: any, b: any) =>
                  Number(b.horas_moto || 0) - Number(a.horas_moto || 0)
              )[0]
            : null

        const intervalo = Number(m.intervalo_horas || 0)

        /*
         * Manutenção realizada:
         * o novo ciclo começa no horímetro do registro.
         *
         * Manutenção ainda não realizada:
         * o ciclo começa no horímetro_inicio salvo quando a manutenção
         * foi criada. Assim, todas as horas anteriores à criação ficam
         * fora do contador.
         */
        let horimetroInicio: number
        let horasAcumuladas: number

        if (ultimoRegistro) {
          horimetroInicio = Number(ultimoRegistro.horas_moto || 0)
          horasAcumuladas = Math.max(0, horimetroAtual - horimetroInicio)
        } else if (
          m.horimetro_inicio !== null &&
          m.horimetro_inicio !== undefined
        ) {
          horimetroInicio = Number(m.horimetro_inicio || 0)
          horasAcumuladas = Math.max(0, horimetroAtual - horimetroInicio)
        } else {
          /*
           * Compatibilidade com manutenções antigas que ainda não possuem
           * horimetro_inicio preenchido.
           */
          horimetroInicio = horimetroAtual
          horasAcumuladas = 0
        }

        const percentual =
          intervalo > 0
            ? Math.min((horasAcumuladas / intervalo) * 100, 100)
            : 0

        const horasRestantes =
          intervalo > 0
            ? Math.max(0, intervalo - horasAcumuladas)
            : 0

        return {
          ...m,
          ultimo_registro: ultimoRegistro,
          horimetro_inicio: horimetroInicio,
          horimetro_atual: horimetroAtual,
          horas_acumuladas: horasAcumuladas,
          horas_restantes: horasRestantes,
          porcentagem: percentual,
          vencida: intervalo > 0 && horasAcumuladas >= intervalo,
          nunca_feita: !ultimoRegistro,
        }
      })

      setManutencoes(manutencoesComProgresso)
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
        realizado_por: r.realizado_por ?? null,
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
    const email = emailMecanico.trim().toLowerCase()

    if (!email) {
      toast({
        title: 'Digite o email do mecânico',
        variant: 'destructive',
      })
      return
    }

    if (!user?.id) {
      toast({
        title: 'Usuário não autenticado',
        description: 'Faça login novamente e tente novamente.',
        variant: 'destructive',
      })
      return
    }

    try {
      console.log('🔎 Buscando mecânico:', email)

      const { data, error: rpcError } = await supabase.rpc(
        'buscar_usuario_por_email',
        {
          email_busca: email,
        }
      )

      console.log('📦 Resultado RPC:', data)
      console.log('❌ Erro RPC:', rpcError)

      // Erro REAL da chamada RPC
      if (rpcError) {
        console.error('Erro ao executar buscar_usuario_por_email:', rpcError)

        toast({
          title: 'Erro ao consultar mecânico',
          description:
            rpcError.message ||
            rpcError.details ||
            'A função do Supabase não pôde ser executada.',
          variant: 'destructive',
        })

        return
      }

      // A RPC retorna uma tabela, portanto normalmente recebemos um array.
      const mecanicoData = Array.isArray(data)
        ? data[0]
        : data

      console.log('👨‍🔧 Mecânico encontrado:', mecanicoData)

      // Usuário não encontrado
      if (!mecanicoData) {
        toast({
          title: 'Mecânico não encontrado',
          description: `Nenhum usuário foi encontrado com o email ${email}.`,
          variant: 'destructive',
        })

        return
      }

      // Confirma que é realmente um mecânico
      if (mecanicoData.role !== 'mecanico') {
        toast({
          title: 'Usuário não é mecânico',
          description: `O usuário encontrado possui o perfil "${mecanicoData.role}".`,
          variant: 'destructive',
        })

        return
      }

      console.log('✅ Mecânico validado:', {
        id: mecanicoData.id,
        name: mecanicoData.name,
        email: mecanicoData.email,
        role: mecanicoData.role,
      })

      // Criar liberação
      const { error: insertError } = await supabase
        .from('liberacoes_mecanico')
        .insert({
          moto_id: id,
          mecanico_id: mecanicoData.id,
          liberado_por: user.id,
          valido_ate: validoAte || null,
          ativo: true,
        })

      if (insertError) {
        console.error('❌ Erro ao criar liberação:', insertError)

        toast({
          title: 'Erro ao liberar mecânico',
          description:
            insertError.message ||
            insertError.details ||
            'Não foi possível criar a liberação.',
          variant: 'destructive',
        })

        return
      }

      console.log('🎉 Liberação criada com sucesso!')

      toast({
        title: 'Mecânico liberado com sucesso!',
      })

      setDialogOpen(false)
      setEmailMecanico('')
      setValidoAte('')

      await loadLiberacoes()
    } catch (error: any) {
      console.error('🔥 Erro inesperado ao liberar mecânico:', error)

      toast({
        title: 'Erro inesperado',
        description:
          error?.message ||
          'Ocorreu um erro inesperado ao liberar o mecânico.',
        variant: 'destructive',
      })
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
    const intervalo = Number(manutencao.intervalo_horas || 0)
    const horasAcumuladas = Number(manutencao.horas_acumuladas || 0)

    if (intervalo > 0) {
      const porcentagem =
        manutencao.porcentagem ??
        Math.min((horasAcumuladas / intervalo) * 100, 100)

      if (porcentagem >= 100) {
        return {
          status: 'atrasada',
          color: 'red',
          icon: AlertCircle,
          text: 'Manutenção necessária',
          porcentagem: 100,
          horasAcumuladas,
          horasRestantes: 0,
        }
      }

      if (porcentagem >= 80) {
        return {
          status: 'proxima',
          color: 'yellow',
          icon: AlertTriangle,
          text: manutencao.nunca_feita ? 'Primeira revisão próxima' : 'Próxima',
          porcentagem,
          horasAcumuladas,
          horasRestantes: Math.max(0, intervalo - horasAcumuladas),
        }
      }

      return {
        status: 'ok',
        color: 'green',
        icon: CheckCircle,
        text: manutencao.nunca_feita ? 'Primeiro ciclo' : 'Em dia',
        porcentagem,
        horasAcumuladas,
        horasRestantes: Math.max(0, intervalo - horasAcumuladas),
      }
    }

    return {
      status: 'ok',
      color: 'green',
      icon: CheckCircle,
      text: 'Em dia',
      porcentagem: 0,
      horasAcumuladas,
      horasRestantes: 0,
    }
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
          horimetro_inicio: Number(moto.horimetro || 0),
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

  const totalGastoManutencoes = registrosHistorico.reduce(
    (total, registro) => total + Number(registro.custo || 0),
    0
  )

  const excluirRegistroManutencao = async (registroId: string) => {
    try {
      const { error } = await supabase.from('registros_manutencao').delete().eq('id', registroId)
      if (error) throw error
      toast({ title: 'Registro excluído!' })
      await loadManutencoes()
      await loadHistorico()
    } catch (error: any) {
      toast({ title: 'Erro ao excluir registro', description: error.message, variant: 'destructive' })
    }
  }

  const uploadFotoMoto = async (file: File) => {
    if (!moto) return
    setUploadingFoto(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${moto.id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('moto-photos')
        .upload(fileName, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('moto-photos').getPublicUrl(fileName)
      const { error: updateError } = await supabase
        .from('motos')
        .update({ foto_url: urlData.publicUrl })
        .eq('id', moto.id)
      if (updateError) throw updateError

      toast({ title: 'Foto atualizada com sucesso!' })
      loadMoto()
    } catch (error: any) {
      toast({ title: 'Erro ao enviar foto', description: error.message, variant: 'destructive' })
    } finally {
      setUploadingFoto(false)
    }
  }

  const adicionarManutencao = async () => {
    const nome = novoManutNome.trim()
    const intervalo = Number(novoManutIntervaloHoras)

    if (!nome) {
      toast({
        title: 'Digite o nome da manutenção',
        variant: 'destructive',
      })
      return
    }

    if (!Number.isFinite(intervalo) || intervalo <= 0) {
      toast({
        title: 'Digite um intervalo de horas válido',
        variant: 'destructive',
      })
      return
    }

    if (!moto || savingManut) return

    setSavingManut(true)

    try {
      // A manutenção começa no horímetro atual da moto.
      // As horas anteriores à criação não entram neste ciclo.
      const { error } = await supabase
        .from('manutencoes')
        .insert({
          moto_id: moto.id,
          nome,
          categoria: novoManutCategoria,
          intervalo_horas: intervalo,
          tipo_uso: novoManutTipoUso,
          horimetro_inicio: Number(moto.horimetro || 0),
        })

      if (error) throw error

      // Atualiza os dados antes de esconder o modal.
      // O modal continua montado no DOM, então não existe Portal para
      // o React/Radix tentar remover enquanto a lista é renderizada.
      await loadManutencoes(moto)

      setNovoManutNome('')
      setNovoManutCategoria('Motor')
      setNovoManutIntervaloHoras('')
      setNovoManutTipoUso('medio')
      setAddManutencaoOpen(false)

      toast({ title: 'Manutenção adicionada!' })
    } catch (error: any) {
      console.error('Erro ao adicionar manutenção:', error)
      toast({
        title: 'Erro ao adicionar manutenção',
        description: error?.message || 'Não foi possível salvar a manutenção.',
        variant: 'destructive',
      })
    } finally {
      setSavingManut(false)
    }
  }

  const abrirEdicaoManutencao = (manutencao: Manutencao) => {
    setEditManutId(manutencao.id)
    setEditManutIntervalo(manutencao.intervalo_horas?.toString() || '')
    setEditManutOpen(true)
  }

  const salvarEdicaoManutencao = async () => {
    if (!editManutId || !editManutIntervalo) return
    setSavingEditManut(true)
    try {
      const { error } = await supabase
        .from('manutencoes')
        .update({ intervalo_horas: parseInt(editManutIntervalo) })
        .eq('id', editManutId)
      if (error) throw error
      toast({ title: 'Intervalo atualizado!' })
      setEditManutOpen(false)
      await loadManutencoes()
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar intervalo', description: error.message, variant: 'destructive' })
    } finally {
      setSavingEditManut(false)
    }
  }

  const excluirManutencao = async (manutencaoId: string) => {
    try {
      const { error } = await supabase.from('manutencoes').delete().eq('id', manutencaoId)
      if (error) throw error
      toast({ title: 'Manutenção excluída!' })
      await loadManutencoes()
    } catch (error: any) {
      toast({ title: 'Erro ao excluir manutenção', description: error.message, variant: 'destructive' })
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
                    <AlertDialogCancel className="border-slate-600 bg-slate-700 text-white hover:bg-slate-600 hover:text-white">Cancelar</AlertDialogCancel>
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
            <Button variant="outline" onClick={() => setEditMotoOpen(false)} className="border-slate-600 bg-slate-700 text-white hover:bg-slate-600 hover:text-white">Cancelar</Button>
            <Button onClick={salvarEdicaoMoto} disabled={savingMoto}>
              {savingMoto ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar Manutenção
          Este modal é mantido montado no DOM e usa controles HTML nativos.
          Isso evita conflitos de Portal/DOM do Radix durante o fechamento
          e a atualização da lista após salvar. */}
      <div
        className={addManutencaoOpen ? 'fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4' : 'hidden'}
        role="dialog"
        aria-modal={addManutencaoOpen}
        aria-labelledby="titulo-adicionar-manutencao"
        aria-hidden={!addManutencaoOpen}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !savingManut) {
            setAddManutencaoOpen(false)
          }
        }}
      >
        <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-2xl">
          <div className="mb-4">
            <h2 id="titulo-adicionar-manutencao" className="text-lg font-semibold text-white">
              Adicionar Manutenção
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Crie uma nova manutenção para esta moto
            </p>
          </div>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="novo-manut-nome" className="text-white">
                Nome
              </Label>
              <Input
                id="novo-manut-nome"
                value={novoManutNome}
                onChange={(e) => setNovoManutNome(e.target.value)}
                placeholder="Ex: Troca de Óleo Motor"
                className="bg-slate-900 border-slate-600 text-white"
                disabled={savingManut}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="novo-manut-categoria" className="text-white">
                  Categoria
                </Label>
                <select
                  id="novo-manut-categoria"
                  value={novoManutCategoria}
                  onChange={(e) => setNovoManutCategoria(e.target.value)}
                  disabled={savingManut}
                  className="h-10 w-full rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-white outline-none focus:border-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Motor">Motor</option>
                  <option value="Transmissão">Transmissão</option>
                  <option value="Suspensão">Suspensão</option>
                  <option value="Freios">Freios</option>
                  <option value="Chassi">Chassi</option>
                  <option value="Elétrica">Elétrica</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="novo-manut-intervalo" className="text-white">
                  Intervalo (horas)
                </Label>
                <Input
                  id="novo-manut-intervalo"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={novoManutIntervaloHoras}
                  onChange={(e) => setNovoManutIntervaloHoras(e.target.value)}
                  placeholder="Ex: 15"
                  className="bg-slate-900 border-slate-600 text-white"
                  disabled={savingManut}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="novo-manut-tipo-uso" className="text-white">
                Tipo de Uso
              </Label>
              <select
                id="novo-manut-tipo-uso"
                value={novoManutTipoUso}
                onChange={(e) => setNovoManutTipoUso(e.target.value)}
                disabled={savingManut}
                className="h-10 w-full rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-white outline-none focus:border-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="leve">Leve</option>
                <option value="medio">Médio</option>
                <option value="pesado">Pesado</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddManutencaoOpen(false)}
              disabled={savingManut}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-600 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:pointer-events-none disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={adicionarManutencao}
              disabled={savingManut}
              className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
            >
              {savingManut ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Editar Intervalo de Manutenção */}
      <Dialog open={editManutOpen} onOpenChange={setEditManutOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Intervalo</DialogTitle>
            <DialogDescription className="text-slate-400">Altere o intervalo de horas desta manutenção</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-white">Intervalo (horas)</Label>
              <Input
                type="number"
                value={editManutIntervalo}
                onChange={(e) => setEditManutIntervalo(e.target.value)}
                placeholder="Ex: 15"
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setEditManutOpen(false)} className="border-slate-600 bg-slate-700 text-white hover:bg-slate-600 hover:text-white">Cancelar</Button>
            <Button onClick={salvarEdicaoManutencao} disabled={savingEditManut}>
              {savingEditManut ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-8">
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="pt-6">
            {/* Foto da moto */}
            {(moto.foto_url || profile?.role === 'piloto') && (
              <div className="mb-6">
                <div className="relative w-full h-48 rounded-lg overflow-hidden bg-slate-900 border border-slate-700">
                  {moto.foto_url ? (
                    <img
                      src={moto.foto_url}
                      alt={`${moto.marca} ${moto.modelo}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500">
                      <Camera className="h-12 w-12" />
                      <p className="text-sm">Sem foto</p>
                    </div>
                  )}
                  {profile?.role === 'piloto' && (
                    <label className="absolute bottom-2 right-2 cursor-pointer">
                      <div className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                        {uploadingFoto ? (
                          <span>Enviando...</span>
                        ) : (
                          <>
                            <Upload className="h-3.5 w-3.5" />
                            <span>{moto.foto_url ? 'Trocar foto' : 'Adicionar foto'}</span>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingFoto}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) uploadFotoMoto(file)
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Horímetro Atual</p>
                <p className="text-4xl font-bold text-orange-500">{moto.horimetro}h</p>
              </div>
              {profile?.role === 'piloto' && (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
                  <Button className="w-full sm:w-auto" onClick={() => navigate(`/motos/${moto.id}/trilha`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Trilha
                  </Button>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto">
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
          <TabsList
            className={
              profile?.role === 'mecanico'
                ? 'grid w-full grid-cols-1 bg-slate-800'
                : 'grid w-full grid-cols-3 bg-slate-800'
            }
          >
            <TabsTrigger value="manutencoes">Manutenções</TabsTrigger>

            {profile?.role === 'piloto' && (
              <>
                <TabsTrigger value="trilhas">Trilhas</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="manutencoes" className="space-y-4">
            {(profile?.role === 'piloto' || profile?.role === 'mecanico') && (
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm transition-colors"
                onClick={() => setAddManutencaoOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Manutenção
              </Button>
            )}
            {manutencoes.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center">
                  <Wrench className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-4">Nenhuma manutenção cadastrada</p>
                  {profile?.role === 'piloto' && (
                    <Button onClick={criarManutencoesIniciais}>Criar Manutenções Padrão</Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {['Motor', 'Transmissão', 'Suspensão', 'Freios', 'Chassi', 'Elétrica', 'Outros'].map((categoria) => {
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
                              className="bg-slate-800 border-slate-700 hover:border-orange-500 transition-all"
                            >
                              <CardContent className="py-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div
                                    className="flex items-center gap-3 flex-1 cursor-pointer"
                                    onClick={() => navigate(`/motos/${moto.id}/manutencao/${manutencao.id}`)}
                                  >
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
                                  <div className="flex items-center gap-1">
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
                                    {(profile?.role === 'piloto' || profile?.role === 'mecanico') && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-slate-400 hover:text-white"
                                          onClick={(e) => { e.stopPropagation(); abrirEdicaoManutencao(manutencao) }}
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-red-400 hover:text-red-300"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent className="bg-slate-800 border-slate-700">
                                            <AlertDialogHeader>
                                              <AlertDialogTitle className="text-white">Excluir manutenção?</AlertDialogTitle>
                                              <AlertDialogDescription className="text-slate-400">
                                                "{manutencao.nome}" e todos os registros vinculados serão excluídos.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel className="border-slate-600 bg-slate-700 text-white hover:bg-slate-600 hover:text-white">Cancelar</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => excluirManutencao(manutencao.id)} className="bg-red-600 hover:bg-red-700">
                                                Excluir
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {manutencao.intervalo_horas ? (
                                  <div className="mt-3 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-slate-400">
                                        {Number(manutencao.horas_acumuladas || 0).toFixed(1)}h de{' '}
                                        {Number(manutencao.intervalo_horas).toFixed(1)}h
                                      </span>
                                      <span
                                        className={
                                          status.color === 'red'
                                            ? 'text-red-400 font-medium'
                                            : status.color === 'yellow'
                                            ? 'text-yellow-400 font-medium'
                                            : 'text-green-400 font-medium'
                                        }
                                      >
                                        {status.porcentagem.toFixed(0)}%
                                      </span>
                                    </div>

                                    <Progress value={status.porcentagem} className="h-2" />

                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-slate-500">
                                        {manutencao.ultimo_registro
                                          ? `Última manutenção: ${format(
                                              new Date(manutencao.ultimo_registro.data),
                                              'dd/MM/yyyy'
                                            )} • ${Number(manutencao.ultimo_registro.horas_moto).toFixed(1)}h`
                                          : 'Primeiro ciclo desde a criação'}
                                      </span>
                                      <span className="text-slate-400">
                                        {status.horasRestantes > 0
                                          ? `Faltam ${status.horasRestantes.toFixed(1)}h`
                                          : 'Limite atingido'}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500 mt-2">
                                    Manutenção baseada em intervalo de dias.
                                  </p>
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

            {profile?.role === 'mecanico' && (
              <Card className="bg-slate-800 border-slate-700 mt-6">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <History className="h-5 w-5 text-blue-400" />
                    Histórico de Manutenções
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Manutenções realizadas nesta moto
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {registrosHistorico.length === 0 ? (
                    <div className="py-8 text-center">
                      <History className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">
                        Nenhuma manutenção realizada ainda.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {registrosHistorico.map((registro) => {
                        const podeExcluir =
                          profile?.role === 'mecanico' &&
                          !!user?.id &&
                          registro.realizado_por === user.id

                        return (
                          <Card
                            key={`historico-manutencao-mecanico-${registro.id}`}
                            className="bg-slate-900 border-slate-700"
                          >
                            <CardContent className="py-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                                    <Wrench className="h-4 w-4 text-blue-400" />
                                  </div>

                                  <div className="min-w-0">
                                    <p className="text-white font-medium">
                                      {registro.manutencao_nome || 'Manutenção'}
                                    </p>

                                    <p className="text-xs text-slate-400">
                                      {format(
                                        new Date(registro.data),
                                        "dd 'de' MMMM 'de' yyyy",
                                        { locale: ptBR }
                                      )}
                                      {registro.horas_moto
                                        ? ` • ${Number(registro.horas_moto).toFixed(1)}h`
                                        : ''}
                                    </p>

                                    {registro.pecas_trocadas && (
                                      <p className="text-xs text-slate-500 mt-2">
                                        Peças: {registro.pecas_trocadas}
                                      </p>
                                    )}

                                    {registro.observacoes && (
                                      <p className="text-xs text-slate-500 mt-1">
                                        {registro.observacoes}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 shrink-0">
                                  {registro.custo != null && registro.custo > 0 && (
                                    <span className="text-xs text-green-400 font-medium">
                                      R$ {Number(registro.custo).toFixed(2)}
                                    </span>
                                  )}

                                  {podeExcluir && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-red-400 hover:text-red-300"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </AlertDialogTrigger>

                                      <AlertDialogContent className="bg-slate-800 border-slate-700">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle className="text-white">
                                            Excluir manutenção?
                                          </AlertDialogTitle>
                                          <AlertDialogDescription className="text-slate-400">
                                            Este registro de manutenção feito por você será excluído permanentemente.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>

                                        <AlertDialogFooter>
                                          <AlertDialogCancel className="border-slate-600 bg-slate-700 text-white hover:bg-slate-600 hover:text-white">
                                            Cancelar
                                          </AlertDialogCancel>

                                          <AlertDialogAction
                                            onClick={() =>
                                              excluirRegistroManutencao(registro.id)
                                            }
                                            className="bg-red-600 hover:bg-red-700"
                                          >
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
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {profile?.role === 'piloto' && (
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
                  const horasComputadas = calcularHorasComputadas(trilha)
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
                                    <AlertDialogCancel className="border-slate-600 bg-slate-700 text-white hover:bg-slate-600 hover:text-white">Cancelar</AlertDialogCancel>
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
          )}

          {profile?.role === 'piloto' && (
          <TabsContent value="historico">
            <Card className="bg-slate-800 border-slate-700 mb-4">
              <CardContent className="py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Total gasto com manutenção</p>
                    <p className="text-3xl font-bold text-green-400">
                      R$ {totalGastoManutencoes.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <Wrench className="h-6 w-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

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
                                        <AlertDialogCancel className="border-slate-600 bg-slate-700 text-white hover:bg-slate-600 hover:text-white">Cancelar</AlertDialogCancel>
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
          )}
        </Tabs>
      </div>
    </div>
  )
}
