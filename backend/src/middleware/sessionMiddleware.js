// @ts-check

const {
  createSession,
  sessionExists
} = require('../repositories/sessionRepository')

/**
 * @typedef {import('express').Request & { sessionId?: number }} SessionRequest
 */

const COOKIE_NAME = 'sid'

const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 365

/*
 * No hay login ni registro: cualquier visitante puede subir
 * un CV. Para que "subir el mismo CV varias veces" siga
 * teniendo un historial propio (sin cuentas ni contraseñas),
 * la primera visita crea una sesión anónima y la recuerda en
 * una cookie firmada. Esta sesión solo identifica "este
 * navegador", nunca a una persona.
 *
 * @param {SessionRequest} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function attachSession(req, res, next) {
  try {
    const cookieValue = req.signedCookies?.[COOKIE_NAME]
    const existingId = Number(cookieValue)

    if (
      cookieValue &&
      Number.isInteger(existingId) &&
      existingId > 0 &&
      (await sessionExists(existingId))
    ) {
      req.sessionId = existingId
      return next()
    }

    const session = await createSession()

    res.cookie(COOKIE_NAME, String(session.id), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      signed: true,
      maxAge: COOKIE_MAX_AGE
    })

    req.sessionId = session.id

    next()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  attachSession
}
