import pg from 'pg'
const { Client } = pg

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function main() {
  await client.connect()

  console.log('\n=== USUÁRIOS E STATUS DE ASSINATURA ===\n')
  const { rows } = await client.query(`
    SELECT id, email, name, role, subscription_status, subscription_plan,
           subscription_expires_at, last_payment_id, last_payment_status,
           trial_ends_at, created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT 20
  `)

  rows.forEach(r => {
    console.log(`Email: ${r.email}`)
    console.log(`  Role: ${r.role}`)
    console.log(`  Status: ${r.subscription_status}`)
    console.log(`  Plano: ${r.subscription_plan}`)
    console.log(`  Expira em: ${r.subscription_expires_at}`)
    console.log(`  Trial até: ${r.trial_ends_at}`)
    console.log(`  Último pagamento ID: ${r.last_payment_id}`)
    console.log(`  Último pagamento status: ${r.last_payment_status}`)
    console.log('---')
  })

  console.log('\n=== POLÍTICAS RLS DA TABELA USERS ===\n')
  const { rows: policies } = await client.query(`
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = 'users'
  `)
  policies.forEach(p => {
    console.log(`Policy: ${p.policyname} | CMD: ${p.cmd}`)
    console.log(`  USING: ${p.qual}`)
    console.log(`  WITH CHECK: ${p.with_check}`)
    console.log('---')
  })

  await client.end()
}

main().catch(console.error)
