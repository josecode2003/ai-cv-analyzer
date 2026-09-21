import { apiRequest } from './api'

/* =========================================================
COMPARAR CV CON OFERTA DE EMPLEO
========================================================= */

export async function compareCVWithJobOffer({ cvId, jobTitle, jobOfferText }) {
  if (!cvId) {
    throw new Error('No se ha proporcionado un CV válido.')
  }

  return apiRequest(`/cv/${cvId}/compare`, {
    method: 'POST',
    body: JSON.stringify({
      jobTitle,
      jobOfferText
    })
  })
}

/* =========================================================
OBTENER COMPARACIONES
========================================================= */

export async function getComparisons() {
  return apiRequest('/comparisons', {
    method: 'GET'
  })
}

/* =========================================================
OBTENER UNA COMPARACIÓN
========================================================= */

export async function getComparisonById(id) {
  if (!id) {
    throw new Error('No se ha proporcionado una comparación válida.')
  }

  return apiRequest(`/comparisons/${id}`, {
    method: 'GET'
  })
}

/* =========================================================
ELIMINAR UNA COMPARACIÓN
========================================================= */

export async function deleteComparison(id) {
  if (!id) {
    throw new Error('No se ha proporcionado una comparación válida.')
  }

  return apiRequest(`/comparisons/${id}`, {
    method: 'DELETE'
  })
}
