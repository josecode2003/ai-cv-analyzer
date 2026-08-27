const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const {
  createUser,
  findUserByEmail
} = require('../repositories/userRepository')


function normalizeEmail(email) {
  return email.trim().toLowerCase()
}


async function registerUser({
  name,
  email,
  password
}) {

  const normalizedEmail =
    normalizeEmail(email)


  const existingUser =
    await findUserByEmail(
      normalizedEmail
    )


  if (existingUser) {

    throw new Error(
      'EMAIL_ALREADY_EXISTS'
    )
  }


  const passwordBytes =
    Buffer.byteLength(
      password,
      'utf8'
    )


  if (passwordBytes > 72) {

    throw new Error(
      'PASSWORD_TOO_LONG'
    )
  }


  const passwordHash =
    await bcrypt.hash(
      password,
      12
    )


  const user =
    await createUser({

      name: name.trim(),

      email: normalizedEmail,

      passwordHash

    })


  const token =
    generateToken(user.id)


  return {
    user,
    token
  }
}


async function loginUser({
  email,
  password
}) {

  const normalizedEmail =
    normalizeEmail(email)


  const user =
    await findUserByEmail(
      normalizedEmail
    )


  if (!user) {

    throw new Error(
      'INVALID_CREDENTIALS'
    )
  }


  const passwordValid =
    await bcrypt.compare(
      password,
      user.password_hash
    )


  if (!passwordValid) {

    throw new Error(
      'INVALID_CREDENTIALS'
    )
  }


  const token =
    generateToken(user.id)


  return {

    user: {
      id: user.id,
      name: user.name,
      email: user.email
    },

    token

  }
}


function generateToken(userId) {

  return jwt.sign(
    {
      userId
    },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN || '7d'
    }
  )
}


module.exports = {
  registerUser,
  loginUser
}