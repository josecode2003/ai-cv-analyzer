const express = require('express')
const fs = require('fs')
const { rateLimit } = require('express-rate-limit')

const upload = require('../middleware/uploadMiddleware')

const { cleanCVText } = require('../services/textService')

const { analyzeCV, CV_ANALYSIS_VERSION } = require('../services/aiService')

const { createCVHash } = require('../services/hashService')

const {
  createAnalysis,
  findAnalysisByContentHash,
  findAnalysisByContentHashGlobal,
  getAllAnalyses,
  getAnalysisById,
  deleteAnalysis
} = require('../repositories/cvAnalysisRepository')

const router = express.Router()

/* =========================================================
   RATE LIMITING
   ========================================================= */

const analysisLimiter =
  process.env.NODE_ENV === 'test'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: {
          status: 'error',
          message: 'Has alcanzado el límite de análisis. Inténtalo más tarde.'
        }
      })

/* =========================================================
   ANALIZAR CV
   POST /api/cv
   ========================================================= */

router.post('/', analysisLimiter, upload.single('cv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: 'No se ha recibido ningún archivo'
    })
  }

  try {
    /*
     * Cargamos pdfService solamente cuando
     * realmente necesitamos procesar un PDF.
     *
     * Esto evita inicializar pdf-parse/@napi-rs/canvas
     * en tests de autenticación o health.
     */

    const { extractTextFromPDF } = require('../services/pdfService')

    const extractedText = await extractTextFromPDF(req.file.path)

    const cleanedText = cleanCVText(extractedText)

    if (!cleanedText) {
      return res.status(422).json({
        status: 'error',
        message: 'No se pudo extraer texto del PDF'
      })
    }

    /*
     * Generamos una huella única del contenido
     * real del CV.
     *
     * Si el usuario vuelve a subir exactamente
     * el mismo CV, tendrá el mismo hash.
     */

    const contentHash = createCVHash(cleanedText)

    /*
     * Comprobamos si este CV ya fue analizado
     * anteriormente por esta misma sesión.
     */

    const existingAnalysis = await findAnalysisByContentHash(
      req.sessionId,
      contentHash
    )

    /*
     * Si ya existe, NO llamamos a OpenAI.
     *
     * Devolvemos exactamente el análisis
     * que ya estaba almacenado.
     */

    if (existingAnalysis) {
      return res.status(200).json({
        status: 'success',

        message: 'Este CV ya había sido analizado anteriormente',

        file: {
          originalName: existingAnalysis.original_filename,

          filename: existingAnalysis.filename,

          size: existingAnalysis.file_size,

          mimetype: existingAnalysis.mime_type
        },

        analysis: existingAnalysis.analysis,

        saved: {
          id: existingAnalysis.id,

          createdAt: existingAnalysis.created_at
        },

        cached: true
      })
    }

    /*
     * El contenido de un CV no depende de quién lo sube:
     * si CUALQUIER otra sesión ya analizó exactamente este
     * mismo contenido con la versión actual del modelo,
     * reutilizamos ese resultado en vez de volver a pagar
     * la llamada a OpenAI. Se guarda igualmente como una
     * fila propia de esta sesión para que su historial y
     * borrado funcionen de forma independiente.
     */

    const globalMatch = await findAnalysisByContentHashGlobal(
      contentHash,
      CV_ANALYSIS_VERSION
    )

    const analysis = globalMatch
      ? globalMatch.analysis
      : await analyzeCV(cleanedText)

    const savedAnalysis = await createAnalysis({
      sessionId: req.sessionId,

      originalFilename: req.file.originalname,

      filename: req.file.filename,

      fileSize: req.file.size,

      mimeType: req.file.mimetype,

      candidateName: analysis.personalInfo?.name || null,

      candidateEmail: analysis.personalInfo?.email || null,

      score: analysis.score?.overall ?? null,

      profile: analysis.overallAssessment?.profile || null,

      level: analysis.overallAssessment?.level || null,

      analysis,

      contentHash,

      modelVersion: CV_ANALYSIS_VERSION
    })

    if (globalMatch) {
      return res.status(200).json({
        status: 'success',

        message: 'Este CV ya había sido analizado anteriormente',

        file: {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype
        },

        analysis,

        saved: {
          id: savedAnalysis.id,
          createdAt: savedAnalysis.created_at
        },

        cached: true
      })
    }

    return res.status(201).json({
      status: 'success',

      message: 'CV analizado correctamente',

      file: {
        originalName: req.file.originalname,

        filename: req.file.filename,

        size: req.file.size,

        mimetype: req.file.mimetype
      },

      analysis,

      saved: {
        id: savedAnalysis.id,

        createdAt: savedAnalysis.created_at
      },

      cached: false
    })
  } catch (error) {
    console.error('Error procesando el CV:', error)

    return res.status(500).json({
      status: 'error',

      message: 'No se pudo procesar el CV'
    })
  } finally {
    /*
     * El PDF es temporal.
     * Lo eliminamos después del procesamiento.
     */

    if (req.file?.path) {
      try {
        await fs.promises.unlink(req.file.path)

        console.log(`Archivo temporal eliminado: ${req.file.filename}`)
      } catch (error) {
        console.error('No se pudo eliminar el archivo temporal:', error.message)
      }
    }
  }
})

/* =========================================================
   OBTENER TODOS LOS ANÁLISIS DEL USUARIO
   GET /api/cv
   ========================================================= */

router.get('/', async (req, res) => {
  try {
    const analyses = await getAllAnalyses(req.sessionId)

    return res.status(200).json({
      status: 'success',

      count: analyses.length,

      analyses
    })
  } catch (error) {
    console.error('Error obteniendo los análisis:', error)

    return res.status(500).json({
      status: 'error',

      message: 'No se pudieron obtener los análisis'
    })
  }
})

/* =========================================================
   OBTENER UN ANÁLISIS
   GET /api/cv/:id
   ========================================================= */

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      status: 'error',

      message: 'El ID del análisis no es válido'
    })
  }

  try {
    const analysis = await getAnalysisById(id, req.sessionId)

    if (!analysis) {
      return res.status(404).json({
        status: 'error',

        message: 'Análisis no encontrado'
      })
    }

    return res.status(200).json({
      status: 'success',

      analysis
    })
  } catch (error) {
    console.error('Error obteniendo el análisis:', error)

    return res.status(500).json({
      status: 'error',

      message: 'No se pudo obtener el análisis'
    })
  }
})

/* =========================================================
   ELIMINAR UN ANÁLISIS
   DELETE /api/cv/:id
   ========================================================= */

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      status: 'error',

      message: 'El ID del análisis no es válido'
    })
  }

  try {
    const deletedAnalysis = await deleteAnalysis(id, req.sessionId)

    if (!deletedAnalysis) {
      return res.status(404).json({
        status: 'error',

        message: 'Análisis no encontrado'
      })
    }

    return res.status(200).json({
      status: 'success',

      message: 'Análisis eliminado correctamente',

      deletedId: deletedAnalysis.id
    })
  } catch (error) {
    console.error('Error eliminando el análisis:', error)

    return res.status(500).json({
      status: 'error',

      message: 'No se pudo eliminar el análisis'
    })
  }
})

module.exports = router
