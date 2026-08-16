import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

    if (!user) {
      toast({
        title: 'Usuário não autenticado',
        description: 'Faça login novamente para cadastrar sua moto.',
        variant: 'destructive',
      })
      navigate('/login')
      return
    }

    // Validação do tipo
    if (!tipo) {
      toast({
        title: 'Selecione o tipo da moto',
        description: 'Escolha uma opção antes de continuar.',
        variant: 'destructive',
      })
      return
    }

    // Validação do ano
    const anoNumero = Number.parseInt(ano, 10)

    if (
      Number.isNaN(anoNumero) ||
      anoNumero < 1980 ||
      anoNumero > 2030
    ) {
      toast({
        title: 'Ano inválido',
        description: 'Informe um ano entre 1980 e 2030.',
        variant: 'destructive',
      })
      return
    }

    // O banco está configurado como INTEGER
    const horimetroNumero = Number.parseInt(horimetro, 10)

    if (
      Number.isNaN(horimetroNumero) ||
      horimetroNumero < 0
    ) {
      toast({
        title: 'Horímetro inválido',
        description: 'Informe um valor de horímetro igual ou maior que zero.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('motos')
        .insert({
          user_id: user.id,
          marca: marca.trim(),
          modelo: modelo.trim(),
          ano: anoNumero,
          tipo,
          horimetro: horimetroNumero,
        })
        .select()
        .single()

      if (error) {
        console.error('Erro ao cadastrar moto:', error)
        throw error
      }

      toast({
        title: 'Moto cadastrada com sucesso!',
        description: `${marca} ${modelo} foi adicionada à sua garagem.`,
      })

      navigate(`/motos/${data.id}`)
    } catch (error: any) {
      console.error('Erro ao cadastrar moto:', error)

      toast({
        title: 'Erro ao cadastrar moto',
        description:
          error?.message ||
          'Não foi possível cadastrar a moto. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Cabeçalho */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-white hover:bg-slate-800"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2">
              <Bike className="h-6 w-6 text-orange-500" />

              <div>
                <h1 className="text-lg font-bold text-white">
                  MotoTrack Pro
                </h1>

                <p className="text-xs text-slate-400">
                  Nova moto
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader>
            <CardTitle className="text-white">
              Cadastrar Nova Moto
            </CardTitle>

            <CardDescription className="text-slate-400">
              Preencha as informações da sua moto off-road.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Marca e Modelo */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="marca"
                    className="text-white"
                  >
                    Marca
                  </Label>

                  <Input
                    id="marca"
                    type="text"
                    placeholder="Ex: Honda, Yamaha, KTM"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    required
                    className="border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="modelo"
                    className="text-white"
                  >
                    Modelo
                  </Label>

                  <Input
                    id="modelo"
                    type="text"
                    placeholder="Ex: CRF 250F, YZ 125"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    required
                    className="border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Ano e Tipo */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="ano"
                    className="text-white"
                  >
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
                    className="border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                  />
                </div>

                {/* SELECT NATIVO - substitui o Radix Select */}
                <div className="space-y-2">
                  <Label
                    htmlFor="tipo"
                    className="text-white"
                  >
                    Tipo
                  </Label>

                  <select
                    id="tipo"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option
                      value=""
                      disabled
                    >
                      Selecione o tipo
                    </option>

                    <option value="trilha">
                      Trilha
                    </option>

                    <option value="enduro">
                      Enduro
                    </option>

                    <option value="motocross">
                      Motocross
                    </option>

                    <option value="rally">
                      Rally
                    </option>
                  </select>
                </div>
              </div>

              {/* Horímetro */}
              <div className="space-y-2">
                <Label
                  htmlFor="horimetro"
                  className="text-white"
                >
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
                  step="1"
                  className="border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                />

                <p className="text-xs text-slate-500">
                  Informe quantas horas sua moto já possui.
                </p>
              </div>

              {/* Botões */}
              <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  disabled={loading}
                  className="flex-1 border-slate-600 bg-transparent text-white hover:bg-slate-700 hover:text-white"
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading
                    ? 'Cadastrando...'
                    : 'Cadastrar Moto'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}