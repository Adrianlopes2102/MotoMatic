import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, User, Mail, Phone, Shield, CreditCard } from 'lucide-react'

export default function Perfil() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const { toast } = useToast()

  const [name, setName] = useState(profile?.name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ name, phone })
        .eq('id', user.id)

      if (error) throw error

      toast({ title: 'Perfil atualizado com sucesso!' })
      // Recarrega para atualizar o contexto
      window.location.reload()
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar perfil', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const getRoleLabel = (role?: string) => {
    if (role === 'piloto') return 'Piloto'
    if (role === 'mecanico') return 'Mecânico'
    if (role === 'admin') return 'Administrador'
    return role || '-'
  }

  const getStatusLabel = (status?: string) => {
    if (status === 'trial') return 'Período de Teste'
    if (status === 'active') return 'Ativo'
    if (status === 'expired') return 'Expirado'
    return status || '-'
  }

  const getStatusVariant = (status?: string): 'default' | 'secondary' | 'destructive' => {
    if (status === 'active') return 'default'
    if (status === 'trial') return 'secondary'
    return 'destructive'
  }

  const getPlanLabel = (plan?: string) => {
    if (plan === 'pro_piloto') return 'Pro Piloto'
    if (plan === 'oficina') return 'Oficina / Mecânico'
    return 'Gratuito'
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <User className="h-8 w-8 text-orange-500" />
          <div>
            <h1 className="text-xl font-bold text-white">Meu Perfil</h1>
            <p className="text-xs text-slate-400">Gerencie suas informações</p>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Informações da conta */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              Informações da Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg">
              <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Email</p>
                <p className="text-white text-sm">{profile?.email || user?.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Tipo de conta</p>
                  <p className="text-white text-sm">{getRoleLabel(profile?.role)}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Assinatura</p>
                  <p className="text-white text-sm">{getPlanLabel(profile?.subscription_plan)}</p>
                </div>
              </div>
              <Badge variant={getStatusVariant(profile?.subscription_status)}>
                {getStatusLabel(profile?.subscription_status)}
              </Badge>
            </div>
            {profile?.subscription_status === 'trial' && profile.trial_ends_at && (
              <p className="text-xs text-slate-400 text-center">
                Trial expira em: {new Date(profile.trial_ends_at).toLocaleDateString('pt-BR')}
              </p>
            )}
            {profile?.subscription_status !== 'active' && (
              <Button
                variant="outline"
                className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                onClick={() => navigate('/upgrade')}
              >
                Assinar / Renovar Plano
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Editar dados pessoais */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5 text-orange-500" />
              Dados Pessoais
            </CardTitle>
            <CardDescription className="text-slate-400">Atualize seu nome e telefone</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="bg-slate-900 border-slate-600 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white">Telefone (opcional)</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
