/*
 * pickNews/verifyKeyFigures usan safeFetch (protección SSRF + DNS),
 * fetchSourceContent y verifyClaim. Aquí se prueba la lógica de
 * selección, no esas dependencias (que tienen su propia suite), así
 * que se mockean.
 */
jest.mock('../src/services/urlSafetyService', () => ({
  safeFetch: (url, options) => global.fetch(url, options)
}))

const mockFetchSourceContent = jest.fn()
const mockVerifyClaim = jest.fn()

jest.mock('../src/services/sourceContentService', () => ({
  fetchSourceContent: (...args) => mockFetchSourceContent(...args)
}))

jest.mock('../src/services/claimVerificationService', () => ({
  verifyClaim: (...args) => mockVerifyClaim(...args)
}))

const {
  pickNews,
  cleanArticleUrl,
  verifyKeyFigures,
  isNewspaperUrl,
  isRecentDate,
  todayInSpain
} = require('../src/services/marketAnalysisService')

const TODAY = '2026-09-23'

function news(overrides = {}) {
  return {
    title: 'El paro baja en septiembre',
    publisher: 'El País',
    url: 'https://elpais.com/economia/2026-09-20/el-paro-baja.html',
    publishedAt: '2026-09-20',
    ...overrides
  }
}

function mockHttpStatus(statusByUrl) {
  global.fetch = jest.fn(async url => ({
    status: statusByUrl[url] ?? 200
  }))
}

describe('isNewspaperUrl', () => {
  test('acepta periódicos españoles y sus subdominios', () => {
    expect(isNewspaperUrl('https://elpais.com/economia/x.html')).toBe(true)
    expect(isNewspaperUrl('https://www.rtve.es/noticias/x')).toBe(true)
    expect(isNewspaperUrl('https://cincodias.elpais.com/x')).toBe(true)
  })

  test('rechaza otros dominios, imitaciones y protocolos no web', () => {
    expect(isNewspaperUrl('https://blog-empleo.com/elpais.com')).toBe(false)
    expect(isNewspaperUrl('https://elpais.com.evil.io/x')).toBe(false)
    expect(isNewspaperUrl('https://notelpais.com/x')).toBe(false)
    expect(isNewspaperUrl('javascript:alert(1)')).toBe(false)
    expect(isNewspaperUrl('no es una url')).toBe(false)
  })
})

describe('isRecentDate', () => {
  test('acepta fechas recientes y rechaza antiguas, futuras o mal formadas', () => {
    expect(isRecentDate('2026-09-23', TODAY)).toBe(true)
    expect(isRecentDate('2026-08-20', TODAY)).toBe(true)
    expect(isRecentDate('2026-06-01', TODAY)).toBe(false)
    expect(isRecentDate('2026-09-30', TODAY)).toBe(false)
    expect(isRecentDate('23/09/2026', TODAY)).toBe(false)
    expect(isRecentDate('', TODAY)).toBe(false)
  })
})

describe('cleanArticleUrl', () => {
  test('quita los parámetros utm y conserva el resto', () => {
    expect(
      cleanArticleUrl('https://elpais.com/a.html?id=3&utm_source=openai')
    ).toBe('https://elpais.com/a.html?id=3')
  })
})

describe('pickNews', () => {
  test('elige la noticia válida más reciente', async () => {
    mockHttpStatus({})

    const picked = await pickNews(
      [
        news({ url: 'https://elpais.com/a.html', publishedAt: '2026-09-10' }),
        news({ url: 'https://www.rtve.es/b', publishedAt: '2026-09-21' }),
        news({ url: 'https://abc.es/c', publishedAt: '2026-09-15' })
      ],
      TODAY
    )

    expect(picked.url).toBe('https://www.rtve.es/b')
  })

  test('descarta una noticia cuya URL da 404 y pasa a la siguiente', async () => {
    mockHttpStatus({ 'https://www.rtve.es/b': 404 })

    const picked = await pickNews(
      [
        news({ url: 'https://www.rtve.es/b', publishedAt: '2026-09-21' }),
        news({ url: 'https://abc.es/c', publishedAt: '2026-09-15' })
      ],
      TODAY
    )

    expect(picked.url).toBe('https://abc.es/c')
  })

  test('no penaliza a un periódico que bloquea bots (403)', async () => {
    mockHttpStatus({ 'https://elpais.com/a.html': 403 })

    const picked = await pickNews(
      [news({ url: 'https://elpais.com/a.html' })],
      TODAY
    )

    expect(picked).not.toBeNull()
  })

  test('devuelve null si ninguna noticia es de un periódico o es reciente', async () => {
    mockHttpStatus({})

    const picked = await pickNews(
      [
        news({ url: 'https://blog.example.com/x' }),
        news({ publishedAt: '2025-01-01' })
      ],
      TODAY
    )

    expect(picked).toBeNull()
  })
})

describe('verifyKeyFigures', () => {
  beforeEach(() => {
    mockFetchSourceContent.mockReset()
    mockVerifyClaim.mockReset()
  })

  test('publica solo las cifras que la fuente respalda y oculta la URL', async () => {
    mockFetchSourceContent.mockResolvedValue({ ok: true, text: 'contenido' })
    mockVerifyClaim
      .mockResolvedValueOnce('supported')
      .mockResolvedValueOnce('unsupported')
      .mockResolvedValueOnce('insufficient_evidence')

    const figures = await verifyKeyFigures([
      { label: 'A', value: '1 %', period: 'T2', sourceUrl: 'https://ine.es/a' },
      { label: 'B', value: '2 %', period: 'T2', sourceUrl: 'https://ine.es/b' },
      { label: 'C', value: '3 %', period: 'T2', sourceUrl: 'https://ine.es/c' }
    ])

    expect(figures).toEqual([{ label: 'A', value: '1 %', period: 'T2' }])
  })

  test('descarta una cifra cuya fuente no se puede leer o no tiene URL', async () => {
    mockFetchSourceContent.mockResolvedValue({ ok: false, reason: 'timeout' })

    const figures = await verifyKeyFigures([
      { label: 'A', value: '1 %', period: 'T2', sourceUrl: 'https://ine.es/a' },
      { label: 'B', value: '2 %', period: 'T2', sourceUrl: '' }
    ])

    expect(figures).toEqual([])
    expect(mockVerifyClaim).not.toHaveBeenCalled()
  })
})

describe('todayInSpain', () => {
  test('usa la hora de Madrid, no la del servidor', () => {
    // 23:30 UTC del 22 de septiembre ya es día 23 en Madrid (UTC+2).
    expect(todayInSpain(new Date('2026-09-22T23:30:00Z'))).toBe('2026-09-23')
  })
})
