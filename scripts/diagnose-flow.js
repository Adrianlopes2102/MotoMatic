import pg from 'pg'
const { Client } = pg
const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

console.log('\n=== COLUNAS DA TABELA public.users ===')
const { rows: cols } = await client.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users'
  ORDER BY ordinal_position
`)
cols.forEach(c => console.log(' ', c.column_name, '-', c.data_type))

console.log('\n=== DADOS DO USUÁRIO ===')
const { rows: users } = await client.query(`
  SELECT id, email, subscription_status, subscription_plan,
         subscription_expires_at, pending_plan, trial_ends_at
  FROM public.users
  ORDER BY created_at DESC
  LIMIT 5
`)
users.forEach(u => {
  console.log(`Email: ${u.email}`)
  console.log(`  status: ${u.subscription_status}`)
  console.log(`  plan: ${u.subscription_plan}`)
  console.log(`  expires: ${u.subscription_expires_at}`)
  console.log(`  pending_plan: ${u.pending_plan}`)
  console.log(`  trial_ends: ${u.trial_ends_at}`)
  console.log('---')
})

console.log('\n=== POLÍTICAS RLS users ===')
const { rows: pols } = await client.query(`
  SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users'
`)
pols.forEach(p => console.log(`  ${p.policyname} [${p.cmd}]`))

await client.end()
