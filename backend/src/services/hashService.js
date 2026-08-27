const crypto = require('crypto')


function createHash(value) {

  return crypto
    .createHash('sha256')
    .update(value, 'utf8')
    .digest('hex')

}


function normalizeText(text) {

  return text
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')

}


function createCVHash(cvText) {

  return createHash(
    normalizeText(cvText)
  )

}


function createComparisonHash(
  cvAnalysis,
  jobTitle,
  jobOfferText
) {

  const normalizedTitle =
    (jobTitle || '')
      .trim()
      .toLowerCase()

  const normalizedOffer =
    normalizeText(
      jobOfferText
    )

  /*
   * JSON.stringify produce una representación
   * determinista mientras el objeto mantenga
   * el mismo orden de propiedades.
   *
   * El análisis almacenado en PostgreSQL procede
   * del JSON generado originalmente por OpenAI,
   * por lo que al recuperarlo mantenemos ese orden.
   */

  const normalizedCV =
    JSON.stringify(
      cvAnalysis
    )

  return createHash(
    `${normalizedCV}|${normalizedTitle}|${normalizedOffer}`
  )

}


module.exports = {
  createHash,
  normalizeText,
  createCVHash,
  createComparisonHash
}