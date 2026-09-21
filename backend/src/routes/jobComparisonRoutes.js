const express = require('express')
const { rateLimit } = require('express-rate-limit')

const { getAnalysisById } = require('../repositories/cvAnalysisRepository')

const {
  createComparison,
  findComparisonByHash,
  getComparisonsByUser,
  getComparisonById,
  deleteComparison
} = require('../repositories/jobComparisonRepository')

const { compareCVWithJobOffer } = require('../services/jobComparisonService')

const { createComparisonHash } = require('../services/hashService')
const router = express.Router()

function formatComparison(comparison) {
  if (!comparison) {
    return null
  }

  const cvAnalysisId = comparison.cv_analysis_id ?? comparison.cvAnalysisId

  const jobTitle = comparison.job_title ?? comparison.jobTitle

  const jobOfferText = comparison.job_offer_text ?? comparison.jobOfferText

  const compatibilityScore =
    comparison.compatibility_score ?? comparison.compatibilityScore

  const result = comparison.result

  const createdAt = comparison.created_at ?? comparison.createdAt

  return {
    /*
     * Formato utilizado por el frontend.
     */

    id: comparison.id,

    cvAnalysisId,

    jobTitle,

    jobOfferText,

    compatibilityScore,

    result,

    createdAt,

    /*
     * Formato original de PostgreSQL.
     */

    cv_analysis_id: cvAnalysisId,

    job_title: jobTitle,

    job_offer_text: jobOfferText,

    compatibility_score: compatibilityScore,

    created_at: createdAt
  }
}
/* =========================================================
   RATE LIMITING
   ========================================================= */

const comparisonLimiter =
  process.env.NODE_ENV === 'test'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: {
          status: 'error',
          message:
            'Has alcanzado el límite de comparaciones. Inténtalo más tarde.'
        }
      })

/* =========================================================
   CREAR COMPARACIÓN
   POST /api/cv/:id/compare
   ========================================================= */

router.post('/cv/:id/compare', comparisonLimiter, async (req, res) => {
  const cvId = Number(req.params.id)

  if (!Number.isInteger(cvId) || cvId <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'El ID del CV no es válido'
    })
  }

  const { jobTitle, jobOfferText } = req.body

  if (typeof jobOfferText !== 'string' || !jobOfferText.trim()) {
    return res.status(400).json({
      status: 'error',
      message: 'La oferta de empleo es obligatoria'
    })
  }

  const normalizedJobOffer = jobOfferText.trim()

  if (normalizedJobOffer.length < 50) {
    return res.status(400).json({
      status: 'error',
      message: 'La oferta de empleo debe tener al menos 50 caracteres'
    })
  }

  if (normalizedJobOffer.length > 30000) {
    return res.status(413).json({
      status: 'error',
      message: 'La oferta de empleo es demasiado larga'
    })
  }

  const normalizedJobTitle = typeof jobTitle === 'string' ? jobTitle.trim() : ''

  if (normalizedJobTitle.length > 255) {
    return res.status(400).json({
      status: 'error',
      message: 'El título de la oferta no puede superar los 255 caracteres'
    })
  }

  try {
    /*
     * Comprobamos que el CV pertenece
     * al usuario autenticado.
     */

    const cvAnalysis = await getAnalysisById(cvId, req.sessionId)

    if (!cvAnalysis) {
      return res.status(404).json({
        status: 'error',
        message: 'Análisis de CV no encontrado'
      })
    }

    /*
     * Generamos una huella única de la comparación.
     *
     * La comparación depende de:
     * - el análisis del CV
     * - la oferta
     * - el título de la oferta
     */

    const comparisonHash = createComparisonHash(
      cvAnalysis.analysis,
      normalizedJobTitle,
      normalizedJobOffer
    )

    /*
     * Comprobamos si esta misma comparación
     * ya fue realizada anteriormente por este usuario.
     */

    const existingComparison = await findComparisonByHash(
      req.sessionId,
      comparisonHash
    )

    /*
     * Si ya existe, devolvemos el resultado
     * almacenado y NO llamamos a OpenAI.
     */

    if (existingComparison) {
      return res.status(200).json({
        status: 'success',

        message: 'Esta comparación ya había sido realizada anteriormente',

        comparison: formatComparison(existingComparison),

        cached: true
      })
    }

    /*
     * No existe una comparación anterior.
     * Ahora sí llamamos a OpenAI.
     */

    const comparison = await compareCVWithJobOffer(
      cvAnalysis.analysis,
      normalizedJobOffer,
      normalizedJobTitle
    )

    const savedComparison = await createComparison({
      sessionId: req.sessionId,

      cvAnalysisId: cvId,

      jobTitle: normalizedJobTitle || null,

      jobOfferText: normalizedJobOffer,

      compatibilityScore: comparison.compatibilityScore,

      result: comparison,

      comparisonHash
    })

    return res.status(201).json({
      status: 'success',

      message: 'Comparación realizada correctamente',

      comparison: formatComparison({
        id: savedComparison.id,

        cv_analysis_id: cvId,

        job_title: normalizedJobTitle,

        job_offer_text: normalizedJobOffer,

        compatibility_score: comparison.compatibilityScore,

        result: comparison,

        created_at: savedComparison.created_at
      }),

      cached: false
    })
  } catch (error) {
    console.error('Error comparando CV con oferta:', error)

    return res.status(500).json({
      status: 'error',

      message: 'No se pudo comparar el CV con la oferta de empleo'
    })
  }
})

/* =========================================================
   LISTAR COMPARACIONES
   GET /api/comparisons
   ========================================================= */

router.get('/comparisons', async (req, res) => {
  try {
    const comparisons = await getComparisonsByUser(req.sessionId)

    return res.status(200).json({
      status: 'success',

      count: comparisons.length,

      comparisons: comparisons.map(formatComparison)
    })
  } catch (error) {
    console.error('Error obteniendo comparaciones:', error)

    return res.status(500).json({
      status: 'error',

      message: 'No se pudieron obtener las comparaciones'
    })
  }
})

/* =========================================================
   OBTENER UNA COMPARACIÓN
   GET /api/comparisons/:id
   ========================================================= */

router.get('/comparisons/:id', async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      status: 'error',

      message: 'El ID de la comparación no es válido'
    })
  }

  try {
    const comparison = await getComparisonById(id, req.sessionId)

    if (!comparison) {
      return res.status(404).json({
        status: 'error',

        message: 'Comparación no encontrada'
      })
    }

    return res.status(200).json({
      status: 'success',

      comparison: formatComparison(comparison)
    })
  } catch (error) {
    console.error('Error obteniendo comparación:', error)

    return res.status(500).json({
      status: 'error',

      message: 'No se pudo obtener la comparación'
    })
  }
})

/* =========================================================
   ELIMINAR COMPARACIÓN
   DELETE /api/comparisons/:id
   ========================================================= */

router.delete('/comparisons/:id', async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      status: 'error',

      message: 'El ID de la comparación no es válido'
    })
  }

  try {
    const deletedComparison = await deleteComparison(id, req.sessionId)

    if (!deletedComparison) {
      return res.status(404).json({
        status: 'error',

        message: 'Comparación no encontrada'
      })
    }

    return res.status(200).json({
      status: 'success',

      message: 'Comparación eliminada correctamente',

      deletedId: deletedComparison.id
    })
  } catch (error) {
    console.error('Error eliminando comparación:', error)

    return res.status(500).json({
      status: 'error',

      message: 'No se pudo eliminar la comparación'
    })
  }
})

module.exports = router
