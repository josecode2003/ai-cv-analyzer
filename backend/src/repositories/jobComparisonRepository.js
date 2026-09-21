// @ts-check

const pool = require('../config/database')

/**
 * @typedef {object} JobComparisonRow
 * @property {number} id
 * @property {number} cv_analysis_id
 * @property {string | null} job_title
 * @property {string} [job_offer_text]
 * @property {number | null} compatibility_score
 * @property {Record<string, unknown>} [result]
 * @property {Date} created_at
 */

/**
 * @param {object} params
 * @param {number} params.sessionId
 * @param {number} params.cvAnalysisId
 * @param {string | null} params.jobTitle
 * @param {string} params.jobOfferText
 * @param {number} params.compatibilityScore
 * @param {Record<string, unknown>} params.result
 * @param {string} params.comparisonHash
 * @returns {Promise<Pick<JobComparisonRow, 'id' | 'created_at'>>}
 */
async function createComparison({
  sessionId,
  cvAnalysisId,
  jobTitle,
  jobOfferText,
  compatibilityScore,
  result,
  comparisonHash
}) {
  const response = await pool.query(
    `
      INSERT INTO job_comparisons (
        session_id,
        cv_analysis_id,
        job_title,
        job_offer_text,
        compatibility_score,
        result,
        comparison_hash
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
      )
      RETURNING
        id,
        created_at
    `,
    [
      sessionId,
      cvAnalysisId,
      jobTitle,
      jobOfferText,
      compatibilityScore,
      result,
      comparisonHash
    ]
  )

  return response.rows[0]
}

/**
 * @param {number} sessionId
 * @param {string} comparisonHash
 * @returns {Promise<JobComparisonRow | null>}
 */
async function findComparisonByHash(sessionId, comparisonHash) {
  const response = await pool.query(
    `
        SELECT
          id,
          cv_analysis_id,
          job_title,
          job_offer_text,
          compatibility_score,
          result,
          created_at
        FROM job_comparisons
        WHERE session_id = $1
          AND comparison_hash = $2
        LIMIT 1
      `,
    [sessionId, comparisonHash]
  )

  return response.rows[0] || null
}

/**
 * @param {number} sessionId
 * @returns {Promise<Omit<JobComparisonRow, 'job_offer_text' | 'result'>[]>}
 */
async function getComparisonsByUser(sessionId) {
  const response = await pool.query(
    `
      SELECT
        id,
        cv_analysis_id,
        job_title,
        compatibility_score,
        created_at
      FROM job_comparisons
      WHERE session_id = $1
      ORDER BY created_at DESC
    `,
    [sessionId]
  )

  return response.rows
}

/**
 * @param {number} id
 * @param {number} sessionId
 * @returns {Promise<JobComparisonRow | null>}
 */
async function getComparisonById(id, sessionId) {
  const response = await pool.query(
    `
      SELECT
        id,
        cv_analysis_id,
        job_title,
        job_offer_text,
        compatibility_score,
        result,
        created_at
      FROM job_comparisons
      WHERE id = $1
        AND session_id = $2
    `,
    [id, sessionId]
  )

  return response.rows[0] || null
}

/**
 * @param {number} id
 * @param {number} sessionId
 * @returns {Promise<Pick<JobComparisonRow, 'id'> | null>}
 */
async function deleteComparison(id, sessionId) {
  const response = await pool.query(
    `
      DELETE FROM job_comparisons
      WHERE id = $1
        AND session_id = $2
      RETURNING id
    `,
    [id, sessionId]
  )

  return response.rows[0] || null
}

module.exports = {
  createComparison,
  findComparisonByHash,
  getComparisonsByUser,
  getComparisonById,
  deleteComparison
}
