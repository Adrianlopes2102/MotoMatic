import { readFileSync } from 'fs'
import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function run() {
  await client.connect()
  console.log('Conectado ao banco de dados')

  const sql = readFileSync('./supabase/migrations/103_moto_photos_storage.sql', 'utf8')
  await client.query(sql)
  console.log('✓ Migration 103 - storage bucket criado')

  console.log('\nMigração concluída!')
  await client.end()
}

run().catch((err) => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
