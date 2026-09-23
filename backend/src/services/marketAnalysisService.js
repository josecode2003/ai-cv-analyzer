// @ts-check

const OpenAI = /** @type {any} */ (require('openai'))

const { MARKET_DATA_VERSION } = require('../config/versions')

const { safeFetch } = require('./urlSafetyService')

const { fetchSourceContent } = require('./sourceContentService')

const { verifyClaim } = require('./claimVerificationService')

const {
  findSnapshot,
  findLatestSnapshot,
  saveSnapshot
} = require('../repositories/laborMarketRepository')

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3
})

const MARKET_ANALYSIS_MODEL = 'gpt-4.1'

const MARKET_ANALYSIS_VERSION = `${MARKET_ANALYSIS_MODEL}-v2`

/*
 * El informe de mercado tiene dos partes independientes:
 *
 * - general: la situación del mercado laboral en España. No depende
 *   del CV, así que se genera como mucho una vez al día y se comparte
 *   entre todos los usuarios (labor_market_snapshots).
 * - profession: 2-3 frases sobre la demanda de la profesión del CV
 *   (se cachea por profesión en market_analyses, ver marketRoutes).
 *
 * Por decisión de producto no se muestran fuentes ni enlaces, salvo
 * UNA noticia reciente de un periódico. Aun así, las cifras se siguen
 * verificando internamente contra la página de la que salen, y solo
 * se publican las que la página respalda.
 */

const GENERAL_TIMEOUT_MS = 90000
const PROFESSION_TIMEOUT_MS = 60000

const FALLBACK_SNAPSHOT_MAX_AGE_DAYS = 7
const NEWS_MAX_AGE_DAYS = 45

/*
 * Solo se enlaza una noticia si viene de un medio de información
 * general o económica español reconocido. Evita enlazar blogs,
 * agregadores o páginas corporativas que el modelo haya encontrado.
 */
const NEWSPAPER_DOMAINS = [
  'elpais.com',
  'elmundo.es',
  'abc.es',
  'lavanguardia.com',
  'elconfidencial.com',
  'expansion.com',
  'eleconomista.es',
  'cincodias.elpais.com',
  'rtve.es',
  '20minutos.es',
  'europapress.es',
  'eldiario.es',
  'elperiodico.com',
  'larazon.es',
  'publico.es',
  'efe.com',
  'cadenaser.com',
  'cope.es',
  'lainformacion.com',
  'elespanol.com',
  'infolibre.es',
  'newtral.es',
  'antena3.com',
  'telecinco.es',
  'lasexta.com',
  'heraldo.es',
  'lavozdegalicia.es',
  'elcorreo.com',
  'diariovasco.com',
  'lasprovincias.es',
  'levante-emv.com',
  'diariodesevilla.es',
  'elnortedecastilla.es',
  'ideal.es',
  'laverdad.es',
  'lne.es',
  'farodevigo.es',
  'diariodemallorca.es',
  'canarias7.es',
  'eldia.es',
  'diariodenavarra.es',
  'elcomercio.es',
  'ara.cat',
  'elnacional.cat',
  'naiz.eus',
  'huffingtonpost.es',
  'vozpopuli.com',
  'elplural.com'
]

const generalSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    headline: { type: 'string' },
    summary: { type: 'string' },
    keyFigures: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
          period: { type: 'string' },
          sourceUrl: { type: 'string' }
        },
        required: ['label', 'value', 'period', 'sourceUrl']
      }
    },
    highlights: { type: 'array', items: { type: 'string' } },
    newsCandidates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          publisher: { type: 'string' },
          url: { type: 'string' },
          publishedAt: { type: 'string' }
        },
        required: ['title', 'publisher', 'url', 'publishedAt']
      }
    }
  },
  required: [
    'headline',
    'summary',
    'keyFigures',
    'highlights',
    'newsCandidates'
  ]
}

