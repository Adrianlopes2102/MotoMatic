import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

await client.connect()
const r = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'users'")
console.log('Tables found:', JSON.stringify(r.rows))
const r2 = await client.query("SELECT current_database(), current_schema()")
console.log('DB info:', JSON.stringify(r2.rows))
await client.end()
