// @ts-check

const pool = require('../config/database')

/**
 * @typedef {object} CvAnalysisRow
 * @property {number} id
 * @property {string} original_filename
 * @property {string} filename
 * @property {number} file_size
 * @property {string} mime_type
 * @property {string | null} candidate_name
 * @property {string | null} candidate_email
 * @property {number | null} score
 * @property {string | null} profile
 * @property {string | null} level
 * @property {Record<string, unknown>} [analysis]
 * @property {string | null} [model_version]
 * @property {Date} created_at
 */

/**
 * @typedef {object} CreateAnalysisInput
 * @property {number} sessionId
 * @property {string} originalFilename
 * @property {string} filename
 * @property {number} fileSize
 * @property {string} mimeType
 * @property {string | null} candidateName
 * @property {string | null} candidateEmail
 * @property {number | null} score
 * @property {string | null} profile
 * @property {string | null} level
 * @property {Record<string, unknown>} analysis
 * @property {string} contentHash
 * @property {string} modelVersion
 */

/**
 * Busca un análisis ya existente para ESTA sesión.
 *
 * Se comprueba primero porque, si el propio visitante ya
 * subió este CV antes, no hace falta ni siquiera crear una
 * fila nueva: se le devuelve directamente la suya.
 *
 * @param {number} sessionId
 * @param {string} contentHash
 * @returns {Promise<CvAnalysisRow | null>}
 */
async function findAnalysisByContentHash(sessionId, contentHash) {
  const result = await pool.query(
    `
        SELECT
          id,
          original_filename,
          filename,
          file_size,
          mime_type,
          candidate_name,
          candidate_email,
          score,
          profile,
          level,
          analysis,
          created_at
        FROM cv_analyses
        WHERE session_id = $1
          AND content_hash = $2
        ORDER BY created_at ASC
        LIMIT 1
      `,
    [sessionId, contentHash]
  )

  return result.rows[0] || null
}

/**
 * Busca un análisis ya existente para este contenido de CV,
 * generado por CUALQUIER sesión, siempre que se generase con
 * la misma versión de modelo/prompt.
 *
 * El contenido de un CV (una vez normalizado) no depende de
 * quién lo sube: si dos visitantes distintos suben el mismo
 * CV, no hay ninguna razón para pagar dos veces la llamada a
 * OpenAI. Se usa como segundo intento, tras comprobar primero
 * la propia sesión.
 *
 * @param {string} contentHash
 * @param {string} modelVersion
 * @returns {Promise<CvAnalysisRow | null>}
 */
async function findAnalysisByContentHashGlobal(contentHash, modelVersion) {
  const result = await pool.query(
    `
        SELECT
          id,
          original_filename,
          filename,
          file_size,
          mime_type,
          candidate_name,
          candidate_email,
          score,
          profile,
          level,
          analysis,
          created_at
        FROM cv_analyses
        WHERE content_hash = $1
          AND model_version = $2
        ORDER BY created_at ASC
        LIMIT 1
      `,
    [contentHash, modelVersion]
  )

  return result.rows[0] || null
}

/**
 * @param {CreateAnalysisInput} data
 * @returns {Promise<Pick<CvAnalysisRow, 'id' | 'created_at'>>}
 */
async function createAnalysis(data) {
  const {
    sessionId,
    originalFilename,
    filename,
    fileSize,
    mimeType,
    candidateName,
    candidateEmail,
    score,
    profile,
    level,
    analysis,
    contentHash,
    modelVersion
  } = data

  const result = await pool.query(
    `
      INSERT INTO cv_analyses (
        session_id,
        original_filename,
        filename,
        file_size,
        mime_type,
        candidate_name,
        candidate_email,
        score,
        profile,
        level,
        analysis,
        content_hash,
        model_version
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13
      )
      RETURNING id, created_at
    `,
    [
      sessionId,
      originalFilename,
      filename,
      fileSize,
      mimeType,
      candidateName,
      candidateEmail,
      score,
      profile,
      level,
      analysis,
      contentHash,
      modelVersion || null
    ]
  )

  return result.rows[0]
}

/**
 * @param {number} sessionId
 * @returns {Promise<Omit<CvAnalysisRow, 'analysis'>[]>}
 */
async function getAllAnalyses(sessionId) {
  const result = await pool.query(
    `
        SELECT
          id,
          original_filename,
          filename,
          file_size,
          mime_type,
          candidate_name,
          candidate_email,
          score,
          profile,
          level,
          created_at
        FROM cv_analyses
        WHERE session_id = $1
        ORDER BY created_at DESC
      `,
    [sessionId]
  )

  return result.rows
}

/**
 * @param {number} id
 * @param {number} sessionId
 * @returns {Promise<CvAnalysisRow | null>}
 */
async function getAnalysisById(id, sessionId) {
  const result = await pool.query(
    `
        SELECT
          id,
          original_filename,
          filename,
          file_size,
          mime_type,
          candidate_name,
          candidate_email,
          score,
          profile,
          level,
          analysis,
          created_at
        FROM cv_analyses
        WHERE id = $1
          AND session_id = $2
      `,
    [id, sessionId]
  )

  return result.rows[0] || null
}

/**
 * @param {number} id
 * @param {number} sessionId
 * @returns {Promise<Pick<CvAnalysisRow, 'id'> | null>}
 */
async function deleteAnalysis(id, sessionId) {
  const result = await pool.query(
    `
        DELETE FROM cv_analyses
        WHERE id = $1
          AND session_id = $2
        RETURNING id
      `,
    [id, sessionId]
  )

  return result.rows[0] || null
}

module.exports = {
  createAnalysis,
  findAnalysisByContentHash,
  findAnalysisByContentHashGlobal,
  getAllAnalyses,
  getAnalysisById,
  deleteAnalysis
}