const GENERAL_PROMPT = `
You are a labor-market analyst writing a short, plain-language briefing about the CURRENT state of the job market in Spain (España) as a whole, for job seekers of any profession.

You have a "web_search" tool. You MUST use it before answering: look for the most recent official data (INE – Encuesta de Población Activa, afiliación a la Seguridad Social, paro registrado del SEPE / Ministerio de Trabajo) and the most recent news about the Spanish labor market.

Return:
- headline: one sentence (max ~110 characters) summarizing the current situation.
- summary: one paragraph of 4-6 sentences in plain Spanish explaining the general situation: employment and unemployment trend, which sectors are creating or losing jobs, youth and long-term unemployment, temporary vs permanent contracts, and anything notable right now. Do NOT include numbers or percentages in the summary (figures go only in keyFigures). Do not mention sources, websites or publications.
- keyFigures: 3-5 of the most important CURRENT figures (e.g. tasa de paro EPA, número de afiliados a la Seguridad Social, paro registrado, tasa de paro juvenil). value is the figure exactly as published (e.g. "10,3 %", "21,8 millones"). period is the reference period (e.g. "EPA 2.º trimestre 2026", "agosto 2026"). sourceUrl is the exact URL of the page where you read that figure (it is used only for internal verification and never shown). Only include figures you actually found in a retrieved page; never use your own background knowledge for a figure.
- highlights: 3-4 short sentences (max ~120 characters each) with the key takeaways for a job seeker. No numbers, no sources.
- newsCandidates: up to 3 of the MOST RECENT news articles about the Spanish labor market (employment, unemployment, afiliación, EPA, paro) published by Spanish newspapers (e.g. El País, El Mundo, ABC, La Vanguardia, Expansión, Cinco Días, elEconomista, El Confidencial, RTVE, 20minutos, Europa Press, elDiario.es). Most recent first. publishedAt in YYYY-MM-DD. Only real articles you found with web_search, with their exact URL — never invent or guess a URL.

All text in Spanish (Spain). Return ONLY the JSON structure requested by the schema.
`

const newsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    newsCandidates: generalSchema.properties.newsCandidates
  },
  required: ['newsCandidates']
}

const NEWS_PROMPT = `
Using the "web_search" tool, find the MOST RECENT news articles about the Spanish labor market (empleo, paro, afiliación a la Seguridad Social, EPA, contratación) published by Spanish newspapers. Return up to 5, most recent first, with the exact title, the newspaper name, the exact article URL and the publication date (YYYY-MM-DD). Only real articles you found with web_search — never invent or guess a URL. Return ONLY the JSON structure requested by the schema.
`

const professionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    demandLevel: {
      type: 'string',
      enum: ['alta', 'media', 'baja', 'sin_datos']
    },
    note: { type: 'string' },
    skillsInDemand: { type: 'array', items: { type: 'string' } }
  },
  required: ['demandLevel', 'note', 'skillsInDemand']
}

const PROFESSION_PROMPT = `
You are a labor-market analyst for Spain (España). You write a very short note about the current job demand for ONE occupation in Spain.

You have a "web_search" tool. Use it to check current information (job-offer volume, sector reports, SEPE/observatorio de las ocupaciones, recent news) before answering.

Return:
- demandLevel: "alta", "media" or "baja" according to what you found; "sin_datos" if you could not find reliable current information for this occupation.
- note: 2-3 sentences in plain Spanish about how demand for this occupation is doing in Spain right now and what employers are looking for. Do not include specific figures or percentages, and do not mention sources, websites or publications. If demandLevel is "sin_datos", say plainly that there is not enough recent information about this occupation.
- skillsInDemand: 3-5 short labels of skills, qualifications or specializations currently most demanded for this occupation in Spain. Empty array if "sin_datos".

All text in Spanish (Spain). Return ONLY the JSON structure requested by the schema.
`

const webSearchTool = size => ({
  type: 'web_search',
  search_context_size: size,
  user_location: { type: 'approximate', country: 'ES' }
})

/**
 * Fecha de hoy en España (YYYY-MM-DD): el resumen general es "del día"
 * para un usuario español, no según la zona horaria del servidor.
 *
 * @param {Date} [now]
 * @returns {string}
 */
function todayInSpain(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)
}

const URL_VERIFY_TIMEOUT_MS = 5000

/*
 * Solo se descarta una URL ante evidencia clara de que no existe
 * (404/410 tras seguir redirecciones) o de que no es segura (SSRF).
 * Un timeout o un 401/403/429 no prueban que la página sea falsa:
 * muchos periódicos bloquean peticiones automáticas.
 *
 * @param {string} url
 * @returns {Promise<boolean>}
 */
async function verifyUrlReachable(url) {
  try {
    const headResponse = await safeFetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(URL_VERIFY_TIMEOUT_MS)
    })

    if (!headResponse) {
      return false
    }

    if (headResponse.status === 404 || headResponse.status === 410) {
      return false
    }

    if (headResponse.status !== 405) {
      return true
    }

    const getResponse = await safeFetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(URL_VERIFY_TIMEOUT_MS)
    })

    if (!getResponse) {
      return false
    }

    return getResponse.status !== 404 && getResponse.status !== 410
  } catch {
    return true
  }
}

