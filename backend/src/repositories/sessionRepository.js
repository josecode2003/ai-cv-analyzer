// @ts-check

const pool = require('../config/database')

/**
 * @typedef {object} SessionRow
 * @property {number} id
 * @property {Date} created_at
 */

/**
 * @returns {Promise<SessionRow>}
 */
async function createSession() {
  const result = await pool.query(`
    INSERT INTO sessions DEFAULT VALUES
    RETURNING id, created_at
  `)

  return result.rows[0]
}

/**
 * @param {number} id
 * @returns {Promise<boolean>}
 */
async function sessionExists(id) {
  const result = await pool.query(
    `
      SELECT 1
      FROM sessions
      WHERE id = $1
    `,
    [id]
  )

  return result.rowCount > 0
}

module.exports = {
  createSession,
  sessionExists
}
