const pool = require('../config/database')


async function createComparison({
  userId,
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
        user_id,
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
      userId,
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

async function findComparisonByHash(
  userId,
  comparisonHash
) {

  const response =
    await pool.query(
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
        WHERE user_id = $1
          AND comparison_hash = $2
        LIMIT 1
      `,
      [
        userId,
        comparisonHash
      ]
    )

  return response.rows[0] || null
}

async function getComparisonsByUser(userId) {

  const response = await pool.query(
    `
      SELECT
        id,
        cv_analysis_id,
        job_title,
        compatibility_score,
        created_at
      FROM job_comparisons
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [userId]
  )

  return response.rows
}


async function getComparisonById(
  id,
  userId
) {

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
        AND user_id = $2
    `,
    [
      id,
      userId
    ]
  )

  return response.rows[0] || null
}


async function deleteComparison(
  id,
  userId
) {

  const response = await pool.query(
    `
      DELETE FROM job_comparisons
      WHERE id = $1
        AND user_id = $2
      RETURNING id
    `,
    [
      id,
      userId
    ]
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