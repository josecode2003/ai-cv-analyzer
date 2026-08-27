const request = require('supertest')
const app = require('../src/app')
const pool = require('../src/config/database')
const testEmail =
  `test-${Date.now()}@example.com`

const testPassword =
  'Password123!'

describe('Authentication integration', () => {

  let token
  let userId


  test('debe registrar un usuario', async () => {

    const response =
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: testEmail,
          password: testPassword
        })


    expect(response.statusCode)
      .toBe(201)

    expect(response.body.status)
      .toBe('success')

    expect(response.body.user)
      .toHaveProperty('id')

    expect(response.body.user.email)
      .toBe(testEmail)

    expect(response.body.token)
      .toBeDefined()


    token =
      response.body.token

    userId =
      response.body.user.id

  })


  test(
    'no debe permitir registrar el mismo email',
    async () => {

      const response =
        await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Test User',
            email: testEmail,
            password: testPassword
          })


      expect(response.statusCode)
        .toBe(409)

      expect(response.body.message)
        .toBe(
          'Ya existe un usuario con ese email'
        )

    }
  )


  test(
    'debe permitir iniciar sesión',
    async () => {

      const response =
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: testPassword
          })


      expect(response.statusCode)
        .toBe(200)

      expect(response.body.status)
        .toBe('success')

      expect(response.body.token)
        .toBeDefined()

      expect(response.body.user.id)
        .toBe(userId)

    }
  )


  test(
    'debe rechazar contraseña incorrecta',
    async () => {

      const response =
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testEmail,
            password: 'PasswordIncorrecta!'
          })


      expect(response.statusCode)
        .toBe(401)

      expect(response.body.message)
        .toBe(
          'Email o contraseña incorrectos'
        )

    }
  )


  test(
    'debe devolver el usuario con un JWT válido',
    async () => {

      const response =
        await request(app)
          .get('/api/auth/me')
          .set(
            'Authorization',
            `Bearer ${token}`
          )


      expect(response.statusCode)
        .toBe(200)

      expect(response.body.status)
        .toBe('success')

      expect(response.body.user.id)
        .toBe(userId)

      expect(response.body.user.email)
        .toBe(testEmail)

    }
  )


  test(
    'debe rechazar un JWT inválido',
    async () => {

      const response =
        await request(app)
          .get('/api/auth/me')
          .set(
            'Authorization',
            'Bearer token-invalido'
          )


      expect(response.statusCode)
        .toBe(401)

      expect(response.body.status)
        .toBe('error')

    }

  )
  afterAll(async () => {

    await pool.query(
      'DELETE FROM users WHERE email = $1',
      [testEmail]
    )

  })
})