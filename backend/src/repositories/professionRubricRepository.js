// @ts-check

const pool = require('../config/database')

/**
 * @param {string} occupationKey
 * @param {string} rubricVersion
 * @returns {Promise<Record<string, any> | null>}
 */
async function findRubric(occupationKey, rubricVersion) {
  const result = await pool.query(
    `
      SELECT rubric
      FROM profession_rubrics
      WHERE occupation_key = $1
        AND rubric_version = $2
    `,
    [occupationKey, rubricVersion]
  )

  return result.rows[0]?.rubric || null
}

/**
 * Si dos análisis de la misma profesión generan el baremo a la vez,
 * se queda el primero que llega a la base de datos y ambos usan ese:
 * nunca pueden convivir dos baremos para la misma profesión.
 *
 * @param {{ occupationKey: string, rubricVersion: string, occupation: string, sector: string, rubric: Record<string, any> }} data
 * @returns {Promise<Record<string, any>>}
 */
async function saveRubric(data) {
  const { occupationKey, rubricVersion, occupation, sector, rubric } = data

  await pool.query(
    `
      INSERT INTO profession_rubrics (
        occupation_key,
        rubric_version,
        occupation,
        sector,
        rubric
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (occupation_key, rubric_version) DO NOTHING
    `,
    [occupationKey, rubricVersion, occupation, sector || null, rubric]
  )

  return /** @type {Record<string, any>} */ (
    await findRubric(occupationKey, rubricVersion)
  )
}

module.exports = {
  findRubric,
  saveRubric
}
