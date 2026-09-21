// @ts-check

const fs = require('fs')
const { PDFParse } = require('pdf-parse')

/**
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function extractTextFromPDF(filePath) {
  const pdfBuffer = fs.readFileSync(filePath)

  return extractTextFromPDFBuffer(pdfBuffer)
}

/**
 * Igual que extractTextFromPDF, pero para un PDF que ya está en
 * memoria (p. ej. descargado de una fuente del Market Analysis),
 * sin pasar por el sistema de archivos.
 *
 * @param {Buffer} pdfBuffer
 * @returns {Promise<string>}
 */
async function extractTextFromPDFBuffer(pdfBuffer) {
  const parser = new PDFParse({
    data: pdfBuffer
  })

  try {
    const result = await parser.getText()

    return result.text
  } finally {
    await parser.destroy()
  }
}

module.exports = {
  extractTextFromPDF,
  extractTextFromPDFBuffer
}
