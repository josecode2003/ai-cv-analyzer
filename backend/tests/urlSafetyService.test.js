/*
 * Las URLs verificadas por el Market Analysis proceden de un
 * modelo de IA con acceso a búsqueda web: son INPUT NO CONFIABLE.
 * Estos tests comprueban que safeFetch nunca deja que el backend
 * acceda a infraestructura interna, ni directamente ni a través
 * de una redirección, tanto por IP literal como por resolución
 * DNS (protección real contra DNS rebinding).
 */

const mockDnsLookup = jest.fn()

jest.mock('dns', () => ({
  promises: {
    lookup: (...args) => mockDnsLookup(...args)
  }
}))

const {
  safeFetch,
  checkUrlSafety
} = require('../src/services/urlSafetyService')

function jsonResponse(status, { location } = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: header => (header === 'location' ? location || null : null)
    }
  }
}

describe('checkUrlSafety', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
    mockDnsLookup.mockReset()
  })

  test('rechaza esquemas que no sean http/https', async () => {
    const result = await checkUrlSafety('ftp://example.com/archivo')
    expect(result.safe).toBe(false)
  })

  test('rechaza localhost por nombre', async () => {
    const result = await checkUrlSafety('http://localhost:3000/interno')
    expect(result.safe).toBe(false)
  })

  test('rechaza una IP loopback literal', async () => {
    const result = await checkUrlSafety('http://127.0.0.1/admin')
    expect(result.safe).toBe(false)
  })

  test('rechaza el endpoint de metadata de la nube (169.254.169.254)', async () => {
    const result = await checkUrlSafety(
      'http://169.254.169.254/latest/meta-data'
    )
    expect(result.safe).toBe(false)
  })

  test('rechaza una red privada 10.x literal', async () => {
    const result = await checkUrlSafety('http://10.0.0.5/panel')
    expect(result.safe).toBe(false)
  })

  test('rechaza ::1 (loopback IPv6)', async () => {
    const result = await checkUrlSafety('http://[::1]/interno')
    expect(result.safe).toBe(false)
  })

  test('rechaza un puerto no estándar', async () => {
    const result = await checkUrlSafety('http://example.com:8080/panel')
    expect(result.safe).toBe(false)
  })

  test('acepta un dominio público cuyo DNS resuelve a una IP pública', async () => {
    mockDnsLookup.mockResolvedValue([{ address: '93.184.216.34' }])

    const result = await checkUrlSafety('https://example.com/pagina')

    expect(result.safe).toBe(true)
  })

  test('rechaza un dominio público cuyo DNS resuelve a una IP privada (DNS rebinding)', async () => {
    mockDnsLookup.mockResolvedValue([{ address: '127.0.0.1' }])

    const result = await checkUrlSafety(
      'https://dominio-atacante.example/pagina'
    )

    expect(result.safe).toBe(false)
  })

  test('no bloquea la URL si el DNS simplemente no resuelve (dominio caído, no prueba de ataque)', async () => {
    mockDnsLookup.mockRejectedValue(new Error('ENOTFOUND'))

    const result = await checkUrlSafety(
      'https://dominio-que-no-existe.example/pagina'
    )

    expect(result.safe).toBe(true)
  })
})

describe('safeFetch', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
    mockDnsLookup.mockReset()
  })

  test('devuelve null sin llamar a fetch si la URL inicial no es segura', async () => {
    const fetchMock = jest.fn()
    global.fetch = fetchMock

    const response = await safeFetch('http://127.0.0.1/interno')

    expect(response).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('sigue una redirección segura hasta la respuesta final', async () => {
    mockDnsLookup.mockResolvedValue([{ address: '93.184.216.34' }])

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(302, { location: 'https://example.com/destino' })
      )
      .mockResolvedValueOnce(jsonResponse(200))

    global.fetch = fetchMock

    const response = await safeFetch('https://example.com/origen')

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test('bloquea una redirección hacia un destino interno', async () => {
    mockDnsLookup.mockResolvedValue([{ address: '93.184.216.34' }])

    const fetchMock = jest.fn().mockResolvedValueOnce(
      jsonResponse(302, {
        location: 'http://169.254.169.254/latest/meta-data'
      })
    )

    global.fetch = fetchMock

    const response = await safeFetch('https://example.com/origen')

    expect(response).toBeNull()
    // Solo se llama una vez: el segundo salto se bloquea antes de hacer fetch.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
