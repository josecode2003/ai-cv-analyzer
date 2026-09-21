const mockFetchSourceContent = jest.fn()
const mockVerifyClaim = jest.fn()

jest.mock('../src/services/sourceContentService', () => ({
  fetchSourceContent: (...args) => mockFetchSourceContent(...args)
}))

jest.mock('../src/services/claimVerificationService', () => ({
  verifyClaim: (...args) => mockVerifyClaim(...args)
}))

// verifyMarketResultSources (capa de existencia de URL) no se
// ejerce en estos tests: se alimenta directamente a
// verifyClaimsAgainstContent un resultado que ya la ha superado.
jest.mock('../src/services/urlSafetyService', () => ({
  safeFetch: jest.fn()
}))

const {
  verifyClaimsAgainstContent
} = require('../src/services/marketAnalysisService')

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
    salary: { range: '36.800 € - 55.199 €', period: 'anual', ...evidence() },
    trends: [],
    sectorsHiring: [],
    relatedRoles: [],
    skillsInDemand: [],
    geographicDistribution: [],
    recommendations: [],
    sourcesUsed: [],
    ...overrides
  }
}

describe('verifyClaimsAgainstContent', () => {
  afterEach(() => {
    mockFetchSourceContent.mockReset()
    mockVerifyClaim.mockReset()
  })

  /* Test 1: contenido respalda el dato exacto -> se acepta */
  test('mantiene la evidencia cuando el contenido respalda el dato', async () => {
    mockFetchSourceContent.mockResolvedValue({
      ok: true,
      text: 'El salario oscila entre 36.800 € y 55.199 € anuales.'
    })
    mockVerifyClaim.mockResolvedValue('supported')

    const result = await verifyClaimsAgainstContent(baseResult())

    expect(result.salary.confidence).toBe('otra_fuente')
    expect(result.salary.sourceUrl).toBe('https://example.com/pagina-real')
    expect(result.salary.verification).toEqual({
      urlValid: true,
      contentRetrieved: true,
      claimSupported: true
    })
  })

  /* Test 2: contenido NO respalda el dato -> se rechaza */
  test('degrada a sin_datos_suficientes cuando el contenido no respalda el dato', async () => {
    mockFetchSourceContent.mockResolvedValue({
      ok: true,
      text: 'Esta página no menciona ninguna cifra salarial.'
    })
    mockVerifyClaim.mockResolvedValue('unsupported')

    const result = await verifyClaimsAgainstContent(baseResult())

    expect(result.salary.confidence).toBe('sin_datos_suficientes')
    expect(result.salary.source).toBe('')
    expect(result.salary.sourceUrl).toBe('')
    expect(result.salary.verification.claimSupported).toBe(false)
  })

  /* Test 3: contenido habla del tema pero no respalda la cifra concreta */
  test('no acepta la cifra cuando el contenido solo toca el tema de forma tangencial', async () => {
    mockFetchSourceContent.mockResolvedValue({
      ok: true,
      text: 'Los desarrolladores backend pueden ganar salarios competitivos.'
    })
    mockVerifyClaim.mockResolvedValue('insufficient_evidence')

    const result = await verifyClaimsAgainstContent(baseResult())

    expect(result.salary.confidence).not.toBe('otra_fuente')
    expect(result.salary.confidence).toBe('estimacion')
    expect(result.salary.verification.claimSupported).toBe(false)
  })

  /* Test 4: formato distinto pero equivalente -> se acepta (vía deterministic check real) */
  test('acepta un dato expresado con formato numérico equivalente', async () => {
    mockFetchSourceContent.mockResolvedValue({
      ok: true,
      text: 'Salary ranges from 36,800 to 55,199 EUR annually.'
    })
    mockVerifyClaim.mockResolvedValue('supported')

    const result = await verifyClaimsAgainstContent(baseResult())

    expect(result.salary.confidence).toBe('otra_fuente')
  })

  /* Test 5 y 6: 403/timeout -> URL no se considera falsa, pero el dato no queda como verificado */
  test('ante contenido bloqueado (403), no elimina la fuente pero baja la confianza', async () => {
    mockFetchSourceContent.mockResolvedValue({
      ok: false,
      reason: 'not_ok',
      status: 403
    })

    const result = await verifyClaimsAgainstContent(baseResult())

    expect(result.salary.confidence).toBe('estimacion')
    expect(result.salary.sourceUrl).toBe('https://example.com/pagina-real')
    expect(result.salary.verification).toEqual({
      urlValid: true,
      contentRetrieved: false,
      claimSupported: null
    })
    expect(mockVerifyClaim).not.toHaveBeenCalled()
  })

  test('ante timeout al leer el contenido, no elimina la fuente pero baja la confianza', async () => {
    mockFetchSourceContent.mockResolvedValue({
      ok: false,
      reason: 'timeout_or_network_error'
    })

    const result = await verifyClaimsAgainstContent(baseResult())

    expect(result.salary.confidence).toBe('estimacion')
    expect(result.salary.sourceUrl).toBe('https://example.com/pagina-real')
  })

  /* Test 7: contenido ilegible -> no se marca como verificado */
  test('contenido ilegible no se marca nunca como claim verificado', async () => {
    mockFetchSourceContent.mockResolvedValue({
      ok: false,
      reason: 'unreadable_pdf'
    })

    const result = await verifyClaimsAgainstContent(baseResult())

    expect(result.salary.verification.claimSupported).not.toBe(true)
  })

  /* Test 10: dos evidencias con la misma URL -> una sola descarga */
  test('descarga el contenido una sola vez aunque varias evidencias compartan URL', async () => {
    mockFetchSourceContent.mockResolvedValue({
      ok: true,
      text: 'El salario oscila entre 36.800 € y 55.199 € anuales.'
    })
    mockVerifyClaim.mockResolvedValue('supported')

    await verifyClaimsAgainstContent(
      baseResult({
        demand: {
          level: 'media',
          explanation: 'Explicación',
          ...evidence({ sourceUrl: 'https://example.com/pagina-real' })
        }
      })
    )

    expect(mockFetchSourceContent).toHaveBeenCalledTimes(1)
  })

  /* Test 11: sin_datos_suficientes -> no se intenta validar */
  test('no descarga contenido para evidencias sin_datos_suficientes', async () => {
    await verifyClaimsAgainstContent(
      baseResult({
        situacionActual: {
          summary: 'No hay datos suficientes para estimar este indicador.',
          confidence: 'sin_datos_suficientes',
          source: '',
          sourceUrl: '',
          dataDate: ''
        },
        demand: {
          level: 'sin_datos_suficientes',
          explanation: '',
          confidence: 'sin_datos_suficientes',
          source: '',
          sourceUrl: '',
          dataDate: ''
        },
        salary: {
          range: '',
          period: 'sin_datos_suficientes',
          confidence: 'sin_datos_suficientes',
          source: '',
          sourceUrl: '',
          dataDate: ''
        }
      })
    )

    expect(mockFetchSourceContent).not.toHaveBeenCalled()
  })

  /* Test 12: fuente real pero irrelevante -> no se acepta como evidencia */
  test('una fuente real pero irrelevante para el dato no se acepta como evidencia', async () => {
    mockFetchSourceContent.mockResolvedValue({
      ok: true,
      text: 'Artículo sobre recetas de cocina, sin relación con el mercado laboral.'
    })
    mockVerifyClaim.mockResolvedValue('unsupported')

    const result = await verifyClaimsAgainstContent(baseResult())

    expect(result.salary.confidence).toBe('sin_datos_suficientes')
  })

  /* Test 13: dato inferido -> estimación, no dato oficial */
  test('un dato inferido (no publicado literalmente) se marca como estimación, no como dato oficial', async () => {
    mockFetchSourceContent.mockResolvedValue({
      ok: true,
      text: 'Las ofertas de este perfil aumentaron un 15% el último trimestre.'
    })
    mockVerifyClaim.mockResolvedValue('insufficient_evidence')

    const result = await verifyClaimsAgainstContent(
      baseResult({
        demand: {
          level: 'alta',
          explanation: 'La demanda está creciendo de forma notable.',
          ...evidence({ confidence: 'dato_oficial' })
        }
      })
    )

    expect(result.demand.confidence).toBe('estimacion')
    expect(result.demand.confidence).not.toBe('dato_oficial')
  })

  /* Test 14: el modelo intenta inventar evidencia -> se rechaza si no aparece en el contenido */
  test('rechaza una cifra que el modelo afirma pero que no aparece en el contenido real', async () => {
    mockFetchSourceContent.mockResolvedValue({
      ok: true,
      text: 'Página real sobre empleo tecnológico en España, sin cifras salariales.'
    })
    mockVerifyClaim.mockResolvedValue('unsupported')

    const result = await verifyClaimsAgainstContent(
      baseResult({
        salary: {
          range: '40.000 € - 60.000 €',
          period: 'anual',
          ...evidence({ confidence: 'dato_oficial' })
        }
      })
    )

    expect(result.salary.confidence).toBe('sin_datos_suficientes')
    // La cifra inventada NUNCA debe mostrarse como un dato de
    // mercado confirmado: se sustituye por un mensaje explícito.
    expect(result.salary.range).not.toBe('40.000 € - 60.000 €')
    expect(result.salary.range).toMatch(/no hay datos suficientes/i)
    // El valor original se conserva solo para auditoría/depuración.
    expect(result.salary.verification.originalClaim).toContain('40.000')
  })

  /* Consistencia: toda evidencia recibe un objeto verification, incluida la no citada */
  test('adjunta verification incluso a evidencias que nunca tuvieron fuente', async () => {
    const noEvidence = {
      confidence: 'sin_datos_suficientes',
      source: '',
      sourceUrl: '',
      dataDate: ''
    }

    const result = await verifyClaimsAgainstContent(
      baseResult({
        situacionActual: { summary: '...', ...noEvidence },
        demand: {
          level: 'sin_datos_suficientes',
          explanation: '',
          ...noEvidence
        },
        salary: { range: '', period: 'sin_datos_suficientes', ...noEvidence }
      })
    )

    expect(result.situacionActual.verification).toEqual({
      urlValid: false,
      contentRetrieved: false,
      claimSupported: null
    })
    expect(mockFetchSourceContent).not.toHaveBeenCalled()
  })

  /* dataSufficiency: recalculado, no la propuesta inicial del modelo */

  test('corrige dataSufficiency a partir del estado final, aunque el modelo propusiera "sufficient"', async () => {
    // Los tres campos principales quedan sin verificar (contenido bloqueado).
    mockFetchSourceContent.mockResolvedValue({
      ok: false,
      reason: 'not_ok',
      status: 403
    })

    const result = await verifyClaimsAgainstContent(
      baseResult({ dataSufficiency: 'sufficient' })
    )

    expect(result.dataSufficiency).not.toBe('sufficient')
    expect(result.dataSufficiency).toBe('partial')
  })

  test('recalcula dataSufficiency incluso cuando ninguna evidencia está citada (regresión: bug encontrado en prueba real)', async () => {
    // El modelo no citó fuente para ningún campo principal: no
    // hay nada que descargar/verificar, pero dataSufficiency NO
    // puede seguir siendo "sufficient" solo porque no había
    // ninguna URL que comprobar.
    const noEvidence = {
      confidence: 'estimacion',
      source: '',
      sourceUrl: '',
      dataDate: ''
    }

    const result = await verifyClaimsAgainstContent(
      baseResult({
        dataSufficiency: 'sufficient',
        situacionActual: { summary: '...', ...noEvidence },
        demand: { level: 'media', explanation: '...', ...noEvidence },
        salary: { range: '...', period: 'anual', ...noEvidence }
      })
    )

    expect(mockFetchSourceContent).not.toHaveBeenCalled()
    expect(result.dataSufficiency).not.toBe('sufficient')
    expect(result.dataSufficiency).toBe('partial')
  })

  test('mantiene dataSufficiency = sufficient cuando los tres campos principales quedan respaldados', async () => {
    mockFetchSourceContent.mockResolvedValue({
      ok: true,
      text: 'contenido real'
    })
    mockVerifyClaim.mockResolvedValue('supported')

    const result = await verifyClaimsAgainstContent(
      baseResult({ dataSufficiency: 'sufficient' })
    )

    expect(result.dataSufficiency).toBe('sufficient')
  })

  test('degrada dataSufficiency a insufficient cuando ningún campo principal tiene evidencia', async () => {
    mockFetchSourceContent.mockResolvedValue({
      ok: true,
      text: 'contenido irrelevante'
    })
    mockVerifyClaim.mockResolvedValue('unsupported')

    const result = await verifyClaimsAgainstContent(
      baseResult({ dataSufficiency: 'sufficient' })
    )

    expect(result.dataSufficiency).toBe('insufficient')
  })

  /* Preservar afirmaciones cualitativas correctamente respaldadas */

  test('conserva una afirmación cualitativa cuando sí está respaldada', async () => {
    mockFetchSourceContent.mockResolvedValue({
      ok: true,
      text: 'La mayoría de las ofertas para este perfil se concentran en Madrid.'
    })
    mockVerifyClaim.mockResolvedValue('supported')

    const result = await verifyClaimsAgainstContent(
      baseResult({
        situacionActual: {
          summary: 'La demanda se concentra principalmente en Madrid.',
          ...evidence()
        }
      })
    )

    expect(result.situacionActual.summary).toBe(
      'La demanda se concentra principalmente en Madrid.'
    )
    expect(result.situacionActual.confidence).toBe('otra_fuente')
  })

  /* Porcentaje no respaldado -> no se presenta como hecho */

  test('un porcentaje no respaldado no se presenta como hecho', async () => {
    mockFetchSourceContent.mockResolvedValue({
      ok: true,
      text: 'Página real sobre el sector, sin cifras de crecimiento.'
    })
    mockVerifyClaim.mockResolvedValue('unsupported')

    const result = await verifyClaimsAgainstContent(
      baseResult({
        demand: {
          level: 'alta',
          explanation: 'La demanda creció un 340% este trimestre.',
          ...evidence()
        }
      })
    )

    expect(result.demand.confidence).toBe('sin_datos_suficientes')
    expect(result.demand.explanation).not.toContain('340')
    expect(result.demand.level).toBe('sin_datos_suficientes')
    expect(result.demand.verification.originalClaim).toContain('340')
  })
})

