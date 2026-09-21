import { apiRequest } from './api'

/* =========================================================
OBTENER TODOS LOS ANÁLISIS DEL USUARIO
========================================================= */

export async function getAnalyses() {
  return apiRequest('/cv', {
    method: 'GET'
  })
}

/* =========================================================
OBTENER UN ANÁLISIS POR ID
========================================================= */

export async function getAnalysisById(id) {
  return apiRequest(`/cv/${id}`, {
    method: 'GET'
  })
}

/* =========================================================
ELIMINAR UN ANÁLISIS
========================================================= */

export async function deleteAnalysis(id) {
  return apiRequest(`/cv/${id}`, {
    method: 'DELETE'
  })
}
