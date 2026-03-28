import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

await client.connect()

// Verificar políticas da tabela users
const r = await client.query(`
  SELECT policyname, cmd, qual, with_check
  FROM pg_policies
  WHERE tablename = 'users' AND schemaname = 'public'
`)
console.log('Users policies:', JSON.stringify(r.rows, null, 2))

// Verificar se RLS está habilitado
const r2 = await client.query(`
  SELECT relname, relrowsecurity
  FROM pg_class
  WHERE relname = 'users' AND relnamespace = 'public'::regnamespace
`)
console.log('RLS status:', JSON.stringify(r2.rows))

await client.end()
