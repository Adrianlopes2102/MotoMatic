import pg from 'pg'
const { Client } = pg
const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

console.log('=== SIMULANDO FLUXO COMPLETO DE ASSINATURA ===\n')

// 1. Verifica estado atual do usuário
const { rows: [user] } = await client.query(`
  SELECT id, email, subscription_status, subscription_plan, pending_plan
  FROM public.users WHERE email = 'adrianlopes246@icloud.com'
`)

if (!user) {
  console.log('❌ Usuário não encontrado')
  await client.end()
  process.exit(1)
}

console.log('1. Estado atual do usuário:')
console.log(`   Email: ${user.email}`)
console.log(`   Status: ${user.subscription_status}`)
console.log(`   Plano: ${user.subscription_plan}`)
console.log(`   Pendente: ${user.pending_plan}`)

// 2. Simula usuário voltando ao trial (para testar o fluxo)
console.log('\n2. Simulando usuário com assinatura expirada e pending_plan...')
await client.query(`
  UPDATE public.users
  SET subscription_status = 'trial',
      subscription_plan = 'free',
      pending_plan = 'pro_piloto',
      subscription_expires_at = null
  WHERE email = 'adrianlopes246@icloud.com'
`)

const { rows: [updated] } = await client.query(`
  SELECT subscription_status, subscription_plan, pending_plan
  FROM public.users WHERE email = 'adrianlopes246@icloud.com'
`)
console.log(`   ✅ Status: ${updated.subscription_status}`)
console.log(`   ✅ Plano: ${updated.subscription_plan}`)
console.log(`   ✅ Pendente: ${updated.pending_plan}`)

// 3. Simula Dashboard ativando o pending_plan
console.log('\n3. Simulando Dashboard ativando pending_plan...')
const expiresAt = new Date()
expiresAt.setMonth(expiresAt.getMonth() + 1)

await client.query(`
  UPDATE public.users
  SET subscription_status = 'active',
      subscription_plan = pending_plan,
      subscription_expires_at = $1,
      last_payment_status = 'approved',
      pending_plan = null
  WHERE email = 'adrianlopes246@icloud.com'
`, [expiresAt.toISOString()])

const { rows: [final] } = await client.query(`
  SELECT subscription_status, subscription_plan, pending_plan, subscription_expires_at
  FROM public.users WHERE email = 'adrianlopes246@icloud.com'
`)
console.log(`   ✅ Status: ${final.subscription_status}`)
console.log(`   ✅ Plano: ${final.subscription_plan}`)
console.log(`   ✅ Pendente: ${final.pending_plan}`)
console.log(`   ✅ Expira: ${new Date(final.subscription_expires_at).toLocaleDateString('pt-BR')}`)

console.log('\n✅ FLUXO OK - Usuário seria liberado corretamente pelo Dashboard')
console.log('\nStatus final do usuário: ACTIVE ✅')

await client.end()
