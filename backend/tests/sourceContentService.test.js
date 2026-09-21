const mockSafeFetch = jest.fn()

jest.mock('../src/services/urlSafetyService', () => ({
  safeFetch: (...args) => mockSafeFetch(...args)
}))

const {
  fetchSourceContent,
  stripHtmlToText
} = require('../src/services/sourceContentService')

function htmlResponse(html, { status = 200, contentType = 'text/html' } = {}) {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(html)

  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: header => (header === 'content-type' ? contentType : null)
    },
    body: {
      getReader() {
        let sent = false
        return {
          async read() {
            if (sent) {
              return { done: true, value: undefined }
            }
            sent = true
            return { done: false, value: bytes }
          },
          async cancel() {}
        }
      }
    },
    arrayBuffer: async () => bytes.buffer
  }
}

describe('stripHtmlToText', () => {
  test('elimina scripts, estilos y etiquetas, conservando el texto útil', () => {
    const html = `
      <html><head><style>.a{color:red}</style><script>alert(1)</script></head>
      <body><h1>Título</h1><p>El salario medio es 42.000 €.</p></body></html>
    `

    const text = stripHtmlToText(html)

    expect(text).toContain('Título')
    expect(text).toContain('El salario medio es 42.000 €.')
    expect(text).not.toContain('alert(1)')
    expect(text).not.toContain('color:red')
  })
})

describe('fetchSourceContent', () => {
  afterEach(() => {
    mockSafeFetch.mockReset()
  })

  test('devuelve el texto extraído de una página HTML real', async () => {
    mockSafeFetch.mockResolvedValue(
      htmlResponse(
        '<html><body><p>El salario es 36.800 € - 55.199 €.</p></body></html>'
      )
    )

    const result = await fetchSourceContent('https://example.com/salario')

    expect(result.ok).toBe(true)
    expect(result.text).toContain('36.800')
    expect(result.text).toContain('55.199')
  })

  test('devuelve blocked_unsafe_url cuando safeFetch bloquea la URL (SSRF)', async () => {
    mockSafeFetch.mockResolvedValue(null)

    const result = await fetchSourceContent(
      'http://169.254.169.254/latest/meta-data'
    )

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('blocked_unsafe_url')
  })

  test('devuelve not_ok (no rechaza la URL) ante un 403', async () => {
    mockSafeFetch.mockResolvedValue(htmlResponse('', { status: 403 }))

    const result = await fetchSourceContent('https://example.com/bloqueado')

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('not_ok')
    expect(result.status).toBe(403)
  })

  test('devuelve timeout_or_network_error si safeFetch lanza (timeout/red)', async () => {
    mockSafeFetch.mockRejectedValue(new Error('timeout'))

    const result = await fetchSourceContent('https://example.com/lento')

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('timeout_or_network_error')
  })

  test('trunca el contenido a MAX_CONTENT_CHARS', async () => {
    const longHtml = `<html><body><p>${'a'.repeat(20000)}</p></body></html>`
    mockSafeFetch.mockResolvedValue(htmlResponse(longHtml))

    const result = await fetchSourceContent('https://example.com/largo')

    expect(result.ok).toBe(true)
    expect(result.text.length).toBeLessThanOrEqual(6000)
  })

  test('rechaza un tipo de contenido no soportado', async () => {
    mockSafeFetch.mockResolvedValue(
      htmlResponse('binary-data', { contentType: 'application/octet-stream' })
    )

    const result = await fetchSourceContent('https://example.com/archivo.bin')

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('unsupported_content_type')
  })
})
