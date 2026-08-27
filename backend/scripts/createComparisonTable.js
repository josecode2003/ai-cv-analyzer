require('dotenv').config()

const pool = require('../src/config/database')

async function createComparisonTable() {

  try {

    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_comparisons (
        id SERIAL PRIMARY KEY,

        user_id INTEGER NOT NULL,

        cv_analysis_id INTEGER NOT NULL,

        job_title VARCHAR(255),

        job_offer_text TEXT NOT NULL,

        compatibility_score INTEGER,

        result JSONB NOT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT job_comparisons_user_id_fkey
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE,

        CONSTRAINT job_comparisons_cv_analysis_id_fkey
          FOREIGN KEY (cv_analysis_id)
          REFERENCES cv_analyses(id)
          ON DELETE CASCADE
      )
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_job_comparisons_user_id
      ON job_comparisons(user_id)
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_job_comparisons_cv_analysis_id
      ON job_comparisons(cv_analysis_id)
    `)

    console.log('✅ Tabla job_comparisons creada correctamente')

  } catch (error) {

    console.error(
      '❌ Error creando job_comparisons:',
      error.message
    )

  } finally {

    await pool.end()

  }
}

createComparisonTable()