const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

/* =========================================================
PETICIONES API
========================================================= */

export async function apiRequest(endpoint, options = {}) {
  const headers = {
    ...(options.headers || {})
  }

  /*
   * Para JSON añadimos Content-Type automáticamente.
   *
   * IMPORTANTE:
   * Si el body es FormData no debemos establecer
   * Content-Type manualmente. El navegador necesita
   * generar automáticamente el multipart boundary.
   */

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers['Content-Type']
  ) {
    headers['Content-Type'] = 'application/json'
  }

  let response

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      /*
       * No hay login ni token: el backend identifica la
       * sesión anónima por cookie, así que hay que enviarla
       * y aceptarla también en peticiones cross-origin.
       */
      credentials: 'include'
    })
  } catch (error) {
    console.error('Error de conexión con la API:', error)

    throw new Error('No se pudo conectar con el servidor.', { cause: error })
  }

  /*
   * Intentar interpretar la respuesta como JSON.
   *
   * Algunas respuestas pueden no tener contenido,
   * por lo que no asumimos que siempre exista JSON.
   */

  let data = null

  try {
    data = await response.json()
  } catch {
    // La respuesta no tiene contenido JSON; se mantiene data en null.
  }

  /*
   * Gestionar errores HTTP
   */

  if (!response.ok) {
    throw new Error(
      data?.message || `Error en la petición (${response.status})`
    )
  }

  return data
}

/* =========================================================
HEALTH CHECK
========================================================= */

export async function checkApiHealth() {
  return apiRequest('/health')
}
