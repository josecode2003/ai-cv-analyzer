// @ts-check

const { safeFetch } = require('./urlSafetyService')
const { extractTextFromPDFBuffer } = require('./pdfService')

/*
 * Segunda capa de verificación del Market Analysis: no basta con
 * que una URL exista (eso ya lo comprueba verifyUrlReachable en
 * marketAnalysisService.js) — hay que poder leer su contenido
 * para, más adelante, comprobar si ese contenido respalda
 * realmente el dato citado.
 *
 * Este módulo solo se ocupa de "traer y limpiar el contenido de
 * una URL de forma segura y acotada". No decide si el contenido
 * respalda nada — eso es responsabilidad de claimVerificationService.
 */

const CONTENT_FETCH_TIMEOUT_MS = 8000

// Tope duro de bytes leídos del cuerpo de la respuesta, para no
// descargar archivos gigantes ni bloquear el backend.
const MAX_BODY_BYTES = 500 * 1024

// Tope de caracteres de texto que se pasan a los verificadores
// (determinista/LLM), para acotar coste y latencia.
const MAX_CONTENT_CHARS = 6000

/**
 * @param {Response} response
 * @param {number} maxBytes
 * @returns {Promise<Buffer>}
 */
async function readBodyWithLimit(response, maxBytes) {
  if (!response.body || typeof response.body.getReader !== 'function') {
    // Entorno sin streaming body (poco común en Node moderno):
    // recurrimos a arrayBuffer() y truncamos después.
    const buffer = Buffer.from(await response.arrayBuffer())
    return buffer.subarray(0, maxBytes)
  }

  const reader = response.body.getReader()
  const chunks = []
  let received = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      chunks.push(value)
      received += value.byteLength

      if (received >= maxBytes) {
        break
      }
    }
  } finally {
    try {
      await reader.cancel()
    } catch {
      // Ignorado: ya hemos leído lo que necesitábamos.
    }
  }

  return Buffer.concat(chunks.map(Buffer.from)).subarray(0, maxBytes)
}

/*
 * Extracción de texto de HTML deliberadamente ligera (expresiones
 * regulares), sin añadir una dependencia nueva de parsing HTML
 * (cheerio/jsdom) solo para esto.
 */

/**
 * @param {string} html
 * @returns {string}
 */
function stripHtmlToText(html) {
  let text = html

  text = text.replace(/<!--[\s\S]*?-->/g, ' ')
  text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ')
  text = text.replace(/<\/(p|div|br|li|tr|h[1-6])>/gi, '\n')
  text = text.replace(/<[^>]+>/g, ' ')

  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&eacute;/gi, 'é')
    .replace(/&aacute;/gi, 'á')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')

  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/\n[ \t]*/g, '\n')
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim()
}

/**
 * @typedef {{ ok: true, text: string, contentType: string } | { ok: false, reason: string, status?: number }} SourceContentResult
 */

/**
 * @param {string} url
 * @returns {Promise<SourceContentResult>}
 */
async function fetchSourceContent(url) {
  let response

  try {
    response = await safeFetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(CONTENT_FETCH_TIMEOUT_MS)
    })
  } catch {
    return { ok: false, reason: 'timeout_or_network_error' }
  }

  if (!response) {
    return { ok: false, reason: 'blocked_unsafe_url' }
  }

  if (!response.ok) {
    /*
     * Un 403/401/429/5xx significa "no hemos podido leerlo", NO
     * "la fuente es falsa": eso ya lo decide verifyUrlReachable
     * de forma independiente. Aquí solo informamos de que el
     * contenido no está disponible para verificar la afirmación.
     */
    return { ok: false, reason: 'not_ok', status: response.status }
  }

  const contentType = (
    response.headers?.get?.('content-type') || ''
  ).toLowerCase()

  let bodyBuffer

  try {
    bodyBuffer = await readBodyWithLimit(response, MAX_BODY_BYTES)
  } catch {
    return { ok: false, reason: 'timeout_or_network_error' }
  }

  if (bodyBuffer.length === 0) {
    return { ok: false, reason: 'empty_content' }
  }

  if (contentType.includes('application/pdf')) {
    try {
      const text = await extractTextFromPDFBuffer(bodyBuffer)

      if (!text || !text.trim()) {
        return { ok: false, reason: 'unreadable_pdf' }
      }

      return {
        ok: true,
        text: text.slice(0, MAX_CONTENT_CHARS),
        contentType: 'application/pdf'
      }
    } catch {
      return { ok: false, reason: 'unreadable_pdf' }
    }
  }

  const looksLikeHtml =
    contentType.includes('text/html') ||
    contentType.includes('application/xhtml') ||
    (!contentType && /<html[\s>]/i.test(bodyBuffer.toString('utf8', 0, 2048)))

  if (looksLikeHtml) {
    const html = bodyBuffer.toString('utf8')
    const text = stripHtmlToText(html)

    if (!text) {
      return { ok: false, reason: 'unreadable_content' }
    }

    return {
      ok: true,
      text: text.slice(0, MAX_CONTENT_CHARS),
      contentType: 'text/html'
    }
  }

  if (
    contentType.includes('text/plain') ||
    contentType.includes('application/json')
  ) {
    const text = bodyBuffer.toString('utf8').trim()

    if (!text) {
      return { ok: false, reason: 'empty_content' }
    }

    return { ok: true, text: text.slice(0, MAX_CONTENT_CHARS), contentType }
  }

  return { ok: false, reason: 'unsupported_content_type' }
}

module.exports = {
  fetchSourceContent,
  stripHtmlToText,
  MAX_CONTENT_CHARS
}
