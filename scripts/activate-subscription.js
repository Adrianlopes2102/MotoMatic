import pg from 'pg'
const { Client } = pg

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function main() {
  await client.connect()

  // Ativar assinatura do usuário que fez a compra
  const email = 'adrianlopes246@icloud.com'
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + 1)

  const { rowCount } = await client.query(`
    UPDATE users
    SET subscription_status = 'active',
        subscription_plan = 'pro_piloto',
        subscription_expires_at = $1,
        last_payment_status = 'approved'
    WHERE email = $2
  `, [expiresAt.toISOString(), email])

  if (rowCount > 0) {
    console.log(`✅ Assinatura ativada para: ${email}`)
    console.log(`   Plano: pro_piloto`)
    console.log(`   Expira em: ${expiresAt.toLocaleDateString('pt-BR')}`)
  } else {
    console.log(`❌ Usuário não encontrado: ${email}`)
  }

  await client.end()
}

main().catch(console.error)
