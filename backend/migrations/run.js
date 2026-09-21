require('dotenv').config()

const fs = require('fs')
const path = require('path')

const migrationFiles = fs
  .readdirSync(__dirname)
  .filter(file => /^\d+_.*\.js$/.test(file))
  .sort()

async function run() {
  /*
   * 001_create_database gestiona su propia conexión,
   * porque en ese punto la base de datos del proyecto
   * puede no existir todavía.
   */

  const createDatabase = require('./001_create_database')

  await createDatabase.up()

  /*
   * A partir de aquí ya existe la base de datos,
   * así que podemos usar el pool compartido de la app.
   */

  const pool = require('../src/config/database')

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    for (const file of migrationFiles) {
      if (file === '001_create_database.js') {
        continue
      }

      const migration = require(path.join(__dirname, file))

      const alreadyApplied = await pool.query(
        'SELECT 1 FROM schema_migrations WHERE version = $1',
        [migration.version]
      )

      if (alreadyApplied.rowCount > 0) {
        console.log(`⏭️  ${migration.version} ya aplicada, se omite`)
        continue
      }

      await migration.up(pool)

      await pool.query('INSERT INTO schema_migrations (version) VALUES ($1)', [
        migration.version
      ])

      console.log(`✅ Migración ${migration.version} aplicada`)
    }

    console.log('🎉 Todas las migraciones están al día')
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:')
    console.error(error.message)

    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

run()
