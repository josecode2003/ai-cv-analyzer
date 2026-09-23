const version = '008_add_rubrics_and_market_snapshots'

/*
 * 1. `profession_rubrics` guarda el baremo de evaluación de cada
 *    profesión. Se genera una sola vez por profesión (y versión
 *    de baremo) y se reutiliza para todos los CVs de esa
 *    profesión: así dos electricistas se miden exactamente con
 *    los mismos criterios, en vez de que el modelo improvise un
 *    criterio distinto en cada análisis.
 *
 * 2. `labor_market_snapshots` guarda el resumen GENERAL del
 *    mercado laboral español, uno por día. No depende del CV,
 *    así que se comparte entre todos los usuarios.
 */

async function up(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profession_rubrics (
      id SERIAL PRIMARY KEY,

      occupation_key VARCHAR(255) NOT NULL,
      rubric_version VARCHAR(50) NOT NULL,

      occupation VARCHAR(255) NOT NULL,
      sector VARCHAR(255),

      rubric JSONB NOT NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      UNIQUE (occupation_key, rubric_version)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS labor_market_snapshots (
      id SERIAL PRIMARY KEY,

      snapshot_date DATE NOT NULL,
      data_version VARCHAR(50) NOT NULL,

      result JSONB NOT NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      UNIQUE (snapshot_date, data_version)
    )
  `)

  console.log('✅ Tabla profession_rubrics creada correctamente')
  console.log('✅ Tabla labor_market_snapshots creada correctamente')
}

module.exports = { version, up }
