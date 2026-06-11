import pg from 'pg'
const { Client } = pg

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function clearAllData() {
  await client.connect()
  console.log('Conectado ao banco de dados...')

  try {
    // Apaga todos os dados das tabelas (na ordem correta por causa das foreign keys)
    await client.query('TRUNCATE TABLE liberacoes_mecanico CASCADE')
    console.log('✓ liberacoes_mecanico limpa')

    await client.query('TRUNCATE TABLE registros_manutencao CASCADE')
    console.log('✓ registros_manutencao limpa')

    await client.query('TRUNCATE TABLE trilhas CASCADE')
    console.log('✓ trilhas limpa')

    await client.query('TRUNCATE TABLE manutencoes CASCADE')
    console.log('✓ manutencoes limpa')

    await client.query('TRUNCATE TABLE motos CASCADE')
    console.log('✓ motos limpa')

    await client.query('TRUNCATE TABLE users CASCADE')
    console.log('✓ users limpa')

    // Apaga todos os usuários do sistema de autenticação
    await client.query(`DELETE FROM auth.users`)
    console.log('✓ auth.users limpa (todos os usuários removidos)')

    console.log('\n✅ Banco de dados limpo com sucesso! Todas as tabelas estão vazias.')
  } catch (err) {
    console.error('Erro ao limpar dados:', err.message)
    throw err
  } finally {
    await client.end()
  }
}

clearAllData()
