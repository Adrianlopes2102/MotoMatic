import pg from 'pg'
import fs from 'fs'
const { Client } = pg

// Verifica se o APP_URL está no .env, se não, adiciona
const envPath = '/workspace/.env'
const envContent = fs.readFileSync(envPath, 'utf-8')

if (!envContent.includes('APP_URL=') && !envContent.includes('VITE_APP_URL=')) {
  fs.appendFileSync(envPath, '\nAPP_URL=https://www.mototrackpro.com.br\nVITE_APP_URL=https://www.mototrackpro.com.br\n')
  console.log('✅ APP_URL adicionado ao .env')
} else {
  console.log('✅ APP_URL já existe no .env')
}
