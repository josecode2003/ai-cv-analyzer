const version = '007_add_market_analysis'

/*
 * Dos cambios, relacionados pero independientes:
 *
 * 1. `cv_analyses.model_version` registra con qué
 *    versión de modelo/prompt se generó cada análisis.
 *    Permite que el caché por hash de contenido (que ya
 *    era global desde la migración 006) deje de servir
 *    análisis obsoletos después de cambiar el prompt o
 *    el modelo: solo se reutiliza un análisis existente
 *    si además coincide la versión.
 *
 * 2. `market_analyses` separa por completo el análisis
 *    del mercado laboral del análisis del CV. Se cachea
 *    por firma de perfil profesional (ocupación + sector
 *    + senioridad + ubicación), no por CV ni por sesión:
 *    el mercado laboral no depende de quién subió el CV,
 *    así que dos CVs distintos con el mismo perfil
 *    reutilizan el mismo Market Analysis. `data_version`
 *    permite forzar una actualización de los datos del
 *    mercado sin reprocesar ningún CV.
 */

async function up(pool) {
  await pool.query(`
    ALTER TABLE cv_analyses
    ADD COLUMN IF NOT EXISTS model_version VARCHAR(50)
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS market_analyses (
      id SERIAL PRIMARY KEY,

      cv_analysis_id INTEGER REFERENCES cv_analyses(id) ON DELETE SET NULL,

      profile_signature VARCHAR(64) NOT NULL,

      occupation VARCHAR(255),
      sector VARCHAR(255),
      region VARCHAR(255),

      model_version VARCHAR(50) NOT NULL,
      data_version VARCHAR(50) NOT NULL,

      status VARCHAR(20) NOT NULL DEFAULT 'ready',

      result JSONB NOT NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_market_analyses_signature
    ON market_analyses(profile_signature, model_version, data_version)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_market_analyses_cv_analysis_id
    ON market_analyses(cv_analysis_id)
  `)

  console.log('✅ model_version añadido a cv_analyses')
  console.log('✅ Tabla market_analyses creada correctamente')
}

module.exports = { version, up }
