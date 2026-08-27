const API_URL = 'http://localhost:3000/api'

const TOKEN_KEY = 'ai_cv_analyzer_token'


export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}


export function setToken(token) {

  if (!token) {
    return
  }

  localStorage.setItem(
    TOKEN_KEY,
    token
  )
}


export function removeToken() {

  localStorage.removeItem(
    TOKEN_KEY
  )

}


export function isAuthenticated() {

  return Boolean(
    getToken()
  )

}


export async function apiRequest(
  endpoint,
  options = {}
) {

  const token = getToken()

  const headers = {
    ...(options.headers || {})
  }


  /*
   * Solo añadimos Content-Type cuando
   * realmente estamos enviando JSON.
   *
   * Esto es importante para FormData:
   * el navegador debe generar automáticamente
   * el multipart boundary.
   */

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers['Content-Type']
  ) {

    headers['Content-Type'] =
      'application/json'

  }


  if (token) {

    headers.Authorization =
      `Bearer ${token}`

  }


  const response =
    await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,
        headers
      }
    )


  let data = null

  try {

    data =
      await response.json()

  } catch {

    data = null

  }


  /*
   * Si el token ha expirado o es inválido,
   * limpiamos automáticamente la sesión.
   */

  if (
    response.status === 401 &&
    token
  ) {

    removeToken()

  }


  if (!response.ok) {

    throw new Error(
      data?.message ||
      'Error en la petición'
    )

  }


  return data
}


export async function checkApiHealth() {

  return apiRequest('/health')

}