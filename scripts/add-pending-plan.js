import pg from 'pg'
const { Client } = pg

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function main() {
  await client.connect()

  await client.query(`
    ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS pending_plan TEXT;
  `)

  console.log('✅ Campo pending_plan adicionado com sucesso')
  await client.end()
}

main().catch(console.error)
