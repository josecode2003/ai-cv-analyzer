require('dotenv').config({ quiet: true })

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const multer = require('multer')
const cookieParser = require('cookie-parser')

const cvRoutes = require('./routes/cvRoutes')
const marketRoutes = require('./routes/marketRoutes')
const { attachSession } = require('./middleware/sessionMiddleware')

const app = express()

const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'

const jobComparisonRoutes = require('./routes/jobComparisonRoutes')

/* =========================================================
   SECURITY
   ========================================================= */

app.disable('x-powered-by')

app.use(helmet())

/* =========================================================
   CORS
   ========================================================= */

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
  })
)

/* =========================================================
   BODY
   ========================================================= */

app.use(
  express.json({
    limit: '100kb'
  })
)

app.use(
  express.urlencoded({
    extended: false,
    limit: '100kb'
  })
)

/* =========================================================
   HEALTH
   Antes de la sesión: un ping de monitorización no
   necesita crear una sesión anónima en la base de datos.
   ========================================================= */

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'AI CV Analyzer API funcionando correctamente'
  })
})

/* =========================================================
   SESIÓN
   No hay login ni registro: cada visitante recibe una
   sesión anónima identificada por una cookie firmada.
   ========================================================= */

app.use(cookieParser(process.env.COOKIE_SECRET))

app.use(attachSession)

/* =========================================================
   ROUTES
   ========================================================= */

app.use('/api/cv', cvRoutes)
app.use('/api/cv', marketRoutes)

/* =========================================================
   JOB COMPARISONS
   ========================================================= */

app.use('/api', jobComparisonRoutes)

/* =========================================================
   404
   ========================================================= */

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Ruta no encontrada'
  })
})

/* =========================================================
   ERROR HANDLER
   ========================================================= */

app.use((error, req, res, _next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('Error no controlado:', error)
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        status: 'error',
        message: 'El archivo no puede superar los 5 MB.'
      })
    }

    return res.status(400).json({
      status: 'error',
      message: 'Error procesando el archivo'
    })
  }

  if (error.message === 'Solo se permiten archivos PDF') {
    return res.status(400).json({
      status: 'error',
      message: error.message
    })
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      status: 'error',
      message: 'La petición es demasiado grande'
    })
  }

  return res.status(error.status || 500).json({
    status: 'error',

    message:
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'Error interno del servidor'
  })
})

module.exports = app
