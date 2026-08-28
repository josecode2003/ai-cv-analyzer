import {
apiRequest,
setToken,
removeToken
} from './api'

/* =========================================================
REGISTRO
========================================================= */

export async function registerUser({
name,
email,
password
}) {

const response =
await apiRequest(
'/auth/register',
{
method: 'POST',
body: JSON.stringify({
name,
email,
password
})
}
)

/*

* Guardamos el JWT recibido por el backend.
  */

if (response?.token) {
setToken(
response.token
)
}

return response
}

/* =========================================================
LOGIN
========================================================= */

export async function loginUser({
email,
password
}) {

const response =
await apiRequest(
'/auth/login',
{
method: 'POST',
body: JSON.stringify({
email,
password
})
}
)

/*

* Guardamos el JWT recibido por el backend.
  */

if (response?.token) {
setToken(
response.token
)
}

return response
}

/* =========================================================
USUARIO ACTUAL
========================================================= */

export async function getCurrentUser() {

return apiRequest(
'/auth/me',
{
method: 'GET'
}
)

}

/* =========================================================
LOGOUT
========================================================= */

export function logoutUser() {
removeToken()
}
