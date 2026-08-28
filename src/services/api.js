const API_URL = 'http://localhost:3000/api'

const TOKEN_KEY = 'ai_cv_analyzer_token'

/* =========================================================
TOKEN
========================================================= */

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

/* =========================================================
PETICIONES API
========================================================= */

export async function apiRequest(
endpoint,
options = {}
) {
const token = getToken()

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
headers['Content-Type'] =
'application/json'
}

/*

* Añadir token de autenticación
  */

if (token) {
headers.Authorization =
`Bearer ${token}`
}

let response

try {

```
response = await fetch(
  `${API_URL}${endpoint}`,
  {
    ...options,
    headers
  }
)
```

} catch (error) {

```
console.error(
  'Error de conexión con la API:',
  error
)

throw new Error(
  'No se pudo conectar con el servidor.'
)
```

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
data = null
}

/*

* Token inválido o expirado.
*
* Eliminamos el token local para que la aplicación
* pueda detectar que la sesión ya no es válida.
  */

if (
response.status === 401 &&
token
) {
removeToken()
}

/*

* Gestionar errores HTTP
  */

if (!response.ok) {
throw new Error(
data?.message ||
`Error en la petición (${response.status})`
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
