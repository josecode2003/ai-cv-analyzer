const request = require('supertest')

/*
 * Mock de OpenAI.
 *
 * El test no llamará a la API real.
 * Simulamos el resultado de la comparación.
 */
jest.mock('../src/services/jobComparisonService', () => ({
  compareCVWithJobOffer: jest.fn(
    async () => ({
      compatibilityScore: 84,

      summary:
        'El CV presenta una buena coincidencia con la oferta.',

      matchingSkills: [
        'JavaScript',
        'HTML5',
        'CSS3',
        'Git'
      ],

      missingSkills: [
        'Node.js',
        'Docker'
      ],

      strengths: [
        'Formación relacionada con desarrollo web.',
        'Conocimientos técnicos relevantes.'
      ],

      gaps: [
        'Falta experiencia profesional específica.'
      ],

      keywords: [
        'JavaScript',
        'Node.js',
        'Git',
        'Docker'
      ],

      recommendations: [
        'Añadir proyectos relevantes si existen.',
        'Destacar experiencia práctica con las tecnologías solicitadas.'
      ]
    })
  )
}))

const app = require('../src/app')

const pool =
  require('../src/config/database')

const {
  createAnalysis
} = require('../src/repositories/cvAnalysisRepository')


describe(
  'Job comparison integration',
  () => {

    const timestamp =
      Date.now()


    const userA = {
      name: 'Comparison User A',

      email:
        `comparison-a-${timestamp}@example.com`,

      password:
        'Password123!'
    }


    const userB = {
      name: 'Comparison User B',

      email:
        `comparison-b-${timestamp}@example.com`,

      password:
        'Password123!'
    }


    let tokenA
    let tokenB

    let userAId
    let userBId

    let cvAnalysisId
    let comparisonId


    const jobOffer = `
      Buscamos un Desarrollador Web Junior
      para incorporarse a nuestro equipo.

      Requisitos:
      Experiencia con JavaScript, HTML5, CSS3 y Git.
      Conocimientos de Node.js y bases de datos SQL.
      Se valorará experiencia con Docker.
      Capacidad de trabajo en equipo y ganas de aprender.
    `


    /* =====================================================
       PREPARACIÓN
       ===================================================== */

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
       * Creamos un CV directamente en PostgreSQL.
       *
       * No llamamos a OpenAI.
       */

      const savedAnalysis =
        await createAnalysis({

          userId:
            userAId,

          originalFilename:
            'comparison-test.pdf',

          filename:
            'comparison-test-file.pdf',

          fileSize:
            15000,

          mimeType:
            'application/pdf',

          candidateName:
            'Comparison Candidate',

          candidateEmail:
            'candidate@example.com',

          score:
            75,

          profile:
            'Desarrollador Web Junior',

          level:
            'Junior',

          analysis: {

            personalInfo: {
              name:
                'Comparison Candidate',

              email:
                'candidate@example.com',

              phone: '',

              location: '',

              linkedin: '',

              github: ''
            },

            summary:
              'Perfil técnico de prueba.',

            experience: [],

            education: [],

            skills: {

              technical: [
                'HTML5',
                'CSS3',
                'JavaScript',
                'Git'
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
                'Conocimientos técnicos.'
              ],

              weaknesses: [
                'Poca experiencia profesional.'
              ],

              recommendations: [
                'Añadir proyectos.'
              ]

            },

            score: {

              overall: 75,

              experience: 50,

              skills: 80,

              education: 85,

              projects: 40,

              presentation: 75

            },

            overallAssessment: {

              level:
                'Junior',

              profile:
                'Desarrollador Web Junior',

              mainIssue:
                'Falta de experiencia práctica.',

              priority:
                'high'

            }

          }

        })


      cvAnalysisId =
        savedAnalysis.id

    })


    /* =====================================================
       CREAR COMPARACIÓN
       ===================================================== */

    test(
      'Usuario A debe poder crear una comparación',
      async () => {

        const response =
          await request(app)
            .post(
              `/api/cv/${cvAnalysisId}/compare`
            )
            .set(
              'Authorization',
              `Bearer ${tokenA}`
            )
            .send({

              jobTitle:
                'Desarrollador Web Junior',

              jobOfferText:
                jobOffer

            })


        expect(response.statusCode)
          .toBe(201)


        expect(response.body.status)
          .toBe('success')


        expect(response.body.message)
          .toBe(
            'Comparación realizada correctamente'
          )


        expect(response.body.comparison)
          .toHaveProperty('id')


        expect(
          response.body.comparison.cvAnalysisId
        )
          .toBe(cvAnalysisId)


        expect(
          response.body.comparison.compatibilityScore
        )
          .toBe(84)


        expect(
          response.body.comparison.result.matchingSkills
        )
          .toContain('JavaScript')


        comparisonId =
          response.body.comparison.id

      }
    )


    /* =====================================================
       COMPROBAR POSTGRESQL
       ===================================================== */

    test(
      'La comparación debe guardarse en PostgreSQL',
      async () => {

        const result =
          await pool.query(
            `
              SELECT
                id,
                user_id,
                cv_analysis_id,
                job_title,
                compatibility_score
              FROM job_comparisons
              WHERE id = $1
            `,
            [
              comparisonId
            ]
          )


        expect(result.rowCount)
          .toBe(1)


        expect(
          result.rows[0].user_id
        )
          .toBe(userAId)


        expect(
          result.rows[0].cv_analysis_id
        )
          .toBe(cvAnalysisId)


        expect(
          result.rows[0].job_title
        )
          .toBe(
            'Desarrollador Web Junior'
          )


        expect(
          result.rows[0].compatibility_score
        )
          .toBe(84)

      }
    )


    /* =====================================================
       LISTAR
       ===================================================== */

    test(
      'Usuario A debe poder listar sus comparaciones',
      async () => {

        const response =
          await request(app)
            .get('/api/comparisons')
            .set(
              'Authorization',
              `Bearer ${tokenA}`
            )


        expect(response.statusCode)
          .toBe(200)


        expect(response.body.status)
          .toBe('success')


        const comparison =
          response.body.comparisons.find(
            item =>
              item.id === comparisonId
          )


        expect(comparison)
          .toBeDefined()


        expect(
          comparison.compatibility_score
        )
          .toBe(84)

      }
    )


    /* =====================================================
       OBTENER
       ===================================================== */

    test(
      'Usuario A debe poder obtener su comparación',
      async () => {

        const response =
          await request(app)
            .get(
              `/api/comparisons/${comparisonId}`
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
          response.body.comparison.id
        )
          .toBe(comparisonId)


        expect(
          response.body.comparison.result
            .compatibilityScore
        )
          .toBe(84)


        expect(
          response.body.comparison
            .job_offer_text
        )
          .toContain(
            'Desarrollador Web Junior'
          )

      }
    )


    /* =====================================================
       AISLAMIENTO - LISTADO
       ===================================================== */

    test(
      'Usuario B no debe ver las comparaciones de Usuario A',
      async () => {

        const response =
          await request(app)
            .get('/api/comparisons')
            .set(
              'Authorization',
              `Bearer ${tokenB}`
            )


        expect(response.statusCode)
          .toBe(200)


        const comparison =
          response.body.comparisons.find(
            item =>
              item.id === comparisonId
          )


        expect(comparison)
          .toBeUndefined()

      }
    )


    /* =====================================================
       AISLAMIENTO - OBTENER
       ===================================================== */

    test(
      'Usuario B no debe poder abrir la comparación de Usuario A',
      async () => {

        const response =
          await request(app)
            .get(
              `/api/comparisons/${comparisonId}`
            )
            .set(
              'Authorization',
              `Bearer ${tokenB}`
            )


        expect(response.statusCode)
          .toBe(404)


        expect(response.body.message)
          .toBe(
            'Comparación no encontrada'
          )

      }
    )


    /* =====================================================
       AISLAMIENTO - ELIMINAR
       ===================================================== */

    test(
      'Usuario B no debe poder eliminar la comparación de Usuario A',
      async () => {

        const response =
          await request(app)
            .delete(
              `/api/comparisons/${comparisonId}`
            )
            .set(
              'Authorization',
              `Bearer ${tokenB}`
            )


        expect(response.statusCode)
          .toBe(404)


        expect(response.body.message)
          .toBe(
            'Comparación no encontrada'
          )


        /*
         * Confirmamos que sigue existiendo
         * para el propietario.
         */

        const ownerResponse =
          await request(app)
            .get(
              `/api/comparisons/${comparisonId}`
            )
            .set(
              'Authorization',
              `Bearer ${tokenA}`
            )


        expect(ownerResponse.statusCode)
          .toBe(200)

      }
    )


    /* =====================================================
       VALIDACIÓN - OFERTA CORTA
       ===================================================== */

    test(
      'Debe rechazar una oferta demasiado corta',
      async () => {

        const response =
          await request(app)
            .post(
              `/api/cv/${cvAnalysisId}/compare`
            )
            .set(
              'Authorization',
              `Bearer ${tokenA}`
            )
            .send({

              jobTitle:
                'Puesto de prueba',

              jobOfferText:
                'Oferta demasiado corta'

            })


        expect(response.statusCode)
          .toBe(400)


        expect(response.body.message)
          .toBe(
            'La oferta de empleo debe tener al menos 50 caracteres'
          )

      }
    )


    /* =====================================================
       VALIDACIÓN - OFERTA DEMASIADO LARGA
       ===================================================== */

    test(
      'Debe rechazar una oferta demasiado larga',
      async () => {

        const veryLongOffer =
          'a'.repeat(
            30001
          )


        const response =
          await request(app)
            .post(
              `/api/cv/${cvAnalysisId}/compare`
            )
            .set(
              'Authorization',
              `Bearer ${tokenA}`
            )
            .send({

              jobTitle:
                'Puesto de prueba',

              jobOfferText:
                veryLongOffer

            })


        expect(response.statusCode)
          .toBe(413)


        expect(response.body.message)
          .toBe(
            'La oferta de empleo es demasiado larga'
          )

      }
    )


    /* =====================================================
       VALIDACIÓN - ID
       ===================================================== */

    test(
      'Debe rechazar un ID de CV inválido',
      async () => {

        const response =
          await request(app)
            .post(
              '/api/cv/abc/compare'
            )
            .set(
              'Authorization',
              `Bearer ${tokenA}`
            )
            .send({

              jobTitle:
                'Puesto de prueba',

              jobOfferText:
                jobOffer

            })


        expect(response.statusCode)
          .toBe(400)


        expect(response.body.message)
          .toBe(
            'El ID del CV no es válido'
          )

      }
    )


    /* =====================================================
       CV DE OTRO USUARIO
       ===================================================== */

    test(
      'Usuario B no debe poder comparar un CV de Usuario A',
      async () => {

        const response =
          await request(app)
            .post(
              `/api/cv/${cvAnalysisId}/compare`
            )
            .set(
              'Authorization',
              `Bearer ${tokenB}`
            )
            .send({

              jobTitle:
                'Desarrollador Web Junior',

              jobOfferText:
                jobOffer

            })


        expect(response.statusCode)
          .toBe(404)


        expect(response.body.message)
          .toBe(
            'Análisis de CV no encontrado'
          )

      }
    )


    /* =====================================================
       ELIMINACIÓN PROPIA
       ===================================================== */

    test(
      'Usuario A debe poder eliminar su comparación',
      async () => {

        const response =
          await request(app)
            .delete(
              `/api/comparisons/${comparisonId}`
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
          response.body.deletedId
        )
          .toBe(comparisonId)

      }
    )


    /* =====================================================
       COMPROBAR ELIMINACIÓN
       ===================================================== */

    test(
      'La comparación eliminada ya no debe existir',
      async () => {

        const response =
          await request(app)
            .get(
              `/api/comparisons/${comparisonId}`
            )
            .set(
              'Authorization',
              `Bearer ${tokenA}`
            )


        expect(response.statusCode)
          .toBe(404)


        expect(response.body.message)
          .toBe(
            'Comparación no encontrada'
          )

      }
    )


    /* =====================================================
       VALIDACIÓN - SIN AUTENTICACIÓN
       ===================================================== */

    test(
      'Debe rechazar una comparación sin JWT',
      async () => {

        const response =
          await request(app)
            .post(
              `/api/cv/${cvAnalysisId}/compare`
            )
            .send({

              jobTitle:
                'Desarrollador Web Junior',

              jobOfferText:
                jobOffer

            })


        expect(response.statusCode)
          .toBe(401)


        expect(response.body.message)
          .toBe(
            'Token de autenticación requerido'
          )

      }
    )


    /* =====================================================
       LIMPIEZA
       ===================================================== */

    afterAll(async () => {

      /*
       * ON DELETE CASCADE elimina también:
       *
       * cv_analyses
       * job_comparisons
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