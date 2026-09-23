// @ts-check

const pool = require('../config/database')

/**
 * @param {string} snapshotDate YYYY-MM-DD
 * @param {string} dataVersion
 * @returns {Promise<{ result: Record<string, any>, created_at: Date } | null>}
 */
async function findSnapshot(snapshotDate, dataVersion) {
  const result = await pool.query(
    `
      SELECT result, created_at
      FROM labor_market_snapshots
      WHERE snapshot_date = $1
        AND data_version = $2
    `,
    [snapshotDate, dataVersion]
  )

  return result.rows[0] || null
}

/**
 * Último resumen disponible dentro de la ventana indicada. Se usa como
 * respaldo cuando la generación del día falla (búsqueda web caída,
 * límite de la API...), para no dejar al usuario sin resumen.
 *
 * @param {string} dataVersion
 * @param {number} maxAgeDays
 * @returns {Promise<{ result: Record<string, any>, created_at: Date } | null>}
 */
async function findLatestSnapshot(dataVersion, maxAgeDays) {
  const result = await pool.query(
    `
      SELECT result, created_at
      FROM labor_market_snapshots
      WHERE data_version = $1
        AND snapshot_date >= CURRENT_DATE - $2::int
      ORDER BY snapshot_date DESC
      LIMIT 1
    `,
    [dataVersion, maxAgeDays]
  )

  return result.rows[0] || null
}

/**
 * @param {string} snapshotDate
 * @param {string} dataVersion
 * @param {Record<string, any>} snapshot
 * @returns {Promise<{ result: Record<string, any>, created_at: Date }>}
 */
async function saveSnapshot(snapshotDate, dataVersion, snapshot) {
  await pool.query(
    `
      INSERT INTO labor_market_snapshots (snapshot_date, data_version, result)
      VALUES ($1, $2, $3)
      ON CONFLICT (snapshot_date, data_version) DO NOTHING
    `,
    [snapshotDate, dataVersion, snapshot]
  )

  return /** @type {any} */ (await findSnapshot(snapshotDate, dataVersion))
}

module.exports = {
  findSnapshot,
  findLatestSnapshot,
  saveSnapshot
}
