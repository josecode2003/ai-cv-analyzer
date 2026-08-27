const request = require('supertest')
const app = require('../src/app')

describe('GET /api/health', () => {

  test('debe devolver 200 y status ok', async () => {

    const response =
      await request(app)
        .get('/api/health')

    expect(response.statusCode)
      .toBe(200)

    expect(response.body.status)
      .toBe('ok')

    expect(response.body.message)
      .toBe(
        'AI CV Analyzer API funcionando correctamente'
      )

  })

})