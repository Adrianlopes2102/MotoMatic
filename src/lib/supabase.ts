import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Credenciais do Supabase não configuradas')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  users: {
    id: string
    email: string
    role: 'piloto' | 'mecanico' | 'admin'
    name: string
    phone?: string
    created_at: string
    trial_ends_at?: string
    subscription_status: 'trial' | 'active' | 'expired'
    subscription_plan?: 'free' | 'pro_piloto' | 'oficina'
  }
  motos: {
    id: string
    user_id: string
    marca: string
    modelo: string
    ano: number
    tipo: string
    foto_url?: string
    horimetro: number
    created_at: string
  }
  manutencoes: {
    id: string
    moto_id: string
    categoria: string
    nome: string
    intervalo_horas?: number
    intervalo_dias?: number
    tipo_uso: 'leve' | 'medio' | 'pesado'
    created_at: string
  }
  registros_manutencao: {
    id: string
    manutencao_id: string
    moto_id: string
    realizado_por: string
    data: string
    horas_moto: number
    observacoes?: string
    pecas_trocadas?: string
    custo?: number
    fotos?: string[]
    created_at: string
  }
  trilhas: {
    id: string
    moto_id: string
    user_id: string
    data: string
    horas_uso: number
    tipo_uso: 'leve' | 'medio' | 'pesado'
    local?: string
    observacoes?: string
    created_at: string
  }
  liberacoes_mecanico: {
    id: string
    moto_id: string
    mecanico_id: string
    liberado_por: string
    valido_ate?: string
    ativo: boolean
    created_at: string
  }
}
