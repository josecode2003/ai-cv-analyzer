import { apiRequest } from './api'

/* =========================================================
SUBIR Y ANALIZAR CV
========================================================= */

export async function uploadCV(file) {
  const formData = new FormData()

  /*

* El backend espera el archivo
* en el campo "cv".
  */

  formData.append('cv', file)

  return apiRequest('/cv', {
    method: 'POST',
    body: formData
  })
}
