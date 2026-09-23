const express = require('express')
const { rateLimit } = require('express-rate-limit')

const {
  getGeneralMarketSummary,
  analyzeProfessionDemand,
  MARKET_ANALYSIS_VERSION,
  MARKET_DATA_VERSION
} = require('../services/marketAnalysisService')

const { createHash } = require('../services/hashService')

const { toOccupationKey, SECTORS } = require('../services/rubricService')

const { getAnalysisById } = require('../repositories/cvAnalysisRepository')

const {
  findByProfileSignature,
  createMarketAnalysis
} = require('../repositories/marketAnalysisRepository')

const router = express.Router()

/*
 * La demanda de una profesión no cambia de un día para otro: la nota
 * se reutiliza durante un mes para cualquier CV de esa profesión.
 */
const PROFESSION_NOTE_MAX_AGE_DAYS = 30

/* =========================================================
   RATE LIMITING
   ========================================================= */

const marketAnalysisLimiter =
  process.env.NODE_ENV === 'test'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 15,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: {
          status: 'error',
          message:
            'Has alcanzado el límite de análisis de mercado. Inténtalo más tarde.'
        }
      })

/*
 * Los análisis anteriores al baremo solo tienen la ocupación en texto
 * libre (escrita por el modelo tras leer el CV). La nota de mercado se
 * comparte entre usuarios, así que solo se genera para ocupaciones con
 * forma de nombre de profesión.
 */
const MAX_OCCUPATION_CHARS = 60

/*
 * Varias peticiones simultáneas para la misma profesión comparten una
 * única búsqueda web.
 */
const inFlightNotes = new Map()

/**
 * @param {number} cvAnalysisId
 * @param {{ occupation: string, sector?: string }} profile
 */
async function getProfessionNote(cvAnalysisId, profile) {
  const profileSignature = createHash(
    `profession-demand|${toOccupationKey(profile.occupation)}`
  )

  const cached = await findByProfileSignature(
    profileSignature,
    MARKET_ANALYSIS_VERSION,
    MARKET_DATA_VERSION,
    PROFESSION_NOTE_MAX_AGE_DAYS
  )

  if (cached) {
    return cached.result
  }

  if (!inFlightNotes.has(profileSignature)) {
    const pending = analyzeProfessionDemand(profile)
      .then(async result => {
        await createMarketAnalysis({
          cvAnalysisId,
          profileSignature,
          occupation: profile.occupation,
          sector: profile.sector,
          region: '',
          modelVersion: MARKET_ANALYSIS_VERSION,
          dataVersion: MARKET_DATA_VERSION,
          status:
            result.demandLevel === 'sin_datos' ? 'insufficient_data' : 'ready',
          result
        })

        return result
      })
      .finally(() => inFlightNotes.delete(profileSignature))

    inFlightNotes.set(profileSignature, pending)
  }

  return inFlightNotes.get(profileSignature)
}

/* =========================================================
   ANALIZAR MERCADO LABORAL PARA UN CV
   POST /api/cv/:id/market-analysis
   ========================================================= */

router.post('/:id/market-analysis', marketAnalysisLimiter, async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'El ID del análisis no es válido'
    })
  }

  try {
    const cvAnalysis = await getAnalysisById(id, req.sessionId)

    if (!cvAnalysis) {
      return res.status(404).json({
        status: 'error',
        message: 'Análisis no encontrado'
      })
    }

    /*
     * La profesión evaluada por el baremo (evaluation.occupation) es el
     * nombre canónico; los análisis anteriores solo tienen el perfil.
     */
    const analysis = cvAnalysis.analysis || {}

    const candidateOccupation = String(
      analysis.evaluation?.occupation ||
        analysis.professionalProfile?.occupation ||
        ''
    ).trim()

    const occupation =
      candidateOccupation.length <= MAX_OCCUPATION_CHARS &&
      toOccupationKey(candidateOccupation)
        ? candidateOccupation
        : ''

    const candidateSector =
      analysis.evaluation?.sector || analysis.professionalProfile?.sector || ''

    const sector = SECTORS.includes(candidateSector) ? candidateSector : ''

    /*
     * Una fuente externa caída no debe romper la petición: cada parte
     * se resuelve por separado y la que falle simplemente no se
     * muestra, en vez de rellenar el hueco con algo inventado.
     */
    const [general, profession] = await Promise.all([
      getGeneralMarketSummary().catch(error => {
        console.error('Error obteniendo el resumen general del mercado:', error)
        return null
      }),
      occupation
        ? getProfessionNote(id, { occupation, sector }).catch(error => {
            console.error('Error obteniendo la demanda de la profesión:', error)
            return null
          })
        : Promise.resolve(null)
    ])

    if (!general && !profession) {
      return res.status(200).json({
        status: 'success',
        available: false,
        message:
          'No se pudo obtener la información del mercado laboral en este momento. Inténtalo de nuevo más tarde.'
      })
    }

    return res.status(200).json({
      status: 'success',
      available: true,
      generatedAt: new Date().toISOString(),
      marketAnalysis: {
        version: 2,
        general,
        profession
      }
    })
  } catch (error) {
    console.error('Error procesando el análisis de mercado:', error)

    return res.status(500).json({
      status: 'error',
      message: 'No se pudo procesar el análisis de mercado'
    })
  }
})

module.exports = router
