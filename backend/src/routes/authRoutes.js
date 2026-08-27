const express = require('express')

const {
  registerUser,
  loginUser
} = require('../services/authService')

const {
  findUserById
} = require('../repositories/userRepository')

const {
  authenticateToken
} = require('../middleware/authMiddleware')

const router = express.Router()

const {
  rateLimit
} = require('express-rate-limit')

const authLimiter =
  process.env.NODE_ENV === 'test'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: {
          status: 'error',
          message:
            'Demasiados intentos. Inténtalo de nuevo más tarde.'
        }
      })
/* =========================================================
   REGISTER
   POST /api/auth/register
   ========================================================= */

 router.post(
  '/register',
  authLimiter,
  async (req, res) => {

  const {
    name,
    email,
    password
  } = req.body


  if (
    !name ||
    !email ||
    !password
  ) {

    return res.status(400).json({
      status: 'error',
      message:
        'Nombre, email y contraseña son obligatorios'
    })
  }


  if (name.trim().length < 2) {

    return res.status(400).json({
      status: 'error',
      message: 'El nombre no es válido'
    })
  }


  if (!email.includes('@')) {

    return res.status(400).json({
      status: 'error',
      message: 'El email no es válido'
    })
  }


  if (password.length < 8) {

    return res.status(400).json({
      status: 'error',
      message:
        'La contraseña debe tener al menos 8 caracteres'
    })
  }


  if (
    Buffer.byteLength(
      password,
      'utf8'
    ) > 72
  ) {

    return res.status(400).json({
      status: 'error',
      message:
        'La contraseña no puede superar los 72 bytes'
    })
  }


  try {

    const result =
      await registerUser({
        name,
        email,
        password
      })


    return res.status(201).json({

      status: 'success',

      message:
        'Usuario registrado correctamente',

      user: result.user,

      token: result.token

    })

  } catch (error) {

    if (
      error.message ===
      'EMAIL_ALREADY_EXISTS'
    ) {

      return res.status(409).json({
        status: 'error',
        message:
          'Ya existe un usuario con ese email'
      })
    }


    if (
      error.message ===
      'PASSWORD_TOO_LONG'
    ) {

      return res.status(400).json({
        status: 'error',
        message:
          'La contraseña supera el límite permitido'
      })
    }


    console.error(
      'Error registrando usuario:',
      error
    )


    return res.status(500).json({
      status: 'error',
      message:
        'No se pudo registrar el usuario'
    })

  }

})


/* =========================================================
   LOGIN
   POST /api/auth/login
   ========================================================= */

 router.post(
  '/login',
  authLimiter,
  async (req, res) => {

  const {
    email,
    password
  } = req.body


  if (
    !email ||
    !password
  ) {

    return res.status(400).json({
      status: 'error',
      message:
        'Email y contraseña son obligatorios'
    })
  }


  try {

    const result =
      await loginUser({
        email,
        password
      })


    return res.status(200).json({

      status: 'success',

      message:
        'Inicio de sesión correcto',

      user: result.user,

      token: result.token

    })

  } catch (error) {

    if (
      error.message ===
      'INVALID_CREDENTIALS'
    ) {

      return res.status(401).json({
        status: 'error',
        message:
          'Email o contraseña incorrectos'
      })
    }


    console.error(
      'Error iniciando sesión:',
      error
    )


    return res.status(500).json({
      status: 'error',
      message:
        'No se pudo iniciar sesión'
    })
  }

})


/* =========================================================
   ME
   GET /api/auth/me
   ========================================================= */

router.get(
  '/me',
  authenticateToken,
  async (req, res) => {

    try {

      const user =
        await findUserById(
          req.user.id
        )


      if (!user) {

        return res.status(404).json({
          status: 'error',
          message: 'Usuario no encontrado'
        })
      }


      return res.status(200).json({

        status: 'success',

        user

      })

    } catch (error) {

      console.error(
        'Error obteniendo usuario:',
        error
      )


      return res.status(500).json({
        status: 'error',
        message:
          'No se pudo obtener el usuario'
      })
    }

  }
)


module.exports = router