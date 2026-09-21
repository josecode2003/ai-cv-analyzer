// @ts-check

const crypto = require('crypto')

/**
 * @param {string} value
 * @returns {string} Hash SHA-256 en hexadecimal.
 */
function createHash(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex')
}

/**
 * Normaliza saltos de línea y espacios para que dos textos
 * equivalentes produzcan siempre el mismo hash.
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return text
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
}

/**
 * Huella de contenido de un CV, usada para detectar
 * si ya fue analizado anteriormente por el mismo usuario.
 *
 * @param {string} cvText
 * @returns {string}
 */
function createCVHash(cvText) {
  return createHash(normalizeText(cvText))
}

/**
 * Huella de una comparación CV + oferta, usada para
 * detectar si ya fue realizada anteriormente.
 *
 * @param {Record<string, unknown>} cvAnalysis
 * @param {string} jobTitle
 * @param {string} jobOfferText
 * @returns {string}
 */
function createComparisonHash(cvAnalysis, jobTitle, jobOfferText) {
  const normalizedTitle = (jobTitle || '').trim().toLowerCase()

  const normalizedOffer = normalizeText(jobOfferText)

  /*
   * JSON.stringify produce una representación
   * determinista mientras el objeto mantenga
   * el mismo orden de propiedades.
   *
   * El análisis almacenado en PostgreSQL procede
   * del JSON generado originalmente por OpenAI,
   * por lo que al recuperarlo mantenemos ese orden.
   */

  const normalizedCV = JSON.stringify(cvAnalysis)

  return createHash(`${normalizedCV}|${normalizedTitle}|${normalizedOffer}`)
}

/**
 * Firma determinista de un perfil profesional, usada como
 * clave de caché del Market Analysis.
 *
 * Dos CVs distintos (incluso de sesiones distintas) que
 * describan el mismo perfil (ocupación + sector + senioridad
 * + ubicación) comparten la misma firma, por lo que el
 * análisis de mercado se reutiliza entre ellos: los datos del
 * mercado no dependen de quién subió el CV, solo del perfil
 * detectado.
 *
 * @param {{
 *   occupation?: string,
 *   sector?: string,
 *   subsector?: string,
 *   seniority?: string,
 *   region?: string
 * }} profile
 * @returns {string}
 */
function createProfileSignature(profile) {
  const normalize = value => (value || '').trim().toLowerCase()

  const parts = [
    normalize(profile.occupation),
    normalize(profile.sector),
    normalize(profile.subsector),
    normalize(profile.seniority),
    normalize(profile.region)
  ]

  return createHash(parts.join('|'))
}

module.exports = {
  createHash,
  normalizeText,
  createCVHash,
  createComparisonHash,
  createProfileSignature
}
