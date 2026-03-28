import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

await client.connect()
const r = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
console.log('Public tables:', r.rows.map(x => x.table_name).join(', '))

// Check columns in users
const r2 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' ORDER BY ordinal_position")
console.log('users columns:', r2.rows.map(x => x.column_name).join(', '))
await client.end()
