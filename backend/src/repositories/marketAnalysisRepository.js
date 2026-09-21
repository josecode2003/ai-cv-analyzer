// @ts-check

const pool = require('../config/database')

/**
 * @typedef {object} MarketAnalysisRow
 * @property {number} id
 * @property {number | null} cv_analysis_id
 * @property {string} profile_signature
 * @property {string | null} occupation
 * @property {string | null} sector
 * @property {string | null} region
 * @property {string} model_version
 * @property {string} data_version
 * @property {string} status
 * @property {Record<string, unknown>} result
 * @property {Date} created_at
 */

/**
 * Busca un Market Analysis ya generado para este perfil.
 *
 * La búsqueda es global (no depende de sesión ni de CV
 * concreto): el mercado laboral de "Enfermero de UCI en
 * Madrid" es el mismo dato para cualquier candidato con ese
 * perfil. Solo se reutiliza si coincide también la versión
 * del modelo y la versión de los datos de mercado, para poder
 * forzar una actualización sin tocar ningún CV.
 *
 * @param {string} profileSignature
 * @param {string} modelVersion
 * @param {string} dataVersion
 * @returns {Promise<MarketAnalysisRow | null>}
 */
async function findByProfileSignature(
  profileSignature,
  modelVersion,
  dataVersion
) {
  const result = await pool.query(
    `
      SELECT
        id,
        cv_analysis_id,
        profile_signature,
        occupation,
        sector,
        region,
        model_version,
        data_version,
        status,
        result,
        created_at
      FROM market_analyses
      WHERE profile_signature = $1
        AND model_version = $2
        AND data_version = $3
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [profileSignature, modelVersion, dataVersion]
  )

  return result.rows[0] || null
}

/**
 * @param {{
 *   cvAnalysisId: number,
 *   profileSignature: string,
 *   occupation: string,
 *   sector: string,
 *   region: string,
 *   modelVersion: string,
 *   dataVersion: string,
 *   status: string,
 *   result: Record<string, unknown>
 * }} data
 * @returns {Promise<Pick<MarketAnalysisRow, 'id' | 'created_at'>>}
 */
async function createMarketAnalysis(data) {
  const {
    cvAnalysisId,
    profileSignature,
    occupation,
    sector,
    region,
    modelVersion,
    dataVersion,
    status,
    result
  } = data

  const inserted = await pool.query(
    `
      INSERT INTO market_analyses (
        cv_analysis_id,
        profile_signature,
        occupation,
        sector,
        region,
        model_version,
        data_version,
        status,
        result
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, created_at
    `,
    [
      cvAnalysisId,
      profileSignature,
      occupation || null,
      sector || null,
      region || null,
      modelVersion,
      dataVersion,
      status,
      result
    ]
  )

  return inserted.rows[0]
}

module.exports = {
  findByProfileSignature,
  createMarketAnalysis
}
