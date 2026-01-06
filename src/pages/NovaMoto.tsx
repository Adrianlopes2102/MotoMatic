import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Bike } from 'lucide-react'

export default function NovaMoto() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [ano, setAno] = useState('')
  const [tipo, setTipo] = useState('')
  const [horimetro, setHorimetro] = useState('0')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('motos')
        .insert({
          user_id: user!.id,
          marca,
          modelo,
          ano: parseInt(ano),
          tipo,
          horimetro: parseFloat(horimetro),
        })
        .select()
        .single()

      if (error) throw error

      toast({ title: 'Moto cadastrada com sucesso!' })
      navigate(`/motos/${data.id}`)
    } catch (error: any) {
      toast({
        title: 'Erro ao cadastrar moto',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Bike className="h-8 w-8 text-orange-500" />
            <h1 className="text-xl font-bold text-white">Nova Moto</h1>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Cadastrar Nova Moto</CardTitle>
            <CardDescription className="text-slate-400">
              Preencha as informações da sua moto off-road
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marca" className="text-white">
                    Marca
                  </Label>
                  <Input
                    id="marca"
                    placeholder="Ex: Honda, Yamaha, KTM"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    required
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelo" className="text-white">
                    Modelo
                  </Label>
                  <Input
                    id="modelo"
                    placeholder="Ex: CRF 250F, YZ 125"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    required
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ano" className="text-white">
                    Ano
                  </Label>
                  <Input
                    id="ano"
                    type="number"
                    placeholder="2023"
                    value={ano}
                    onChange={(e) => setAno(e.target.value)}
                    required
                    min="1980"
                    max="2030"
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo" className="text-white">
                    Tipo
                  </Label>
                  <Select value={tipo} onValueChange={setTipo} required>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trilha">Trilha</SelectItem>
                      <SelectItem value="enduro">Enduro</SelectItem>
                      <SelectItem value="motocross">Motocross</SelectItem>
                      <SelectItem value="rally">Rally</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="horimetro" className="text-white">
                  Horímetro Atual (horas)
                </Label>
                <Input
                  id="horimetro"
                  type="number"
                  placeholder="0"
                  value={horimetro}
                  onChange={(e) => setHorimetro(e.target.value)}
                  required
                  min="0"
                  step="0.1"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/')} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Cadastrando...' : 'Cadastrar Moto'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
