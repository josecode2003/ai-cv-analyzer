const fs = require('fs')
const path = require('path')

/*
 * Mock del servicio PDF.
 *
 * No queremos cargar pdf-parse/@napi-rs/canvas
 * durante estos tests ni depender de un PDF real.
 */

jest.mock('../src/services/pdfService', () => ({
  extractTextFromPDF: jest.fn(async () => 'Texto de CV de prueba')
}))

/*
 * Mock de OpenAI.
 *
 * Así el test no consume créditos ni depende
 * de la API externa.
 */

jest.mock('../src/services/aiService', () => ({
  analyzeCV: jest.fn(async () => ({
    personalInfo: {
      name: 'Candidato Upload Test',
      email: 'upload@test.com',
      phone: '',
      location: '',
      linkedin: '',
      github: ''
    },

    summary: 'Perfil de prueba para testing.',

    experience: [],

    education: [],

    skills: {
      technical: ['JavaScript', 'Node.js'],

      soft: ['Trabajo en equipo'],

      languages: []
    },

    projects: [],

    certifications: [],

    analysis: {
      strengths: ['Tiene conocimientos técnicos.'],

      weaknesses: ['Es un análisis de prueba.'],

      recommendations: ['Añadir proyectos.']
    },

    score: {
      overall: 80,
      experience: 70,
      skills: 85,
      education: 80,
      projects: 60,
      presentation: 90
    },

    overallAssessment: {
      level: 'Junior',

      profile: 'Desarrollador Web Junior',

      mainIssue: 'Falta de proyectos demostrables.',

      priority: 'medium'
    }
  }))
}))

const pool = require('../src/config/database')

const { createSessionAgent } = require('./helpers/sessionAgent')

const uploadsDirectory = path.join(__dirname, '../../uploads')

describe('CV upload integration', () => {
  let session

  /* =======================================================
     PREPARACIÓN
     ======================================================= */

  beforeAll(async () => {
    session = await createSessionAgent()
  })

  /* =======================================================
     PDF VÁLIDO
     ======================================================= */

  test('debe aceptar un PDF válido, analizarlo y guardarlo', async () => {
    const filesBefore = fs.existsSync(uploadsDirectory)
      ? fs.readdirSync(uploadsDirectory)
      : []

    const response = await session.agent
      .post('/api/cv')
      .attach('cv', Buffer.from('%PDF-1.4 archivo PDF de prueba'), {
        filename: 'test-cv.pdf',

        contentType: 'application/pdf'
      })

    expect(response.statusCode).toBe(201)

    expect(response.body.status).toBe('success')

    expect(response.body.message).toBe('CV analizado correctamente')

    expect(response.body.analysis.personalInfo.name).toBe(
      'Candidato Upload Test'
    )

    expect(response.body.analysis.score.overall).toBe(80)

    expect(response.body.saved).toHaveProperty('id')

    /*
     * Comprobamos que el PDF temporal
     * ha sido eliminado.
     */

    const filesAfter = fs.existsSync(uploadsDirectory)
      ? fs.readdirSync(uploadsDirectory)
      : []

    expect(filesAfter).toEqual(filesBefore)

    /*
     * Comprobamos además que el análisis
     * realmente llegó a PostgreSQL.
     */

    const result = await pool.query(
      `
            SELECT
              id,
              session_id,
              candidate_name,
              score
            FROM cv_analyses
            WHERE id = $1
          `,
      [response.body.saved.id]
    )

    expect(result.rowCount).toBe(1)

    expect(result.rows[0].session_id).toBe(session.sessionId)

    expect(result.rows[0].candidate_name).toBe('Candidato Upload Test')

    expect(result.rows[0].score).toBe(80)
  })

  /* =======================================================
     ARCHIVO NO PDF
     ======================================================= */

  test('debe rechazar un archivo que no sea PDF', async () => {
    const response = await session.agent
      .post('/api/cv')
      .attach('cv', Buffer.from('archivo de texto'), {
        filename: 'documento.txt',

        contentType: 'text/plain'
      })

    expect(response.statusCode).toBe(400)

    expect(response.body.status).toBe('error')

    expect(response.body.message).toBe('Solo se permiten archivos PDF')
  })

  /* =======================================================
     ARCHIVO DEMASIADO GRANDE
     ======================================================= */

  test('debe rechazar un archivo superior a 5 MB', async () => {
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1, 'a')

    const response = await session.agent
      .post('/api/cv')
      .attach('cv', largeBuffer, {
        filename: 'large-cv.pdf',

        contentType: 'application/pdf'
      })

    expect(response.statusCode).toBe(413)

    expect(response.body.status).toBe('error')

    expect(response.body.message).toBe('El archivo no puede superar los 5 MB.')
  })

  /* =======================================================
     SIN ARCHIVO
     ======================================================= */

  test('debe rechazar una petición sin archivo', async () => {
    const response = await session.agent.post('/api/cv')

    expect(response.statusCode).toBe(400)

    expect(response.body.status).toBe('error')

    expect(response.body.message).toBe('No se ha recibido ningún archivo')
  })

  /* =======================================================
     LIMPIEZA
     ======================================================= */

  afterAll(async () => {
    /*
     * El análisis creado pertenece a la sesión de prueba.
     * ON DELETE CASCADE elimina también sus análisis.
     */

    await pool.query(
      `
        DELETE FROM sessions
        WHERE id = $1
      `,
      [session.sessionId]
    )
  })
})
