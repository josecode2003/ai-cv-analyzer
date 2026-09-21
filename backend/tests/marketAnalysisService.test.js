const {
  verifyMarketResultSources,
  sanitizeMarketResultFormat
} = require('../src/services/marketAnalysisService')

/*
 * Reproduce en CI, de forma determinista, el problema
 * encontrado en producción: el modelo puede citar una URL con
 * forma perfectamente válida, en un dominio real, que
 * simplemente no existe. verifyMarketResultSources debe
 * detectarlo con una comprobación HTTP real (aquí, mockeada) y
 * degradar esa evidencia a estimación sin fuente.
 */

function evidence(overrides = {}) {
  return {
    confidence: 'otra_fuente',
    source: 'Fuente de prueba',
    sourceUrl: 'https://example.com/pagina-real',
    dataDate: '2026-01-01',
    ...overrides
  }
}

function baseResult(overrides = {}) {
  return {
    situacionActual: { summary: 'Resumen', ...evidence() },
    demand: { level: 'media', explanation: 'Explicación', ...evidence() },
    salary: { range: '20000-30000', period: 'anual', ...evidence() },
    trends: [],
    sectorsHiring: [],
    relatedRoles: [],
    skillsInDemand: [],
    geographicDistribution: [],
    recommendations: [],
    sourcesUsed: [
      {
        title: 'Fuente de prueba',
        url: 'https://example.com/pagina-real',
        publisher: 'Test',
        date: '2026-01-01'
      }
    ],
    ...overrides
  }
}

describe('verifyMarketResultSources', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  test('degrada a estimación una fuente cuya URL responde 404', async () => {
    global.fetch = jest.fn(async () => ({ status: 404 }))

    const result = await verifyMarketResultSources(baseResult())

    expect(result.situacionActual.confidence).toBe('estimacion')
    expect(result.situacionActual.source).toBe('')
    expect(result.situacionActual.sourceUrl).toBe('')
    expect(result.demand.confidence).toBe('estimacion')
    expect(result.salary.confidence).toBe('estimacion')
    expect(result.sourcesUsed).toEqual([])
  })

  test('degrada a estimación una fuente cuya URL responde 410', async () => {
    global.fetch = jest.fn(async () => ({ status: 410 }))

    const result = await verifyMarketResultSources(baseResult())

    expect(result.situacionActual.confidence).toBe('estimacion')
  })

  test('mantiene la cita cuando la URL responde correctamente (200)', async () => {
    global.fetch = jest.fn(async () => ({ status: 200 }))

    const result = await verifyMarketResultSources(baseResult())

    expect(result.situacionActual.confidence).toBe('otra_fuente')
    expect(result.situacionActual.sourceUrl).toBe(
      'https://example.com/pagina-real'
    )
    expect(result.sourcesUsed).toHaveLength(1)
  })

  test('no castiga una fuente real bloqueada por el sitio (403)', async () => {
    global.fetch = jest.fn(async () => ({ status: 403 }))

    const result = await verifyMarketResultSources(baseResult())

    expect(result.situacionActual.confidence).toBe('otra_fuente')
  })

  test('no castiga una fuente ante un fallo de red o timeout', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('network error')
    })

    const result = await verifyMarketResultSources(baseResult())

    expect(result.situacionActual.confidence).toBe('otra_fuente')
  })

  test('reintenta con GET cuando HEAD devuelve 405, y degrada si el GET es 404', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ status: 405 })
      .mockResolvedValueOnce({ status: 404 })

    const result = await verifyMarketResultSources(baseResult())

    expect(result.situacionActual.confidence).toBe('estimacion')
  })

  const noEvidence = () => ({
    confidence: 'sin_datos_suficientes',
    source: '',
    sourceUrl: '',
    dataDate: ''
  })

  test('deduplica URLs repetidas en una sola comprobación', async () => {
    const fetchMock = jest.fn(async () => ({ status: 200 }))
    global.fetch = fetchMock

    const sameUrl = 'https://example.com/misma-url'

    await verifyMarketResultSources(
      baseResult({
        situacionActual: { summary: 'A', ...evidence({ sourceUrl: sameUrl }) },
        demand: {
          level: 'media',
          explanation: 'B',
          ...evidence({ sourceUrl: sameUrl })
        },
        salary: { range: '', period: 'sin_datos_suficientes', ...noEvidence() },
        sourcesUsed: []
      })
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('no verifica evidencias marcadas como sin_datos_suficientes', async () => {
    const fetchMock = jest.fn(async () => ({ status: 404 }))
    global.fetch = fetchMock

    await verifyMarketResultSources(
      baseResult({
        situacionActual: { summary: 'Sin datos', ...noEvidence() },
        demand: {
          level: 'sin_datos_suficientes',
          explanation: '',
          ...noEvidence()
        },
        salary: { range: '', period: 'sin_datos_suficientes', ...noEvidence() },
        sourcesUsed: []
      })
    )

    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('sanitizeMarketResultFormat', () => {
  test('degrada una URL con formato inválido antes incluso de verificarla en red', () => {
    const result = sanitizeMarketResultFormat(
      baseResult({
        situacionActual: {
          summary: 'Resumen',
          ...evidence({ sourceUrl: 'esto-no-es-una-url' })
        }
      })
    )

    expect(result.situacionActual.confidence).toBe('estimacion')
    expect(result.situacionActual.sourceUrl).toBe('')
  })
})
