import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { Shield } from 'lucide-react'

export default function UnlockPage() {
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Buscar código de desbloqueio válido
      const { data, error } = await supabase
        .from('unlock_codes')
        .select('*')
        .eq('code', codigo)
        .eq('used', false)
        .single()

      if (error || !data) {
        toast({
          title: 'Código inválido',
          description: 'O código informado não existe ou já foi utilizado.',
          variant: 'destructive'
        })
        return
      }

      // Marcar código como usado
      const { error: updateError } = await supabase
        .from('unlock_codes')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('id', data.id)

      if (updateError) {
        toast({
          title: 'Erro ao processar',
          description: 'Não foi possível processar o código. Tente novamente.',
          variant: 'destructive'
        })
        return
      }

      toast({
        title: 'Desbloqueio realizado!',
        description: 'Seu acesso foi liberado com sucesso.',
      })

      // Redirecionar para dashboard após 2 segundos
      setTimeout(() => {
        navigate('/')
      }, 2000)

    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao processar o código. Tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Desbloquear Acesso</CardTitle>
          <CardDescription>
            Insira o código de desbloqueio para liberar seu acesso ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código de Desbloqueio</Label>
              <Input
                id="codigo"
                type="text"
                placeholder="Digite o código"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                required
                className="text-center tracking-wider uppercase"
                maxLength={20}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || !codigo.trim()}>
              {loading ? 'Verificando...' : 'Desbloquear'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Voltar ao Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
