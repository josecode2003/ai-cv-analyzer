const pool = require('../src/config/database')

const { createAnalysis } = require('../src/repositories/cvAnalysisRepository')

const { createSessionAgent } = require('./helpers/sessionAgent')

describe('CV analyses integration', () => {
  let sessionA
  let sessionB

  let analysisId

  /* =======================================================
     PREPARACIÓN
     ======================================================= */

  beforeAll(async () => {
    sessionA = await createSessionAgent()
    sessionB = await createSessionAgent()

    /*
     * Creamos un análisis directamente mediante
     * el repository.
     *
     * Así no llamamos a OpenAI durante los tests.
     */

    const savedAnalysis = await createAnalysis({
      sessionId: sessionA.sessionId,

      originalFilename: 'test-cv.pdf',

      filename: 'test-file.pdf',

      fileSize: 12345,

      mimeType: 'application/pdf',

      candidateName: 'Candidato Test',

      candidateEmail: 'candidate@test.com',

      score: 82,

      profile: 'Desarrollador Web Junior',

      level: 'Junior',

      analysis: {
        personalInfo: {
          name: 'Candidato Test',
          email: 'candidate@test.com',
          phone: '',
          location: '',
          linkedin: '',
          github: ''
        },

        summary: 'Perfil de prueba.',

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
          strengths: ['Tiene experiencia técnica.'],
          weaknesses: ['Falta información de prueba.'],
          recommendations: ['Añadir proyectos.']
        },

        score: {
          overall: 82,
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
      }
    })

    analysisId = savedAnalysis.id
  })

  /* =======================================================
     GET /api/cv
     ======================================================= */

  test('La sesión A debe poder listar sus análisis', async () => {
    const response = await sessionA.agent.get('/api/cv')

    expect(response.statusCode).toBe(200)

    expect(response.body.status).toBe('success')

    expect(response.body.count).toBeGreaterThanOrEqual(1)

    const analysis = response.body.analyses.find(item => item.id === analysisId)

    expect(analysis).toBeDefined()

    expect(analysis.candidate_name).toBe('Candidato Test')

    expect(analysis.score).toBe(82)
  })

  /* =======================================================
     GET /api/cv/:id
     ======================================================= */

  test('La sesión A debe poder obtener su propio análisis', async () => {
    const response = await sessionA.agent.get(`/api/cv/${analysisId}`)

    expect(response.statusCode).toBe(200)

    expect(response.body.status).toBe('success')

    expect(response.body.analysis.id).toBe(analysisId)

    expect(response.body.analysis.candidate_name).toBe('Candidato Test')

    expect(response.body.analysis.analysis.score.overall).toBe(82)
  })

  /* =======================================================
     AISLAMIENTO
     ======================================================= */

  test('La sesión B no debe poder listar el análisis de la sesión A', async () => {
    const response = await sessionB.agent.get('/api/cv')

    expect(response.statusCode).toBe(200)

    const analysis = response.body.analyses.find(item => item.id === analysisId)

    expect(analysis).toBeUndefined()
  })

  test('La sesión B no debe poder obtener el análisis de la sesión A', async () => {
    const response = await sessionB.agent.get(`/api/cv/${analysisId}`)

    expect(response.statusCode).toBe(404)

    expect(response.body.message).toBe('Análisis no encontrado')
  })

  /* =======================================================
     DELETE PROTEGIDO
     ======================================================= */

  test('La sesión B no debe poder eliminar el análisis de la sesión A', async () => {
    const response = await sessionB.agent.delete(`/api/cv/${analysisId}`)

    expect(response.statusCode).toBe(404)

    expect(response.body.message).toBe('Análisis no encontrado')

    /*
     * Comprobamos que el análisis sigue existiendo
     * para su propietario.
     */

    const ownerResponse = await sessionA.agent.get(`/api/cv/${analysisId}`)

    expect(ownerResponse.statusCode).toBe(200)
  })

  /* =======================================================
     DELETE PROPIO
     ======================================================= */

  test('La sesión A debe poder eliminar su propio análisis', async () => {
    const response = await sessionA.agent.delete(`/api/cv/${analysisId}`)

    expect(response.statusCode).toBe(200)

    expect(response.body.status).toBe('success')

    expect(response.body.deletedId).toBe(analysisId)
  })

  /* =======================================================
     COMPROBAR ELIMINACIÓN
     ======================================================= */

  test('El análisis eliminado ya no debe existir', async () => {
    const response = await sessionA.agent.get(`/api/cv/${analysisId}`)

    expect(response.statusCode).toBe(404)

    expect(response.body.message).toBe('Análisis no encontrado')
  })

  /* =======================================================
     VALIDACIÓN DE ID
     ======================================================= */

  test('Debe rechazar un ID de análisis inválido', async () => {
    const response = await sessionA.agent.get('/api/cv/abc')

    expect(response.statusCode).toBe(400)

    expect(response.body.message).toBe('El ID del análisis no es válido')
  })

  /* =======================================================
     LIMPIEZA
     ======================================================= */

  afterAll(async () => {
    /*
     * Al eliminar las sesiones:
     *
     * sessions
     *   ↓ ON DELETE CASCADE
     * cv_analyses
     *
     * Así limpiamos también cualquier dato
     * de prueba que haya quedado.
     */

    await pool.query(
      `
        DELETE FROM sessions
        WHERE id IN ($1, $2)
      `,
      [sessionA.sessionId, sessionB.sessionId]
    )
  })
})
