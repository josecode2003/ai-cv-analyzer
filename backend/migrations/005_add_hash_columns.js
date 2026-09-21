const version = '005_add_hash_columns'

/*
 * Estas columnas las usan cvAnalysisRepository y
 * jobComparisonRepository para el sistema de caché
 * basado en hash (evitar reprocesar con OpenAI).
 *
 * No existía ninguna migración que las creara: solo
 * vivían en una base de datos concreta a la que se
 * les había añadido la columna manualmente.
 */

async function up(pool) {
  await pool.query(`
    ALTER TABLE cv_analyses
    ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_cv_analyses_content_hash
    ON cv_analyses(user_id, content_hash)
  `)

  await pool.query(`
    ALTER TABLE job_comparisons
    ADD COLUMN IF NOT EXISTS comparison_hash VARCHAR(64)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_job_comparisons_comparison_hash
    ON job_comparisons(user_id, comparison_hash)
  `)

  console.log('✅ content_hash añadido a cv_analyses')
  console.log('✅ comparison_hash añadido a job_comparisons')
}

module.exports = { version, up }
