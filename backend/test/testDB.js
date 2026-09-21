require('dotenv').config({ quiet: true })

const pool = require('./src/config/database')

async function testDatabase() {
  try {
    const result = await pool.query('SELECT NOW()')

    console.log('✅ PostgreSQL funciona correctamente')
    console.log('📅 Fecha del servidor:', result.rows[0].now)
  } catch (error) {
    console.error('❌ Error conectando con PostgreSQL:')
    console.error(error.message)
  } finally {
    await pool.end()
  }
}

testDatabase()
