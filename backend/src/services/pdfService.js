const fs = require('fs')
const { PDFParse } = require('pdf-parse')

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