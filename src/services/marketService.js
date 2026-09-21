import { apiRequest } from './api'

/* =========================================================
ANALIZAR (O RECUPERAR DE CACHÉ) EL MERCADO LABORAL
PARA EL PERFIL DETECTADO EN UN ANÁLISIS DE CV
========================================================= */

export async function getMarketAnalysis(cvAnalysisId) {
  return apiRequest(`/cv/${cvAnalysisId}/market-analysis`, {
    method: 'POST'
  })
}
