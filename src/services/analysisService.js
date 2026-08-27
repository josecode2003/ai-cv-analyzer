import { apiRequest } from './api'


export async function getAnalyses() {

  return apiRequest(
    '/cv',
    {
      method: 'GET'
    }
  )

}


export async function getAnalysisById(id) {

  return apiRequest(
    `/cv/${id}`,
    {
      method: 'GET'
    }
  )

}


export async function deleteAnalysis(id) {

  return apiRequest(
    `/cv/${id}`,
    {
      method: 'DELETE'
    }
  )

}