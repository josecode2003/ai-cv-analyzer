const { Pool } = require('pg')

const version = '001_create_database'

/*
 * Esta migración se conecta a la base de datos "postgres"
 * (no a ai_cv_analyzer) porque en este punto ai_cv_analyzer
 * todavía puede no existir.
 */

async function up() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
  })

  try {
    const result = await pool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [process.env.DB_NAME || 'ai_cv_analyzer']
    )

    if (result.rowCount === 0) {
      await pool.query(
        `CREATE DATABASE ${process.env.DB_NAME || 'ai_cv_analyzer'}`
      )

      console.log(
        `✅ Base de datos ${process.env.DB_NAME || 'ai_cv_analyzer'} creada correctamente`
      )
    } else {
      console.log(
        `ℹ️ La base de datos ${process.env.DB_NAME || 'ai_cv_analyzer'} ya existe`
      )
    }
  } finally {
    await pool.end()
  }
}

module.exports = { version, up }
