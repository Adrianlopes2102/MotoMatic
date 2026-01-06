import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, MapPin } from 'lucide-react'

export default function RegistrarTrilha() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [moto, setMoto] = useState<any>(null)
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [horasUso, setHorasUso] = useState('')
  const [tipoUso, setTipoUso] = useState<'leve' | 'medio' | 'pesado'>('medio')
  const [local, setLocal] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadMoto()
  }, [id])

  const loadMoto = async () => {
    try {
      const { data, error } = await supabase.from('motos').select('*').eq('id', id).single()

      if (error) throw error
      setMoto(data)
    } catch (error) {
      toast({ title: 'Erro ao carregar moto', variant: 'destructive' })
      navigate('/')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const horas = parseFloat(horasUso)
      let horasComputadas = horas

      if (tipoUso === 'pesado') {
        horasComputadas = horas * 1.5
      } else if (tipoUso === 'leve') {
        horasComputadas = horas * 0.8
      }

      const { error: trilhaError } = await supabase.from('trilhas').insert({
        moto_id: id,
        user_id: user!.id,
        data,
        horas_uso: horas,
        tipo_uso: tipoUso,
        local,
        observacoes,
      })

      if (trilhaError) throw trilhaError

      const novoHorimetro = moto.horimetro + horasComputadas

      const { error: motoError } = await supabase.from('motos').update({ horimetro: novoHorimetro }).eq('id', id)

      if (motoError) throw motoError

      toast({
        title: 'Trilha registrada!',
        description: `Horímetro atualizado: ${novoHorimetro.toFixed(1)}h`,
      })
      navigate(`/motos/${id}`)
    } catch (error: any) {
      toast({
        title: 'Erro ao registrar trilha',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!moto) {
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
          <Button variant="ghost" size="icon" className="text-white" onClick={() => navigate(`/motos/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <MapPin className="h-8 w-8 text-orange-500" />
          <h1 className="text-xl font-bold text-white">Registrar Trilha</h1>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-slate-400 text-sm">Horímetro Atual</p>
              <p className="text-3xl font-bold text-orange-500">{moto.horimetro}h</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Nova Trilha</CardTitle>
            <CardDescription className="text-slate-400">
              Registre os detalhes da sua trilha para atualizar o horímetro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data" className="text-white">
                    Data
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
                    Horas de Uso
                  </Label>
                  <Input
                    id="horas"
                    type="number"
                    placeholder="2.5"
                    value={horasUso}
                    onChange={(e) => setHorasUso(e.target.value)}
                    required
                    min="0.1"
                    step="0.1"
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo" className="text-white">
                  Tipo de Uso
                </Label>
                <Select value={tipoUso} onValueChange={(v) => setTipoUso(v as 'leve' | 'medio' | 'pesado')}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leve">
                      <div>
                        <p className="font-medium">Leve</p>
                        <p className="text-xs text-slate-400">Trilha suave, terreno fácil (x0.8)</p>
                      </div>
                    </SelectItem>
                    <SelectItem value="medio">
                      <div>
                        <p className="font-medium">Médio</p>
                        <p className="text-xs text-slate-400">Trilha normal (x1.0)</p>
                      </div>
                    </SelectItem>
                    <SelectItem value="pesado">
                      <div>
                        <p className="font-medium">Pesado</p>
                        <p className="text-xs text-slate-400">Trilha extrema, enduro, motocross (x1.5)</p>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="local" className="text-white">
                  Local (opcional)
                </Label>
                <Input
                  id="local"
                  placeholder="Ex: Trilha da Serra, Pista XYZ"
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes" className="text-white">
                  Observações (opcional)
                </Label>
                <Textarea
                  id="observacoes"
                  placeholder="Condições do terreno, clima, desempenho da moto..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                  rows={4}
                />
              </div>

              {horasUso && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-800 font-medium">Atualização do Horímetro</p>
                  <p className="text-xs text-orange-600 mt-1">
                    {parseFloat(horasUso)}h de uso {tipoUso !== 'medio' && `(${tipoUso})`} ={' '}
                    {tipoUso === 'pesado'
                      ? (parseFloat(horasUso) * 1.5).toFixed(1)
                      : tipoUso === 'leve'
                      ? (parseFloat(horasUso) * 0.8).toFixed(1)
                      : parseFloat(horasUso).toFixed(1)}
                    h computadas
                  </p>
                  <p className="text-sm text-orange-700 mt-2">
                    Novo horímetro:{' '}
                    {(
                      moto.horimetro +
                      (tipoUso === 'pesado'
                        ? parseFloat(horasUso) * 1.5
                        : tipoUso === 'leve'
                        ? parseFloat(horasUso) * 0.8
                        : parseFloat(horasUso))
                    ).toFixed(1)}
                    h
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/motos/${id}`)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Registrando...' : 'Registrar Trilha'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
