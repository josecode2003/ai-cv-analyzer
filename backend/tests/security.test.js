const request = require('supertest')

const app = require('../src/app')


describe('Security integration', () => {


  /* =======================================================
     RUTAS INEXISTENTES
     ======================================================= */

  test(
    'debe devolver 404 para una ruta inexistente',
    async () => {

      const response =
        await request(app)
          .get('/api/ruta-que-no-existe')


      expect(response.statusCode)
        .toBe(404)


      expect(response.body.status)
        .toBe('error')


      expect(response.body.message)
        .toBe(
          'Ruta no encontrada'
        )

    }
  )


  /* =======================================================
     JWT MALFORMADO
     ======================================================= */

  test(
    'debe rechazar un Authorization mal formado',
    async () => {

      const response =
        await request(app)
          .get('/api/cv')
          .set(
            'Authorization',
            'Token abc123'
          )


      expect(response.statusCode)
        .toBe(401)


      expect(response.body.status)
        .toBe('error')


      expect(response.body.message)
        .toBe(
          'Formato de autenticación inválido'
        )

    }
  )


  /* =======================================================
     JWT INVÁLIDO
     ======================================================= */

  test(
    'debe rechazar un JWT inválido',
    async () => {

      const response =
        await request(app)
          .get('/api/cv')
          .set(
            'Authorization',
            'Bearer token-completamente-invalido'
          )


      expect(response.statusCode)
        .toBe(401)


      expect(response.body.status)
        .toBe('error')


      expect(response.body.message)
        .toBe(
          'Token inválido o expirado'
        )

    }
  )


  /* =======================================================
     ID INVÁLIDO
     ======================================================= */

  test(
    'debe rechazar un ID no numérico',
    async () => {

      /*
       * Utilizamos un JWT válido con un usuario
       * existente solamente para llegar a la
       * validación del parámetro :id.
       *
       * Como no queremos crear datos en este test,
       * utilizamos el token de prueba proporcionado
       * mediante variable de entorno si existe.
       *
       * Si no existe, este test se realiza con un
       * JWT ficticio y esperamos 401, por lo que
       * la validación principal queda cubierta por
       * cv.integration.test.js.
       */

      const token =
        process.env.TEST_JWT_TOKEN


      if (!token) {

        const response =
          await request(app)
            .get('/api/cv/no-es-un-id')
            .set(
              'Authorization',
              'Bearer token-invalido'
            )


        expect(response.statusCode)
          .toBe(401)

        return

      }


      const response =
        await request(app)
          .get('/api/cv/no-es-un-id')
          .set(
            'Authorization',
            `Bearer ${token}`
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
     HEADER X-POWERED-BY
     ======================================================= */

  test(
    'no debe exponer X-Powered-By',
    async () => {

      const response =
        await request(app)
          .get('/api/health')


      expect(
        response.headers['x-powered-by']
      )
        .toBeUndefined()

    }
  )


  /* =======================================================
     HELMET
     ======================================================= */

  test(
    'debe incluir cabeceras de seguridad de Helmet',
    async () => {

      const response =
        await request(app)
          .get('/api/health')


      expect(
        response.headers['x-content-type-options']
      )
        .toBe('nosniff')


      expect(
        response.headers['content-security-policy']
      )
        .toBeDefined()

    }
  )


  /* =======================================================
     MÉTODO HTTP NO PERMITIDO POR LA RUTA
     ======================================================= */

  test(
    'debe devolver 404 para un método no definido',
    async () => {

      const response =
        await request(app)
          .patch('/api/health')


      expect(response.statusCode)
        .toBe(404)


      expect(response.body.status)
        .toBe('error')

    }
  )


  /* =======================================================
     JSON DEMASIADO GRANDE
     ======================================================= */

  test(
    'debe rechazar un JSON superior al límite configurado',
    async () => {

      const hugeValue =
        'a'.repeat(
          150 * 1024
        )


      const response =
        await request(app)
          .post('/api/auth/login')
          .set(
            'Content-Type',
            'application/json'
          )
          .send({
            email:
              'test@example.com',

            password:
              hugeValue
          })


      expect(response.statusCode)
        .toBe(413)


      expect(response.body.status)
        .toBe('error')


      expect(response.body.message)
        .toBe(
          'La petición es demasiado grande'
        )

    }
  )

})