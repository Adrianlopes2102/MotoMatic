import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

await client.connect()
const r = await client.query("SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' ORDER BY routine_name")
console.log('Functions:', r.rows.map(x => x.routine_name).join(', '))
await client.end()
