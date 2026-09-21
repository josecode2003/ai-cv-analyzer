const express = require('express')
const { rateLimit } = require('express-rate-limit')

const {
  analyzeMarketForProfile,
  MARKET_ANALYSIS_VERSION,
  MARKET_DATA_VERSION
} = require('../services/marketAnalysisService')

const { createProfileSignature } = require('../services/hashService')

const { getAnalysisById } = require('../repositories/cvAnalysisRepository')

const {
  findByProfileSignature,
  createMarketAnalysis
} = require('../repositories/marketAnalysisRepository')

const router = express.Router()

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

    const profile = cvAnalysis.analysis?.professionalProfile

    /*
     * El CV Analysis y el Market Analysis son procesos
     * desacoplados (ver README): este endpoint nunca
     * reprocesa el CV, solo lee el perfil ya extraído.
     *
     * Un análisis antiguo, generado antes de que existiera
     * `professionalProfile`, no tiene perfil que consultar.
     */

    if (!profile || !profile.occupation) {
      return res.status(200).json({
        status: 'success',
        available: false,
        message:
          'No se pudo determinar un perfil profesional para este CV, así que no es posible analizar el mercado laboral asociado.'
      })
    }

    const profileSignature = createProfileSignature(profile)

    const cached = await findByProfileSignature(
      profileSignature,
      MARKET_ANALYSIS_VERSION,
      MARKET_DATA_VERSION
    )

    if (cached) {
      return res.status(200).json({
        status: 'success',
        available: true,
        cached: true,
        marketAnalysis: cached.result,
        generatedAt: cached.created_at
      })
    }

    let result

    try {
      result = await analyzeMarketForProfile(profile)
    } catch (marketError) {
      /*
       * Una fuente externa caída no debe romper el análisis
       * del CV, que ya se generó y guardó correctamente antes.
       * Informamos explícitamente de que este indicador no
       * está disponible, en vez de fallar con un 500 o, peor,
       * rellenar el hueco con una respuesta inventada.
       */

      console.error('Error obteniendo el análisis de mercado:', marketError)

      return res.status(200).json({
        status: 'success',
        available: false,
        message:
          'No se pudo obtener el análisis de mercado laboral en este momento. Inténtalo de nuevo más tarde.'
      })
    }

    const saved = await createMarketAnalysis({
      cvAnalysisId: id,
      profileSignature,
      occupation: profile.occupation,
      sector: profile.sector,
      region: profile.region || profile.location,
      modelVersion: MARKET_ANALYSIS_VERSION,
      dataVersion: MARKET_DATA_VERSION,
      status:
        result.dataSufficiency === 'insufficient'
          ? 'insufficient_data'
          : 'ready',
      result
    })

    return res.status(201).json({
      status: 'success',
      available: true,
      cached: false,
      marketAnalysis: result,
      generatedAt: saved.created_at
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
