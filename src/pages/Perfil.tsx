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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  CreditCard,
  Sparkles,
} from 'lucide-react'

export default function Perfil() {
  const navigate = useNavigate()

  const {
    profile,
    user,
    refreshProfile,
  } = useAuth()

  const { toast } = useToast()

  const [name, setName] = useState(
    profile?.name || ''
  )

  const [phone, setPhone] = useState(
    profile?.phone || ''
  )

  const [loading, setLoading] =
    useState(false)

  // ============================================================
  // SALVAR PERFIL
  // ============================================================

  const handleSave = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: 'Usuário não encontrado',
        description:
          'Faça login novamente para continuar.',
        variant: 'destructive',
      })

      return
    }

    setLoading(true)

    try {
      const cleanName = name.trim()
      const cleanPhone = phone.trim()

      if (!cleanName) {
        throw new Error(
          'Digite seu nome.'
        )
      }

      console.log(
        '[Perfil] Salvando dados do usuário...'
      )

      const { error } = await supabase
        .from('users')
        .update({
          name: cleanName,
          phone: cleanPhone || null,
        })
        .eq('id', user.id)

      if (error) {
        console.error(
          '[Perfil] Erro ao atualizar:',
          error
        )

        throw error
      }

      console.log(
        '[Perfil] Dados salvos com sucesso.'
      )

      await refreshProfile()

      toast({
        title:
          'Perfil atualizado com sucesso!',
        description:
          'Seus dados foram salvos.',
      })
    } catch (error: any) {
      console.error(
        '[Perfil] Erro ao salvar perfil:',
        error
      )

      toast({
        title:
          'Erro ao atualizar perfil',
        description:
          error?.message ||
          'Não foi possível salvar seus dados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // FUNÇÕES DE EXIBIÇÃO
  // ============================================================

  const getRoleLabel = (
    role?: string
  ) => {
    if (role === 'piloto') {
      return 'Piloto'
    }

    if (role === 'mecanico') {
      return 'Mecânico'
    }

    if (role === 'admin') {
      return 'Administrador'
    }

    return role || '-'
  }

  const getStatusLabel = (
    status?: string
  ) => {
    if (status === 'trial') {
      return 'Período de Teste'
    }

    if (status === 'active') {
      return 'Ativo'
    }

    if (status === 'expired') {
      return 'Expirado'
    }

    return status || '-'
  }

  const getStatusVariant = (
    status?: string
  ):
    | 'default'
    | 'secondary'
    | 'destructive' => {
    if (status === 'active') {
      return 'default'
    }

    if (status === 'trial') {
      return 'secondary'
    }

    return 'destructive'
  }

  // CORREÇÃO:
  // subscription_plan pode ser string, null ou undefined.
  const getPlanLabel = (
    plan?: string | null
  ) => {
    if (plan === 'pro_piloto') {
      return 'Pro Piloto'
    }

    if (plan === 'oficina') {
      return 'Oficina / Mecânico'
    }

    return 'Gratuito'
  }

  // ============================================================
  // TELA
  // ============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">

      {/* NAVBAR */}

      <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">

          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-slate-700 hover:text-white"
            onClick={() => navigate('/')}
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3">
            <User className="h-8 w-8 text-orange-500" />

            <div>
              <h1 className="text-xl font-bold text-white">
                Meu perfil
              </h1>

              <p className="text-xs text-slate-400">
                Gerencie suas informações
              </p>
            </div>
          </div>

        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">

        {/* INFORMAÇÕES DA CONTA */}

        <Card className="bg-slate-800 border-slate-700">

          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              Informações da Conta
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">

            {/* E-MAIL */}

            <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg">

              <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />

              <div>
                <p className="text-xs text-slate-400">
                  E-mail
                </p>

                <p className="text-white text-sm">
                  {profile?.email ||
                    user?.email ||
                    '-'}
                </p>
              </div>

            </div>

            {/* TIPO DE CONTA */}

            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">

              <div className="flex items-center gap-3">

                <Shield className="h-4 w-4 text-slate-400" />

                <div>
                  <p className="text-xs text-slate-400">
                    Tipo de conta
                  </p>

                  <p className="text-white text-sm">
                    {getRoleLabel(
                      profile?.role
                    )}
                  </p>
                </div>

              </div>

            </div>

            {/* ASSINATURA */}

            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">

              <div className="flex items-center gap-3">

                <CreditCard className="h-4 w-4 text-slate-400" />

                <div>
                  <p className="text-xs text-slate-400">
                    Assinatura
                  </p>

                  <p className="text-white text-sm">
                    {getPlanLabel(
                      profile?.subscription_plan
                    )}
                  </p>
                </div>

              </div>

              <Badge
                variant={getStatusVariant(
                  profile?.subscription_status
                )}
              >
                {getStatusLabel(
                  profile?.subscription_status
                )}
              </Badge>

            </div>

            {/* TRIAL */}

            {profile?.subscription_status ===
              'trial' &&
              profile.trial_ends_at && (
                <p className="text-xs text-slate-400 text-center">
                  Período de teste expira em:{' '}
                  {new Date(
                    profile.trial_ends_at
                  ).toLocaleDateString(
                    'pt-BR'
                  )}
                </p>
              )}

            {/* UPGRADE */}

            {profile?.subscription_status !==
              'active' && (
                <Button
                  type="button"
                  onClick={() =>
                    navigate('/upgrade')
                  }
                  className="group w-full h-12 gap-2 rounded-lg bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/20 transition-all hover:from-orange-600 hover:via-orange-600 hover:to-amber-600 hover:shadow-orange-500/35 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Sparkles className="h-5 w-5 transition-transform group-hover:scale-110" />

                  <span>
                    Assinar / Renovar Plano
                  </span>

                  <span
                    className="ml-1 text-lg transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Button>
              )}

          </CardContent>

        </Card>

        {/* DADOS PESSOAIS */}

        <Card className="bg-slate-800 border-slate-700">

          <CardHeader>

            <CardTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5 text-orange-500" />
              Dados Pessoais
            </CardTitle>

            <CardDescription className="text-slate-400">
              Atualize seu nome e telefone
            </CardDescription>

          </CardHeader>

          <CardContent>

            <form
              onSubmit={handleSave}
              className="space-y-4"
            >

              {/* NOME */}

              <div className="space-y-2">

                <Label
                  htmlFor="name"
                  className="text-white"
                >
                  Nome
                </Label>

                <Input
                  id="name"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  placeholder="Seu nome completo"
                  className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                  required
                />

              </div>

              {/* TELEFONE */}

              <div className="space-y-2">

                <Label
                  htmlFor="phone"
                  className="text-white"
                >
                  Telefone (opcional)
                </Label>

                <div className="relative">

                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />

                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) =>
                      setPhone(
                        e.target.value
                      )
                    }
                    placeholder="(11) 99999-9999"
                    className="pl-10 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                  />

                </div>

              </div>

              {/* BOTÃO */}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading
                  ? 'Salvando...'
                  : 'Salvar Alterações'}
              </Button>

            </form>

          </CardContent>

        </Card>

      </div>

    </div>
  )
}