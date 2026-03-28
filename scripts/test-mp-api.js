import { readFileSync } from 'fs'

// Lê o token direto do .env
const envContent = readFileSync('/workspace/.env', 'utf-8')
const tokenLine = envContent.split('\n').find(l => l.startsWith('MERCADO_PAGO_ACCESS_TOKEN='))
const token = tokenLine?.split('=').slice(1).join('=').trim()

console.log('Token tipo:', token?.startsWith('APP_USR') ? '✅ PRODUÇÃO' : token?.startsWith('TEST') ? '⚠️ TESTE' : '❌ Desconhecido')

const appUrlLine = envContent.split('\n').find(l => l.startsWith('APP_URL='))
const appUrl = appUrlLine?.split('=').slice(1).join('=').trim()
console.log('App URL:', appUrl)

// Testa criação de preferência
console.log('\nTestando criação de checkout no Mercado Pago...')
const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    items: [{
      id: 'pro_piloto',
      title: 'Plano Piloto - MotoTrack Pro',
      quantity: 1,
      unit_price: 19.90,
      currency_id: 'BRL'
    }],
    back_urls: {
      success: `${appUrl}/subscription/success`,
      failure: `${appUrl}/subscription/failure`,
      pending: `${appUrl}/subscription/pending`
    },
    auto_return: 'approved'
  })
})

const data = await res.json()
if (res.ok) {
  console.log('✅ Checkout criado com sucesso!')
  console.log('   init_point:', data.init_point?.substring(0, 60) + '...')
  console.log('   id:', data.id)
} else {
  console.log('❌ Erro:', JSON.stringify(data, null, 2))
}
