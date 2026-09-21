const version = '003_create_auth_tables'

async function up(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,

      name VARCHAR(100) NOT NULL,

      email VARCHAR(255) NOT NULL UNIQUE,

      password_hash VARCHAR(255) NOT NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await pool.query(`
    ALTER TABLE cv_analyses
    ADD COLUMN IF NOT EXISTS user_id INTEGER
  `)

  const constraintCheck = await pool.query(`
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cv_analyses_user_id_fkey'
  `)

  if (constraintCheck.rowCount === 0) {
    await pool.query(`
      ALTER TABLE cv_analyses
      ADD CONSTRAINT cv_analyses_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE
    `)
  }

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_cv_analyses_user_id
    ON cv_analyses(user_id)
  `)

  console.log('✅ Tabla users creada correctamente')
  console.log('✅ user_id añadido a cv_analyses')
  console.log('✅ Relación users → cv_analyses creada')
  console.log('✅ Índice de user_id creado')
}

module.exports = { version, up }
