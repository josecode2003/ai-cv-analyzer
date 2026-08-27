import { apiRequest } from './api'


export async function uploadCV(file) {

  const formData =
    new FormData()

  formData.append(
    'cv',
    file
  )


  return apiRequest(
    '/cv',
    {
      method: 'POST',
      body: formData
    }
  )

}