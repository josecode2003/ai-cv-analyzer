const request = require('supertest')

const app = require('../src/app')

const pool = require('../src/config/database')

const {
  createAnalysis
} = require('../src/repositories/cvAnalysisRepository')


describe('CV analyses integration', () => {

  const timestamp = Date.now()

  const userA = {
    name: 'Test User A',
    email: `test-user-a-${timestamp}@example.com`,
    password: 'Password123!'
  }

  const userB = {
    name: 'Test User B',
    email: `test-user-b-${timestamp}@example.com`,
    password: 'Password123!'
  }


  let tokenA
  let tokenB

  let userAId
  let userBId

  let analysisId


  /* =======================================================
     PREPARACIÓN
     ======================================================= */

  beforeAll(async () => {

    const registerA =
      await request(app)
        .post('/api/auth/register')
        .send(userA)


    expect(registerA.statusCode)
      .toBe(201)


    tokenA =
      registerA.body.token

    userAId =
      registerA.body.user.id


    const registerB =
      await request(app)
        .post('/api/auth/register')
        .send(userB)


    expect(registerB.statusCode)
      .toBe(201)


    tokenB =
      registerB.body.token

    userBId =
      registerB.body.user.id


    /*
     * Creamos un análisis directamente mediante
     * el repository.
     *
     * Así no llamamos a OpenAI durante los tests.
     */

    const savedAnalysis =
      await createAnalysis({

        userId: userAId,

        originalFilename:
          'test-cv.pdf',

        filename:
          'test-file.pdf',

        fileSize:
          12345,

        mimeType:
          'application/pdf',

        candidateName:
          'Candidato Test',

        candidateEmail:
          'candidate@test.com',

        score:
          82,

        profile:
          'Desarrollador Web Junior',

        level:
          'Junior',

        analysis: {

          personalInfo: {
            name: 'Candidato Test',
            email: 'candidate@test.com',
            phone: '',
            location: '',
            linkedin: '',
            github: ''
          },

          summary:
            'Perfil de prueba.',

          experience: [],

          education: [],

          skills: {
            technical: [
              'JavaScript',
              'Node.js'
            ],
            soft: [
              'Trabajo en equipo'
            ],
            languages: []
          },

          projects: [],

          certifications: [],

          analysis: {
            strengths: [
              'Tiene experiencia técnica.'
            ],
            weaknesses: [
              'Falta información de prueba.'
            ],
            recommendations: [
              'Añadir proyectos.'
            ]
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
            mainIssue:
              'Falta de proyectos demostrables.',
            priority: 'medium'
          }

        }

      })


    analysisId =
      savedAnalysis.id

  })


  /* =======================================================
     GET /api/cv
     ======================================================= */

  test(
    'Usuario A debe poder listar sus análisis',
    async () => {

      const response =
        await request(app)
          .get('/api/cv')
          .set(
            'Authorization',
            `Bearer ${tokenA}`
          )


      expect(response.statusCode)
        .toBe(200)


      expect(response.body.status)
        .toBe('success')


      expect(response.body.count)
        .toBeGreaterThanOrEqual(1)


      const analysis =
        response.body.analyses.find(
          item => item.id === analysisId
        )


      expect(analysis)
        .toBeDefined()


      expect(analysis.candidate_name)
        .toBe('Candidato Test')


      expect(analysis.score)
        .toBe(82)

    }
  )


  /* =======================================================
     GET /api/cv/:id
     ======================================================= */

  test(
    'Usuario A debe poder obtener su propio análisis',
    async () => {

      const response =
        await request(app)
          .get(
            `/api/cv/${analysisId}`
          )
          .set(
            'Authorization',
            `Bearer ${tokenA}`
          )


      expect(response.statusCode)
        .toBe(200)


      expect(response.body.status)
        .toBe('success')


      expect(
        response.body.analysis.id
      )
        .toBe(analysisId)


      expect(
        response.body.analysis.candidate_name
      )
        .toBe('Candidato Test')


      expect(
        response.body.analysis.analysis.score.overall
      )
        .toBe(82)

    }
  )


  /* =======================================================
     AISLAMIENTO
     ======================================================= */

  test(
    'Usuario B no debe poder listar el análisis de Usuario A',
    async () => {

      const response =
        await request(app)
          .get('/api/cv')
          .set(
            'Authorization',
            `Bearer ${tokenB}`
          )


      expect(response.statusCode)
        .toBe(200)


      const analysis =
        response.body.analyses.find(
          item => item.id === analysisId
        )


      expect(analysis)
        .toBeUndefined()

    }
  )


  test(
    'Usuario B no debe poder obtener el análisis de Usuario A',
    async () => {

      const response =
        await request(app)
          .get(
            `/api/cv/${analysisId}`
          )
          .set(
            'Authorization',
            `Bearer ${tokenB}`
          )


      expect(response.statusCode)
        .toBe(404)


      expect(response.body.message)
        .toBe(
          'Análisis no encontrado'
        )

    }
  )


  /* =======================================================
     DELETE PROTEGIDO
     ======================================================= */

  test(
    'Usuario B no debe poder eliminar el análisis de Usuario A',
    async () => {

      const response =
        await request(app)
          .delete(
            `/api/cv/${analysisId}`
          )
          .set(
            'Authorization',
            `Bearer ${tokenB}`
          )


      expect(response.statusCode)
        .toBe(404)


      expect(response.body.message)
        .toBe(
          'Análisis no encontrado'
        )


      /*
       * Comprobamos que el análisis sigue existiendo
       * para su propietario.
       */

      const ownerResponse =
        await request(app)
          .get(
            `/api/cv/${analysisId}`
          )
          .set(
            'Authorization',
            `Bearer ${tokenA}`
          )


      expect(ownerResponse.statusCode)
        .toBe(200)

    }
  )


  /* =======================================================
     DELETE PROPIO
     ======================================================= */

  test(
    'Usuario A debe poder eliminar su propio análisis',
    async () => {

      const response =
        await request(app)
          .delete(
            `/api/cv/${analysisId}`
          )
          .set(
            'Authorization',
            `Bearer ${tokenA}`
          )


      expect(response.statusCode)
        .toBe(200)


      expect(response.body.status)
        .toBe('success')


      expect(response.body.deletedId)
        .toBe(analysisId)

    }
  )


  /* =======================================================
     COMPROBAR ELIMINACIÓN
     ======================================================= */

  test(
    'El análisis eliminado ya no debe existir',
    async () => {

      const response =
        await request(app)
          .get(
            `/api/cv/${analysisId}`
          )
          .set(
            'Authorization',
            `Bearer ${tokenA}`
          )


      expect(response.statusCode)
        .toBe(404)


      expect(response.body.message)
        .toBe(
          'Análisis no encontrado'
        )

    }
  )


  /* =======================================================
     VALIDACIÓN DE ID
     ======================================================= */

  test(
    'Debe rechazar un ID de análisis inválido',
    async () => {

      const response =
        await request(app)
          .get('/api/cv/abc')
          .set(
            'Authorization',
            `Bearer ${tokenA}`
          )


      expect(response.statusCode)
        .toBe(400)


      expect(response.body.message)
        .toBe(
          'El ID del análisis no es válido'
        )

    }
  )


  /* =======================================================
     LIMPIEZA
     ======================================================= */

  afterAll(async () => {

    /*
     * Al eliminar los usuarios:
     *
     * users
     *   ↓ ON DELETE CASCADE
     * cv_analyses
     *
     * Así limpiamos también cualquier dato
     * de prueba que haya quedado.
     */

    await pool.query(
      `
        DELETE FROM users
        WHERE id IN ($1, $2)
      `,
      [
        userAId,
        userBId
      ]
    )

  })

})