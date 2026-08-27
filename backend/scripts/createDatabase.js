require('dotenv').config()

const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
})

async function createDatabase() {

  try {

    const result = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'ai_cv_analyzer'"
    )

    if (result.rowCount > 0) {

      console.log('ℹ️ La base de datos ai_cv_analyzer ya existe')

    } else {

      await pool.query('CREATE DATABASE ai_cv_analyzer')

      console.log('✅ Base de datos ai_cv_analyzer creada correctamente')

    }

  } catch (error) {

    console.error('❌ Error creando la base de datos:')
    console.error(error.message)

  } finally {

    await pool.end()

  }

}

createDatabase()