/**
 * @param {string} url
 * @returns {boolean}
 */
function isNewspaperUrl(url) {
  let hostname

  try {
    const parsed = new URL(url)

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false
    }

    hostname = parsed.hostname.toLowerCase()
  } catch {
    return false
  }

  return NEWSPAPER_DOMAINS.some(
    domain => hostname === domain || hostname.endsWith(`.${domain}`)
  )
}

/**
 * @param {string} publishedAt
 * @param {string} today YYYY-MM-DD
 * @returns {boolean}
 */
function isRecentDate(publishedAt, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt || '')) {
    return false
  }

  const published = Date.parse(`${publishedAt}T00:00:00Z`)
  const reference = Date.parse(`${today}T00:00:00Z`)

  if (Number.isNaN(published)) {
    return false
  }

  const ageDays = (reference - published) / (24 * 60 * 60 * 1000)

  return ageDays >= 0 && ageDays <= NEWS_MAX_AGE_DAYS
}

/**
 * Quita los parámetros de seguimiento (utm_*, etc.) que añade la
 * búsqueda web, para enlazar la URL limpia del artículo.
 *
 * @param {string} url
 * @returns {string}
 */
function cleanArticleUrl(url) {
  try {
    const parsed = new URL(url)

    parsed.username = ''
    parsed.password = ''

    for (const key of [...parsed.searchParams.keys()]) {
      if (/^utm_/i.test(key)) {
        parsed.searchParams.delete(key)
      }
    }

    return parsed.toString()
  } catch {
    return url
  }
}

/**
 * Elige la noticia más reciente que cumple todas las condiciones:
 * periódico reconocido, fecha reciente y URL que existe de verdad.
 *
 * @param {Array<{ title: string, publisher: string, url: string, publishedAt: string }>} candidates
 * @param {string} today
 * @returns {Promise<{ title: string, publisher: string, url: string, publishedAt: string } | null>}
 */
async function pickNews(candidates, today) {
  const eligible = (candidates || [])
    .filter(
      news =>
        news?.title &&
        isNewspaperUrl(news.url) &&
        isRecentDate(news.publishedAt, today)
    )
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  for (const news of eligible) {
    const url = cleanArticleUrl(news.url)

    if (await verifyUrlReachable(url)) {
      return {
        title: news.title,
        publisher: news.publisher,
        url,
        publishedAt: news.publishedAt
      }
    }
  }

  return null
}

/**
 * Búsqueda dedicada solo a noticias. Se usa cuando el informe general
 * no trae ninguna noticia válida (ocurre de forma intermitente: el
 * modelo a veces prioriza las cifras y no devuelve candidatas).
 *
 * @param {string} today
 * @returns {Promise<Array<{ title: string, publisher: string, url: string, publishedAt: string }>>}
 */
async function searchLatestNews(today) {
  const response = await client.responses.create(
    {
      model: MARKET_ANALYSIS_MODEL,
      temperature: 0,
      tools: [webSearchTool('medium')],
      input: [
        { role: 'system', content: NEWS_PROMPT },
        { role: 'user', content: `Today is ${today}.` }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'labor_market_news',
          strict: true,
          schema: newsSchema
        }
      }
    },
    { timeout: PROFESSION_TIMEOUT_MS }
  )

  return JSON.parse(response.output_text).newsCandidates
}

/**
 * Publica solo las cifras que la página citada respalda. Una cifra
 * que no se puede comprobar no se muestra: el resumen sigue siendo
 * útil sin ella, y una cifra inventada no.
 *
 * @param {Array<{ label: string, value: string, period: string, sourceUrl: string }>} keyFigures
 * @returns {Promise<Array<{ label: string, value: string, period: string }>>}
 */
async function verifyKeyFigures(keyFigures) {
  const results = await Promise.all(
    (keyFigures || []).map(async figure => {
      if (!figure?.value || !/^https?:\/\//i.test(figure.sourceUrl || '')) {
        return null
      }

      const content = await fetchSourceContent(figure.sourceUrl)

      if (!content.ok) {
        return null
      }

      const verdict = await verifyClaim(
        `${figure.label}: ${figure.value} (${figure.period})`,
        content.text
      )

      if (verdict !== 'supported') {
        return null
      }

      return { label: figure.label, value: figure.value, period: figure.period }
    })
  )

  return /** @type {any[]} */ (results.filter(Boolean))
}

