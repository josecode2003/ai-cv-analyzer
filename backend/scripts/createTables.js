require('dotenv').config()

const pool = require('./src/config/database')

async function createTables() {

  try {

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cv_analyses (
        id SERIAL PRIMARY KEY,

        original_filename VARCHAR(255) NOT NULL,

        filename VARCHAR(255) NOT NULL,

        file_size INTEGER NOT NULL,

        mime_type VARCHAR(100) NOT NULL,

        candidate_name VARCHAR(255),

        candidate_email VARCHAR(255),

        score INTEGER,

        profile VARCHAR(255),

        level VARCHAR(100),

        analysis JSONB NOT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log('✅ Tabla cv_analyses creada correctamente')

  } catch (error) {

    console.error('❌ Error creando la tabla:')
    console.error(error.message)

  } finally {

    await pool.end()

  }

}

createTables()