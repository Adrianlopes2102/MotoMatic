import pg from 'pg'
const { Client } = pg

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function forceClearAuth() {
  await client.connect()
  console.log('Conectado...')

  try {
    // Limpa TODAS as tabelas internas do auth que guardam estado de usuários
    const tables = [
      'auth.sessions',
      'auth.refresh_tokens',
      'auth.mfa_amr_claims',
      'auth.mfa_challenges',
      'auth.mfa_factors',
      'auth.one_time_tokens',
      'auth.flow_state',
      'auth.identities',
      'auth.users',
    ]

    for (const table of tables) {
      try {
        await client.query(`DELETE FROM ${table}`)
        console.log(`✓ ${table} limpa`)
      } catch (e) {
        console.log(`- ${table}: ${e.message}`)
      }
    }

    // Limpa também a tabela pública de usuários
    await client.query('DELETE FROM public.users')
    console.log('✓ public.users limpa')

    console.log('\n✅ Limpeza completa! Qualquer email pode ser cadastrado novamente.')
  } finally {
    await client.end()
  }
}

forceClearAuth()