describe('computeDataSufficiency', () => {
  const {
    computeDataSufficiency
  } = require('../src/services/marketAnalysisService')

  function withStates(states) {
    return {
      situacionActual: { confidence: states[0] },
      demand: { confidence: states[1] },
      salary: { confidence: states[2] }
    }
  }

  test('sufficient cuando al menos dos de los tres campos principales están respaldados', () => {
    expect(
      computeDataSufficiency(
        withStates(['otra_fuente', 'dato_oficial', 'estimacion'])
      )
    ).toBe('sufficient')
  })

  test('partial cuando solo un campo está respaldado', () => {
    expect(
      computeDataSufficiency(
        withStates(['otra_fuente', 'estimacion', 'sin_datos_suficientes'])
      )
    ).toBe('partial')
  })

  test('partial cuando ningún campo está respaldado pero hay estimaciones', () => {
    expect(
      computeDataSufficiency(
        withStates(['estimacion', 'estimacion', 'sin_datos_suficientes'])
      )
    ).toBe('partial')
  })

  test('insufficient cuando los tres campos están sin datos', () => {
    expect(
      computeDataSufficiency(
        withStates([
          'sin_datos_suficientes',
          'sin_datos_suficientes',
          'sin_datos_suficientes'
        ])
      )
    ).toBe('insufficient')
  })
})
