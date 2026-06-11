import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Variáveis de ambiente não encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function clearAllAuthUsers() {
  console.log('Buscando usuários via API admin...')

  let page = 1
  let totalDeleted = 0

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 50 })

    if (error) {
      console.error('Erro ao listar usuários:', error.message)
      break
    }

    if (!data.users || data.users.length === 0) break

    console.log(`Página ${page}: ${data.users.length} usuário(s) encontrado(s)`)

    for (const user of data.users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
      if (deleteError) {
        console.error(`Erro ao deletar ${user.email}:`, deleteError.message)
      } else {
        console.log(`✓ Deletado: ${user.email}`)
        totalDeleted++
      }
    }

    if (data.users.length < 50) break
    page++
  }

  console.log(`\n✅ Total removido via API: ${totalDeleted} usuário(s)`)
}

clearAllAuthUsers()
