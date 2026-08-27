import {
  apiRequest,
  setToken,
  removeToken
} from './api'


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


  if (response.token) {

    setToken(
      response.token
    )

  }


  return response

}


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


  if (response.token) {

    setToken(
      response.token
    )

  }


  return response

}


export async function getCurrentUser() {

  return apiRequest(
    '/auth/me',
    {
      method: 'GET'
    }
  )

}


export function logoutUser() {

  removeToken()

}