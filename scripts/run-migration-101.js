import { readFileSync } from 'fs'
import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function run() {
  await client.connect()
  const sql = readFileSync('./supabase/migrations/101_add_subscription_fields.sql', 'utf8')
  await client.query(sql)
  console.log('Migração 101 executada com sucesso!')
  await client.end()
}

run().catch((err) => {
  console.error('Erro na migração:', err)
  process.exit(1)
})
