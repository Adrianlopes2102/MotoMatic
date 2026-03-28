import { readFileSync } from 'fs'
import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const migrations = [
  './supabase/migrations/000_setup_exec_function.sql',
  './supabase/migrations/001_create_database.sql',
  './supabase/migrations/100_fix_sem_recursao.sql',
  './supabase/migrations/003_create_buscar_usuario_function.sql',
  './supabase/migrations/004_create_buscar_usuario_por_id.sql',
  './supabase/migrations/101_add_subscription_fields.sql',
]

async function run() {
  await client.connect()
  console.log('Conectado ao banco de dados')

  for (const file of migrations) {
    try {
      const sql = readFileSync(file, 'utf8')
      await client.query(sql)
      console.log(`✓ ${file}`)
    } catch (err) {
      console.error(`✗ Erro em ${file}:`, err.message)
      // Continua mesmo com erro (pode ser que já exista)
    }
  }

  console.log('\nTodas as migrações concluídas!')
  await client.end()
}

run().catch((err) => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