/**
 * @param {string} today
 * @returns {Promise<Record<string, any>>}
 */
async function generateGeneralSnapshot(today) {
  const response = await client.responses.create(
    {
      model: MARKET_ANALYSIS_MODEL,
      temperature: 0,
      tools: [webSearchTool('medium')],
      input: [
        { role: 'system', content: GENERAL_PROMPT },
        {
          role: 'user',
          content: `Today is ${today}. Write the briefing about the Spanish labor market as of today.`
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'labor_market_general',
          strict: true,
          schema: generalSchema
        }
      }
    },
    { timeout: GENERAL_TIMEOUT_MS }
  )

  const parsed = JSON.parse(response.output_text)

  const [keyFigures, news] = await Promise.all([
    verifyKeyFigures(parsed.keyFigures),
    pickNews(parsed.newsCandidates, today).then(
      async found =>
        found || pickNews(await searchLatestNews(today).catch(() => []), today)
    )
  ])

  return {
    updatedAt: today,
    headline: parsed.headline,
    summary: parsed.summary,
    keyFigures,
    highlights: (parsed.highlights || []).filter(h => h && h.trim()),
    news
  }
}

/*
 * Varias peticiones a la vez el primer día no deben lanzar varias
 * búsquedas web idénticas: comparten la misma promesa.
 */
let inFlightGeneral = null

/*
 * Tras un fallo (búsqueda caída, límite de la API...) no se reintenta
 * en cada petición: durante este intervalo se sirve el último resumen
 * disponible, para no repetir búsquedas web de 90 s que van a fallar.
 */
const GENERAL_FAILURE_COOLDOWN_MS = 10 * 60 * 1000
let lastGeneralFailureAt = 0

async function latestFallbackSnapshot() {
  const fallback = await findLatestSnapshot(
    MARKET_DATA_VERSION,
    FALLBACK_SNAPSHOT_MAX_AGE_DAYS
  )

  return fallback ? fallback.result : null
}

/**
 * @returns {Promise<Record<string, any> | null>} null si no hay ningún resumen disponible
 */
async function getGeneralMarketSummary() {
  const today = todayInSpain()

  const stored = await findSnapshot(today, MARKET_DATA_VERSION)

  if (stored) {
    return stored.result
  }

  if (Date.now() - lastGeneralFailureAt < GENERAL_FAILURE_COOLDOWN_MS) {
    return latestFallbackSnapshot()
  }

  if (!inFlightGeneral) {
    inFlightGeneral = generateGeneralSnapshot(today)
      .then(snapshot => saveSnapshot(today, MARKET_DATA_VERSION, snapshot))
      .then(saved => saved.result)
      .finally(() => {
        inFlightGeneral = null
      })
  }

  try {
    return await inFlightGeneral
  } catch (error) {
    console.error('Error generando el resumen general del mercado:', error)

    lastGeneralFailureAt = Date.now()

    return latestFallbackSnapshot()
  }
}

/**
 * @param {{ occupation: string, sector?: string }} profile
 * @returns {Promise<{ occupation: string, demandLevel: string, note: string, skillsInDemand: string[] }>}
 */
async function analyzeProfessionDemand(profile) {
  const response = await client.responses.create(
    {
      model: MARKET_ANALYSIS_MODEL,
      temperature: 0,
      tools: [webSearchTool('low')],
      input: [
        { role: 'system', content: PROFESSION_PROMPT },
        {
          role: 'user',
          content: `Occupation: ${profile.occupation}\nSector: ${profile.sector || 'No indicado'}\nToday is ${todayInSpain()}.`
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'profession_demand',
          strict: true,
          schema: professionSchema
        }
      }
    },
    { timeout: PROFESSION_TIMEOUT_MS }
  )

  const parsed = JSON.parse(response.output_text)

  return {
    occupation: profile.occupation,
    demandLevel: parsed.demandLevel,
    note: parsed.note,
    skillsInDemand:
      parsed.demandLevel === 'sin_datos' ? [] : parsed.skillsInDemand
  }
}

module.exports = {
  getGeneralMarketSummary,
  analyzeProfessionDemand,
  pickNews,
  cleanArticleUrl,
  verifyKeyFigures,
  isNewspaperUrl,
  isRecentDate,
  todayInSpain,
  MARKET_ANALYSIS_VERSION,
  MARKET_DATA_VERSION
}
