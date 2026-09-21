const request = require('supertest')

const app = require('../src/app')

const pool = require('../src/config/database')

describe('Security integration', () => {
  /*
   * La mayoría de estas peticiones no llevan cookie de
   * sesión, así que cada una crea una sesión anónima nueva.
   * Las limpiamos al final por fecha de creación para no
   * dejar filas huérfanas en cada ejecución de los tests.
   */

  const startedAt = new Date()

  afterAll(async () => {
    await pool.query('DELETE FROM sessions WHERE created_at >= $1', [startedAt])
  })

  /* =======================================================
     RUTAS INEXISTENTES
     ======================================================= */

  test('debe devolver 404 para una ruta inexistente', async () => {
    const response = await request(app).get('/api/ruta-que-no-existe')

    expect(response.statusCode).toBe(404)

    expect(response.body.status).toBe('error')

    expect(response.body.message).toBe('Ruta no encontrada')
  })

  /* =======================================================
     SESIÓN ANÓNIMA
     No hay login ni registro: cualquier visitante recibe
     una cookie de sesión en su primera petición.
     ======================================================= */

  test('debe asignar una cookie de sesión anónima en la primera visita', async () => {
    const response = await request(app).get('/api/cv')

    const setCookie = response.headers['set-cookie'] || []

    expect(setCookie.some(cookie => cookie.startsWith('sid='))).toBe(true)
  })

  /* =======================================================
     ID INVÁLIDO
     ======================================================= */

  test('debe rechazar un ID no numérico', async () => {
    const response = await request(app).get('/api/cv/no-es-un-id')

    expect(response.statusCode).toBe(400)

    expect(response.body.message).toBe('El ID del análisis no es válido')
  })

  /* =======================================================
     HEADER X-POWERED-BY
     ======================================================= */

  test('no debe exponer X-Powered-By', async () => {
    const response = await request(app).get('/api/health')

    expect(response.headers['x-powered-by']).toBeUndefined()
  })

  /* =======================================================
     HELMET
     ======================================================= */

  test('debe incluir cabeceras de seguridad de Helmet', async () => {
    const response = await request(app).get('/api/health')

    expect(response.headers['x-content-type-options']).toBe('nosniff')

    expect(response.headers['content-security-policy']).toBeDefined()
  })

  /* =======================================================
     MÉTODO HTTP NO PERMITIDO POR LA RUTA
     ======================================================= */

  test('debe devolver 404 para un método no definido', async () => {
    const response = await request(app).patch('/api/health')

    expect(response.statusCode).toBe(404)

    expect(response.body.status).toBe('error')
  })

  /* =======================================================
     JSON DEMASIADO GRANDE
     ======================================================= */

  test('debe rechazar un JSON superior al límite configurado', async () => {
    const hugeValue = 'a'.repeat(150 * 1024)

    const response = await request(app)
      .post('/api/cv/1/compare')
      .set('Content-Type', 'application/json')
      .send({
        jobTitle: 'Puesto de prueba',

        jobOfferText: hugeValue
      })

    expect(response.statusCode).toBe(413)

    expect(response.body.status).toBe('error')

    expect(response.body.message).toBe('La petición es demasiado grande')
  })
})
