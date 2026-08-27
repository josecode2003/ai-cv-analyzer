const request = require('supertest')
const app = require('../src/app')

describe('Authentication', () => {

  test(
    'debe rechazar GET /api/auth/me sin token',
    async () => {

      const response =
        await request(app)
          .get('/api/auth/me')

      expect(response.statusCode)
        .toBe(401)

      expect(response.body.status)
        .toBe('error')

    }
  )


  test(
    'debe rechazar GET /api/cv sin token',
    async () => {

      const response =
        await request(app)
          .get('/api/cv')

      expect(response.statusCode)
        .toBe(401)

      expect(response.body.message)
        .toBe(
          'Token de autenticación requerido'
        )

    }
  )

})