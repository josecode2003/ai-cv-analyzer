import { apiRequest } from './api'


export async function compareCVWithJobOffer({
  cvId,
  jobTitle,
  jobOfferText
}) {

  return apiRequest(
    `/cv/${cvId}/compare`,
    {
      method: 'POST',

      body: JSON.stringify({
        jobTitle,
        jobOfferText
      })
    }
  )

}


export async function getComparisons() {

  return apiRequest(
    '/comparisons',
    {
      method: 'GET'
    }
  )

}


export async function getComparisonById(id) {

  return apiRequest(
    `/comparisons/${id}`,
    {
      method: 'GET'
    }
  )

}


export async function deleteComparison(id) {

  return apiRequest(
    `/comparisons/${id}`,
    {
      method: 'DELETE'
    }
  )

}