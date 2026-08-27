const pool = require('../config/database')

async function findAnalysisByContentHash(
  userId,
  contentHash
) {

  const result =
    await pool.query(
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
        WHERE user_id = $1
          AND content_hash = $2
        ORDER BY created_at ASC
        LIMIT 1
      `,
      [
        userId,
        contentHash
      ]
    )

  return result.rows[0] || null
}



    async function createAnalysis(data) {

    const {
      userId,
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
      contentHash
    } = data


  const result = await pool.query(
    `
      INSERT INTO cv_analyses (
        user_id,
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
        content_hash
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
        $12
      )
      RETURNING id, created_at
    `,
    [
      userId,
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
      contentHash
    ]
  )

  return result.rows[0]
}


async function getAllAnalyses(userId) {

  const result =
    await pool.query(
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
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [userId]
    )


  return result.rows
}


async function getAnalysisById(
  id,
  userId
) {

  const result =
    await pool.query(
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
          AND user_id = $2
      `,
      [
        id,
        userId
      ]
    )


  return result.rows[0] || null
}


async function deleteAnalysis(
  id,
  userId
) {

  const result =
    await pool.query(
      `
        DELETE FROM cv_analyses
        WHERE id = $1
          AND user_id = $2
        RETURNING id
      `,
      [
        id,
        userId
      ]
    )


  return result.rows[0] || null
}


module.exports = {
  createAnalysis,
  findAnalysisByContentHash,
  getAllAnalyses,
  getAnalysisById,
  deleteAnalysis
}