import pg from 'pg'
const { Client } = pg
const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
const { rows } = await client.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'users'
  ORDER BY ordinal_position
`)
rows.forEach(c => console.log(c.column_name, '-', c.data_type))
await client.end()
