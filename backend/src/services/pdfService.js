// @ts-check

const fs = require('fs')
const { PDFParse } = require('pdf-parse')

/**
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function extractTextFromPDF(filePath) {
  const pdfBuffer = fs.readFileSync(filePath)

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
  extractTextFromPDF
}
