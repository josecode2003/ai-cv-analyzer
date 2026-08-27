const jwt = require('jsonwebtoken')

function authenticateToken(
  req,
  res,
  next
) {

  const authHeader =
    req.headers.authorization


  if (!authHeader) {

    return res.status(401).json({
      status: 'error',
      message: 'Token de autenticación requerido'
    })
  }


  const [
    scheme,
    token
  ] = authHeader.split(' ')


  if (
    scheme !== 'Bearer' ||
    !token
  ) {

    return res.status(401).json({
      status: 'error',
      message: 'Formato de autenticación inválido'
    })
  }


  try {

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      )


    req.user = {
      id: decoded.userId
    }


    next()

  } catch (error) {

    return res.status(401).json({
      status: 'error',
      message: 'Token inválido o expirado'
    })
  }
}


module.exports = {
  authenticateToken
}