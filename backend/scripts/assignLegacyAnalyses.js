require('dotenv').config()

const pool = require('../src/config/database')

async function assignLegacyAnalyses() {

  const email =
    process.argv[2]

  if (!email) {

    console.error(
      'Uso: node scripts/assignLegacyAnalyses.js email@ejemplo.com'
    )

    process.exit(1)
  }


  try {

    const userResult =
      await pool.query(
        `
          SELECT id
          FROM users
          WHERE email = $1
        `,
        [
          email.trim().toLowerCase()
        ]
      )


    if (!userResult.rows[0]) {

      throw new Error(
        'Usuario no encontrado'
      )
    }


    const userId =
      userResult.rows[0].id


    const result =
      await pool.query(
        `
          UPDATE cv_analyses
          SET user_id = $1
          WHERE user_id IS NULL
        `,
        [userId]
      )


    console.log(
      `✅ ${result.rowCount} análisis asignados al usuario ${email}`
    )

  } catch (error) {

    console.error(
      '❌ Error asignando análisis:',
      error.message
    )

  } finally {

    await pool.end()
  }
}

assignLegacyAnalyses()