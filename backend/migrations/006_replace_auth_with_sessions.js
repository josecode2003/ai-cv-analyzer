const version = '006_replace_auth_with_sessions'

/*
 * La aplicación deja de requerir cuentas (registro/login).
 *
 * En su lugar, cada visitante recibe una sesión anónima
 * (fila en `sessions`, identificada por una cookie firmada)
 * la primera vez que visita la aplicación. Esto sustituye a
 * `users` como propietario de `cv_analyses` y `job_comparisons`,
 * pero sin nombre, email ni contraseña.
 */

async function up(pool) {
  await pool.query(`
    ALTER TABLE cv_analyses
    DROP CONSTRAINT IF EXISTS cv_analyses_user_id_fkey
  `)

  await pool.query(`
    ALTER TABLE job_comparisons
    DROP CONSTRAINT IF EXISTS job_comparisons_user_id_fkey
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  /*
   * Si ya existían cv_analyses/job_comparisons de usuarios
   * reales, sus user_id no tienen fila correspondiente en
   * `sessions` todavía. Sin este paso, las FK que se añaden
   * más abajo fallarían y dejarían la migración a medias.
   *
   * Creamos una sesión "placeholder" por cada user_id que
   * aparezca, reutilizando el mismo id, para no perder esos
   * análisis/comparaciones existentes.
   */

  await pool.query(`
    INSERT INTO sessions (id)
    SELECT DISTINCT user_id FROM cv_analyses WHERE user_id IS NOT NULL
    UNION
    SELECT DISTINCT user_id FROM job_comparisons WHERE user_id IS NOT NULL
    ON CONFLICT (id) DO NOTHING
  `)

  await pool.query(`
    SELECT setval(
      pg_get_serial_sequence('sessions', 'id'),
      COALESCE((SELECT MAX(id) FROM sessions), 1)
    )
  `)

  await pool.query(`
    ALTER TABLE cv_analyses
    RENAME COLUMN user_id TO session_id
  `)

  await pool.query(`
    ALTER TABLE job_comparisons
    RENAME COLUMN user_id TO session_id
  `)

  await pool.query(`
    ALTER TABLE cv_analyses
    ADD CONSTRAINT cv_analyses_session_id_fkey
    FOREIGN KEY (session_id)
    REFERENCES sessions(id)
    ON DELETE CASCADE
  `)

  await pool.query(`
    ALTER TABLE job_comparisons
    ADD CONSTRAINT job_comparisons_session_id_fkey
    FOREIGN KEY (session_id)
    REFERENCES sessions(id)
    ON DELETE CASCADE
  `)

  await pool.query(`
    DROP INDEX IF EXISTS idx_cv_analyses_user_id
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_cv_analyses_session_id
    ON cv_analyses(session_id)
  `)

  await pool.query(`
    DROP INDEX IF EXISTS idx_job_comparisons_user_id
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_job_comparisons_session_id
    ON job_comparisons(session_id)
  `)

  /*
   * El caché por hash ahora es global (no depende de quién
   * subió el CV), así que el índice ya no necesita incluir
   * session_id.
   */

  await pool.query(`
    DROP INDEX IF EXISTS idx_cv_analyses_content_hash
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_cv_analyses_content_hash
    ON cv_analyses(content_hash)
  `)

  await pool.query(`
    DROP INDEX IF EXISTS idx_job_comparisons_comparison_hash
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_job_comparisons_comparison_hash
    ON job_comparisons(comparison_hash)
  `)

  await pool.query(`
    DROP TABLE IF EXISTS users
  `)

  console.log('✅ Tabla sessions creada correctamente')
  console.log(
    '✅ user_id renombrado a session_id en cv_analyses y job_comparisons'
  )
  console.log('✅ Tabla users eliminada')
}

module.exports = { version, up }
