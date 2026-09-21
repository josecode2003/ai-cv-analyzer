// @ts-check

/**
 * @param {string} text
 * @returns {string}
 */
function cleanCVText(text) {
  if (!text || typeof text !== 'string') {
    return ''
  }

  let cleanedText = text

  // Normalizar saltos de línea
  cleanedText = cleanedText.replace(/\r\n/g, '\n')
  cleanedText = cleanedText.replace(/\r/g, '\n')

  // Eliminar espacios y tabulaciones al principio/final de cada línea
  cleanedText = cleanedText
    .split('\n')
    .map(line => line.trim())
    .join('\n')

  // Eliminar líneas vacías consecutivas
  cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n')

  // Eliminar espacios consecutivos
  cleanedText = cleanedText.replace(/[ \t]{2,}/g, ' ')

  // Eliminar espacios al principio y final del documento
  cleanedText = cleanedText.trim()

  return cleanedText
}

module.exports = {
  cleanCVText
}
