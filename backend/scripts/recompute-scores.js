// @ts-check

require('dotenv').config({ quiet: true })

const pool = require('../src/config/database')

const { computeOverallScore } = require('../src/services/aiService')

/**
 * Corrige de forma puntual las filas de `cv_analyses` cuyo
 * `overall` (tanto en la columna `score` como en
 * `analysis->score->overall`) fue "adivinado" por el modelo en
 * lugar de calculado con la fórmula del prompt (ver rule 50 en
 * aiService.js). Recalcula `overall` de forma determinista a
 * partir de las subpuntuaciones YA guardadas en cada fila y,
 * cuando difiere, actualiza ambos sitios en un único UPDATE.
 */
async function recomputeScores() {
  const { rows } = await pool.query(
    'SELECT id, candidate_name, score, analysis FROM cv_analyses WHERE analysis IS NOT NULL'
  )

  let correctedCount = 0

  for (const row of rows) {
    const storedScore = row.analysis?.score

    /*
     * Filas sin subpuntuaciones completas (analysis previo a
     * este esquema, o corrupto) no se pueden recalcular con
     * fiabilidad: se omiten en lugar de arriesgarse a escribir
     * un NaN.
     */
    if (
      !storedScore ||
      typeof storedScore.experience !== 'number' ||
      typeof storedScore.skills !== 'number' ||
      typeof storedScore.education !== 'number' ||
      typeof storedScore.projects !== 'number' ||
      typeof storedScore.presentation !== 'number'
    ) {
      continue
    }

    const recomputedOverall = computeOverallScore(storedScore)

    const oldOverall = storedScore.overall

    if (recomputedOverall === oldOverall && recomputedOverall === row.score) {
      continue
    }

    await pool.query(
      `UPDATE cv_analyses
       SET score = $1,
           analysis = jsonb_set(analysis, '{score,overall}', to_jsonb($1::int))
       WHERE id = $2`,
      [recomputedOverall, row.id]
    )

    correctedCount += 1

    console.log(
      `Fila id=${row.id} (${row.candidate_name || 'sin nombre'}): ${oldOverall} → ${recomputedOverall} (columna score: ${row.score} → ${recomputedOverall})`
    )
  }

  console.log(`\nTotal de filas corregidas: ${correctedCount} de ${rows.length} analizadas.`)
}

recomputeScores()
  .catch(error => {
    console.error('❌ Error recomputando scores:', error)
    process.exitCode = 1
  })
  .finally(() => {
    pool.end()
  })
