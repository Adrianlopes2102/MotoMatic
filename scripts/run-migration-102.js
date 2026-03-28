import { readFileSync } from 'fs'
import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

await client.connect()
const sql = readFileSync('./supabase/migrations/102_fix_users_insert_policy.sql', 'utf8')
await client.query(sql)
console.log('Migração 102 executada com sucesso!')
await client.end()
