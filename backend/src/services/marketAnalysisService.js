// @ts-check

const OpenAI = /** @type {any} */ (require('openai'))

const { MARKET_DATA_VERSION } = require('../config/versions')

const { safeFetch } = require('./urlSafetyService')

const { fetchSourceContent } = require('./sourceContentService')

const { verifyClaim } = require('./claimVerificationService')

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const MARKET_ANALYSIS_MODEL = 'gpt-4.1'

const MARKET_ANALYSIS_VERSION = `${MARKET_ANALYSIS_MODEL}-v1`

/*
 * Cada afirmación cuantitativa/factual del informe se modela
 * como una "evidencia": debe declarar su propio nivel de
 * confianza y, cuando corresponda, la fuente y fecha exactas
 * de donde procede. Esto es lo que impide (estructuralmente,
 * no solo mediante instrucciones) que una cifra "inventada"
 * pase como un dato con fuente: si no hay fuente real, el
 * propio schema obliga a declarar 'sin_datos_suficientes'.
 */
const evidenceProperties = {
  confidence: {
    type: 'string',
    enum: ['dato_oficial', 'otra_fuente', 'estimacion', 'sin_datos_suficientes']
  },
  source: { type: 'string' },
  sourceUrl: { type: 'string' },
  dataDate: { type: 'string' }
}

const evidenceRequired = ['confidence', 'source', 'sourceUrl', 'dataDate']

const marketAnalysisSchema = {
  type: 'object',
  additionalProperties: false,

  properties: {
    profileSummary: {
      type: 'object',
      additionalProperties: false,
      properties: {
        occupation: { type: 'string' },
        sector: { type: 'string' },
        region: { type: 'string' }
      },
      required: ['occupation', 'sector', 'region']
    },

    dataSufficiency: {
      type: 'string',
      enum: ['sufficient', 'partial', 'insufficient']
    },

    situacionActual: {
      type: 'object',
      additionalProperties: false,
      properties: {
        summary: { type: 'string' },
        ...evidenceProperties
      },
      required: ['summary', ...evidenceRequired]
    },

    demand: {
      type: 'object',
      additionalProperties: false,
      properties: {
        level: {
          type: 'string',
          enum: ['alta', 'media', 'baja', 'sin_datos_suficientes']
        },
        explanation: { type: 'string' },
        ...evidenceProperties
      },
      required: ['level', 'explanation', ...evidenceRequired]
    },

    salary: {
      type: 'object',
      additionalProperties: false,
      properties: {
        range: { type: 'string' },
        period: {
          type: 'string',
          enum: ['mensual', 'anual', 'sin_datos_suficientes']
        },
        ...evidenceProperties
      },
      required: ['range', 'period', ...evidenceRequired]
    },

    trends: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          statement: { type: 'string' },
          ...evidenceProperties
        },
        required: ['statement', ...evidenceRequired]
      }
    },

    sectorsHiring: {
      type: 'array',
      items: { type: 'string' }
    },

    relatedRoles: {
      type: 'array',
      items: { type: 'string' }
    },

    skillsInDemand: {
      type: 'array',
      items: { type: 'string' }
    },

    geographicDistribution: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          region: { type: 'string' },
          note: { type: 'string' },
          ...evidenceProperties
        },
        required: ['region', 'note', ...evidenceRequired]
      }
    },

    recommendations: {
      type: 'array',
      items: { type: 'string' }
    },

    sourcesUsed: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
          publisher: { type: 'string' },
          date: { type: 'string' }
        },
        required: ['title', 'url', 'publisher', 'date']
      }
    }
  },

  required: [
    'profileSummary',
    'dataSufficiency',
    'situacionActual',
    'demand',
    'salary',
    'trends',
    'sectorsHiring',
    'relatedRoles',
    'skillsInDemand',
    'geographicDistribution',
    'recommendations',
    'sourcesUsed'
  ]
}

const SYSTEM_PROMPT = `
You are a Spanish (España) labor-market research analyst. You produce a grounded, source-cited report about the CURRENT job market in Spain for a specific professional profile.

You have a "web_search" tool. You MUST use it to look for current, verifiable information before answering. Prioritize official and recognized sources: SEPE, INE, Ministerio de Trabajo y Economía Social, Seguridad Social, EURES, Eurostat, observatorios de empleo autonómicos, and reputable labor-market reports (e.g. Randstad Research, Adecco, InfoJobs-Esade, EPData). You may also use other reputable sources when official ones do not cover a specific data point, but always record exactly where each fact came from.

CRITICAL — DATA INTEGRITY (this is the most important part of your job):

1. NEVER state a number, statistic, salary figure, percentage, trend or demand level as if it were a fact unless you found it via web_search in an actual retrieved source. Your own background knowledge is NOT a valid source for this report.
2. Every factual field has a "confidence" value you must set honestly:
   - "dato_oficial": found in an official statistical/government source, with a real URL and a real date.
   - "otra_fuente": found in another reputable, identifiable source, with a real URL and a real date.
   - "estimacion": you are inferring/extrapolating from data that does not directly answer the question (e.g. general sector trends applied to a narrower occupation). Say so explicitly in the text.
   - "sin_datos_suficientes": you could not find anything reliable. In this case leave "source", "sourceUrl" and "dataDate" as empty strings, and write in the explanation/summary/statement field literally: "No hay datos suficientes para estimar este indicador." Do not guess a number just to fill the field.
3. NEVER invent a URL, publication name or date. If you are not certain a source real and retrievable, treat it as if you had not found it.
4. Distinguish clearly, in the wording of every text field, between an official data point, information from another source, your own interpretation, and an estimation. Never present an interpretation or estimation as if it were an official statistic.
5. Do not present old/historical data as if it were current: always state the date of the data you cite, and if a source is old, say so.
6. sectorsHiring / relatedRoles / skillsInDemand / recommendations are your interpretive synthesis of what you found — keep them grounded in the sources you actually retrieved and consistent with the rest of the report; do not invent employers, specific job counts or specific companies.
7. Recommendations must be concrete and actionable, tied to the demand/trends/skills you actually found for this profile in Spain — never generic filler like "sigue formándote".
8. dataSufficiency: "sufficient" if you found solid current data for most indicators, "partial" if only some, "insufficient" if you found almost nothing reliable for this specific profile/region.
9. sourcesUsed must list every distinct source you actually cited elsewhere in the report (real title, real URL, real publisher, real date), deduplicated. Empty array if you found nothing usable.

LANGUAGE: Write every text value in Spanish (Spain).

Return ONLY the JSON structure requested by the schema.
`

/**
 * @param {{ occupation: string, sector: string, subsector: string, seniority: string, region: string, location: string, keySkills: string[] }} profile
 * @returns {Promise<Record<string, unknown>>}
 */
async function analyzeMarketForProfile(profile) {
  const userContent = `
Research the current Spanish (España) labor market for this professional profile, extracted from a candidate's CV:

Occupation: ${profile.occupation || 'No determinada'}
Sector: ${profile.sector || 'No determinado'}
Subsector: ${profile.subsector || 'No determinado'}
Seniority: ${profile.seniority || 'No determinada'}
Location stated in the CV: ${profile.location || 'No indicada'}
Region (comunidad autónoma) if identifiable: ${profile.region || 'No indicada — usa España como ámbito general'}
Key skills: ${(profile.keySkills || []).join(', ') || 'No indicadas'}

Use web_search to find current, verifiable data about demand, salary ranges, trends, hiring sectors, related roles, in-demand skills and geographic distribution relevant to this exact profile in Spain. If you cannot find reliable data for a specific indicator, say so explicitly instead of guessing.
  `

  const response = await client.responses.create(
    {
      model: MARKET_ANALYSIS_MODEL,

      temperature: 0,

      tools: [
        {
          type: 'web_search',
          search_context_size: 'medium',
          user_location: {
            type: 'approximate',
            country: 'ES'
          }
        }
      ],

      input: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ],

      text: {
        format: {
          type: 'json_schema',
          name: 'market_analysis',
          strict: true,
          schema: marketAnalysisSchema
        }
      }
    },
    {
      /*
       * La búsqueda web puede tardar más que una llamada normal
       * a la API. Un timeout explícito evita que una fuente
       * externa lenta o colgada bloquee indefinidamente la
       * petición HTTP del usuario (ver marketRoutes.js, que ya
       * captura cualquier error de esta llamada y responde con
       * "no disponible" en vez de dejar la petición colgada).
       */
      timeout: 45000
    }
  )

  const result = JSON.parse(response.output_text)

  const formatSanitized = sanitizeMarketResultFormat(result)

  const urlVerified = await verifyMarketResultSources(formatSanitized)

  return verifyClaimsAgainstContent(urlVerified)
}

/*
 * Defensa adicional contra alucinaciones de formato: si el
 * modelo marca un dato como respaldado por una fuente
 * ("dato_oficial" / "otra_fuente") pero la URL no tiene una
 * forma mínimamente válida, no confiamos en la cita y
 * degradamos el dato a estimación sin fuente, en vez de
 * mostrar al usuario un enlace que probablemente no existe.
 */

const URL_PATTERN = /^https?:\/\/[^\s]+\.[^\s]+$/i

/**
 * @param {Record<string, unknown>} evidence
 * @returns {Record<string, unknown>}
 */
function sanitizeEvidenceFormat(evidence) {
  if (!evidence || typeof evidence !== 'object') {
    return evidence
  }

  const hasCitedSource =
    evidence.confidence === 'dato_oficial' ||
    evidence.confidence === 'otra_fuente'

  const urlLooksValid =
    typeof evidence.sourceUrl === 'string' &&
    URL_PATTERN.test(evidence.sourceUrl)

  if (hasCitedSource && !urlLooksValid) {
    return {
      ...evidence,
      confidence: 'estimacion',
      source: '',
      sourceUrl: '',
      dataDate: ''
    }
  }

  return evidence
}

/**
 * @param {Record<string, unknown>} result
 * @returns {Record<string, unknown>}
 */
function sanitizeMarketResultFormat(result) {
  const sanitized = { ...result }

  for (const key of ['situacionActual', 'demand', 'salary']) {
    if (sanitized[key]) {
      sanitized[key] = sanitizeEvidenceFormat(
        /** @type {any} */ (sanitized[key])
      )
    }
  }

  for (const key of ['trends', 'geographicDistribution']) {
    if (Array.isArray(sanitized[key])) {
      sanitized[key] = /** @type {any[]} */ (sanitized[key]).map(
        sanitizeEvidenceFormat
      )
    }
  }

  if (Array.isArray(sanitized.sourcesUsed)) {
    sanitized.sourcesUsed = /** @type {any[]} */ (sanitized.sourcesUsed).filter(
      item => typeof item?.url === 'string' && URL_PATTERN.test(item.url)
    )
  }

  return sanitized
}

/*
 * Defensa contra alucinaciones de CONTENIDO, no solo de
 * formato: el modelo puede citar una URL con forma
 * perfectamente válida, en un dominio real, que simplemente
 * no existe (comprobado en producción: una URL de udit.es con
 * forma válida que la propia web redirige a su página de
 * error 404). Antes de devolver el resultado, comprobamos en
 * vivo que cada URL citada con confianza alta responde
 * realmente.
 *
 * Solo degradamos ante evidencia clara de que la página no
 * existe (404/410 tras seguir redirecciones). Un error de red,
 * un timeout o un 401/403/429 (bloqueo de bots, límite de
 * peticiones) son ambiguos -no prueban que la fuente sea
 * falsa- así que en esos casos mantenemos la cita del modelo:
 * preferimos no castigar una fuente real que un sitio bloquea
 * a bots.
 */

const URL_VERIFY_TIMEOUT_MS = 4000

/**
 * @param {string} url
 * @returns {Promise<boolean>} false si se confirma que la página no existe (404/410) o si la URL (o alguna redirección) no es segura (SSRF).
 */
async function verifyUrlReachable(url) {
  try {
    const headResponse = await safeFetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(URL_VERIFY_TIMEOUT_MS)
    })

    /*
     * safeFetch devuelve null cuando la URL (o alguna redirección
     * intermedia) apunta a infraestructura interna. Una URL así
     * nunca es una fuente legítima, así que se trata igual que un
     * 404: no confiable.
     */
    if (!headResponse) {
      return false
    }

    if (headResponse.status === 404 || headResponse.status === 410) {
      return false
    }

    if (headResponse.status !== 405) {
      return true
    }

    /*
     * Algunos servidores no aceptan HEAD (405); reintentamos
     * con GET antes de concluir nada.
     */
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
 * Recorre todos los campos de tipo "evidencia" del resultado
 * (situacionActual/demand/salary son objetos únicos;
 * trends/geographicDistribution son arrays) y devuelve una lista
 * plana de referencias editables `{ container, key, evidence }`,
 * para no duplicar este recorrido en cada paso de verificación.
 *
 * @param {Record<string, unknown>} result
 * @param {(evidence: any) => boolean} [predicate]
 * @returns {{ container: any, key: string | number, field: string, evidence: any }[]}
 */
function collectEvidenceEntries(result, predicate = () => true) {
  const entries = []

  for (const key of ['situacionActual', 'demand', 'salary']) {
    const evidence = /** @type {any} */ (result[key])
    if (evidence && predicate(evidence)) {
      entries.push({ container: result, key, field: key, evidence })
    }
  }

  for (const field of ['trends', 'geographicDistribution']) {
    if (Array.isArray(result[field])) {
      ;/** @type {any[]} */ (result[field]).forEach((evidence, index) => {
        if (predicate(evidence)) {
          entries.push({
            container: result[field],
            key: index,
            field,
            evidence
          })
        }
      })
    }
  }

  return entries
}

/**
 * Texto en lenguaje natural de lo que esa evidencia concreta
 * afirma, usado como "CLAIM" para el verificador de contenido.
 *
 * @param {string} field
 * @param {any} evidence
 * @returns {string}
 */
function extractClaimText(field, evidence) {
  switch (field) {
    case 'situacionActual':
      return evidence.summary || ''
    case 'demand':
      return `Demanda: ${evidence.level || ''}. ${evidence.explanation || ''}`
    case 'salary':
      return `Salario: ${evidence.range || ''} (${evidence.period || ''})`
    case 'trends':
      return evidence.statement || ''
    case 'geographicDistribution':
      return `${evidence.region || ''}: ${evidence.note || ''}`
    default:
      return ''
  }
}

const NO_DATA_TEXT = 'No hay datos suficientes para verificar una cifra fiable.'

/**
 * Cuando el contenido de una fuente CONTRADICE o no respalda en
 * absoluto una afirmación (verdict 'unsupported'), el texto
 * original ("22.000 € - 32.000 €") no debe seguir mostrándose
 * como si fuera un dato de mercado confirmado: se sustituye por
 * un mensaje explícito de "no verificado" en el mismo campo que
 * la interfaz ya muestra al usuario. El valor original se
 * conserva únicamente en `verification.originalClaim`, para
 * depuración/auditoría, nunca como dato presentado.
 *
 * @param {string} field
 * @returns {Record<string, unknown>}
 */
function scrubClaimText(field) {
  switch (field) {
    case 'situacionActual':
      return { summary: NO_DATA_TEXT }
    case 'demand':
      return { level: 'sin_datos_suficientes', explanation: NO_DATA_TEXT }
    case 'salary':
      return { range: NO_DATA_TEXT, period: 'sin_datos_suficientes' }
    case 'trends':
      return { statement: NO_DATA_TEXT }
    case 'geographicDistribution':
      return { note: NO_DATA_TEXT }
    default:
      return {}
  }
}

/**
 * @param {Record<string, unknown>} result
 * @returns {Promise<Record<string, unknown>>}
 */
async function verifyMarketResultSources(result) {
  const verified = { ...result }

  const citedEvidenceEntries = collectEvidenceEntries(verified, isCitedEvidence)

  const urlsToVerify = new Set(
    citedEvidenceEntries.map(entry => entry.evidence.sourceUrl)
  )

  if (Array.isArray(verified.sourcesUsed)) {
    for (const source of /** @type {any[]} */ (verified.sourcesUsed)) {
      if (typeof source?.url === 'string') {
        urlsToVerify.add(source.url)
      }
    }
  }

  const brokenUrls = new Set()

  await Promise.all(
    Array.from(urlsToVerify).map(async url => {
      const reachable = await verifyUrlReachable(url)
      if (!reachable) {
        brokenUrls.add(url)
      }
    })
  )

  if (brokenUrls.size === 0) {
    return verified
  }

  for (const { container, key, evidence } of citedEvidenceEntries) {
    if (brokenUrls.has(evidence.sourceUrl)) {
      container[key] = {
        ...evidence,
        confidence: 'estimacion',
        source: '',
        sourceUrl: '',
        dataDate: ''
      }
    }
  }

  if (Array.isArray(verified.sourcesUsed)) {
    verified.sourcesUsed = /** @type {any[]} */ (verified.sourcesUsed).filter(
      source => !brokenUrls.has(source.url)
    )
  }

  return verified
}

/**
 * @param {any} evidence
 * @returns {boolean}
 */
function isCitedEvidence(evidence) {
  return (
    evidence &&
    typeof evidence === 'object' &&
    (evidence.confidence === 'dato_oficial' ||
      evidence.confidence === 'otra_fuente') &&
    typeof evidence.sourceUrl === 'string' &&
    evidence.sourceUrl.length > 0
  )
}

/*
 * TERCERA capa de defensa, la más profunda: la segunda capa
 * (verifyMarketResultSources) solo confirma que la URL EXISTE
 * (categoría A). Que una página exista no significa que respalde
 * el dato concreto que se le atribuye (categorías B/C) — es
 * exactamente el caso real que motivó este módulo: una URL real,
 * con HTTP 200, que no contenía la cifra de salario citada.
 *
 * Para cada evidencia que sigue citada con confianza alta tras la
 * capa anterior:
 *
 *   1. Se descarga su contenido de forma segura y acotada
 *      (sourceContentService — reutiliza el mismo safeFetch, así
 *      que la protección SSRF también aplica aquí).
 *   2. Si no se puede leer el contenido (bloqueado, JS-only,
 *      timeout, PDF no procesable...), NO se afirma que el dato
 *      esté respaldado, pero tampoco se trata la URL como falsa:
 *      se baja un escalón de confianza mantendiendo la fuente.
 *   3. Si se lee el contenido, se comprueba si respalda realmente
 *      la afirmación (claimVerificationService): coincidencia
 *      numérica determinista primero, verificador LLM acotado
 *      solo si hace falta.
 *
 * Cada evidencia termina con un campo `verification` que separa
 * explícitamente las tres capas (urlValid / contentRetrieved /
 * claimSupported), tal y como pide la auditoría: nunca se
 * presenta "la URL existe" como si fuera "el dato está
 * verificado".
 */

/**
 * @param {Record<string, unknown>} result
 * @returns {Promise<Record<string, unknown>>}
 */
async function verifyClaimsAgainstContent(result) {
  const verified = { ...result }

  const allEntries = collectEvidenceEntries(verified)

  // Toda evidencia (incluida la que ya es sin_datos_suficientes o
  // estimación sin fuente) recibe un objeto `verification`
  // consistente, para que el frontend/los tests nunca tengan que
  // distinguir "no tiene el campo" de "no aplica".
  for (const { container, key, evidence } of allEntries) {
    container[key] = {
      ...evidence,
      verification: {
        urlValid: false,
        contentRetrieved: false,
        claimSupported: null
      }
    }
  }

  const citedEntries = collectEvidenceEntries(verified, isCitedEvidence)

  if (citedEntries.length === 0) {
    /*
     * Nada que descargar/verificar, pero dataSufficiency debe
     * recalcularse igualmente: si el modelo no citó ninguna
     * fuente con confianza alta para ningún campo, el estado
     * final casi nunca puede ser "sufficient" aunque el propio
     * modelo lo propusiera.
     */
    verified.dataSufficiency = computeDataSufficiency(verified)
    return verified
  }

  const uniqueUrls = Array.from(
    new Set(citedEntries.map(entry => entry.evidence.sourceUrl))
  )

  const contentByUrl = new Map()

  await Promise.all(
    uniqueUrls.map(async url => {
      contentByUrl.set(url, await fetchSourceContent(url))
    })
  )

  await Promise.all(
    citedEntries.map(async ({ container, key, field, evidence }) => {
      const content = contentByUrl.get(evidence.sourceUrl)

      if (!content.ok) {
        // URL válida, contenido no verificable: no se afirma que
        // el dato esté respaldado, pero tampoco se borra la
        // fuente (no hay evidencia de que sea falsa).
        container[key] = {
          ...evidence,
          confidence: 'estimacion',
          verification: {
            urlValid: true,
            contentRetrieved: false,
            claimSupported: null
          }
        }
        return
      }

      const claimText = extractClaimText(field, evidence)
      const verdict = await verifyClaim(claimText, content.text)

      if (verdict === 'supported') {
        container[key] = {
          ...evidence,
          verification: {
            urlValid: true,
            contentRetrieved: true,
            claimSupported: true
          }
        }
        return
      }

      if (verdict === 'unsupported') {
        // El contenido existe y contradice o no contiene la cifra
        // citada: es la alucinación de contenido que esta capa
        // existe para atrapar. El texto presentado se sustituye
        // por un mensaje explícito de "no verificado" (nunca se
        // muestra la cifra original como dato confirmado); el
        // valor original queda solo en verification.originalClaim
        // para depuración.
        container[key] = {
          ...evidence,
          ...scrubClaimText(field),
          confidence: 'sin_datos_suficientes',
          source: '',
          sourceUrl: '',
          dataDate: '',
          verification: {
            urlValid: true,
            contentRetrieved: true,
            claimSupported: false,
            originalClaim: claimText
          }
        }
        return
      }

      // insufficient_evidence: el contenido toca el tema pero no
      // permite confirmar la cifra exacta — se trata como
      // inferencia, no como dato verificado, pero se conserva la
      // fuente porque sigue siendo contexto relevante real.
      container[key] = {
        ...evidence,
        confidence: 'estimacion',
        verification: {
          urlValid: true,
          contentRetrieved: true,
          claimSupported: false
        }
      }
    })
  )

  verified.dataSufficiency = computeDataSufficiency(verified)

  return verified
}

/*
 * `dataSufficiency` lo propone inicialmente el modelo, ANTES de
 * que exista ninguna verificación real de URL/contenido — es
 * solo su propia impresión de cómo de bien le ha ido la
 * búsqueda. No puede ser la última palabra: si, tras verificar,
 * la mayoría de los campos principales han quedado en estimación
 * o sin datos, el informe NO puede seguir diciendo "sufficient".
 *
 * Se recalcula de forma determinista a partir del estado FINAL
 * (post-verificación) de los tres campos principales del informe
 * (situación actual, demanda, salario), que son los que la
 * interfaz muestra de forma más prominente.
 */

/**
 * @param {any} evidence
 * @returns {'backed' | 'estimate' | 'none'}
 */
function classifyEvidenceState(evidence) {
  if (!evidence || typeof evidence !== 'object') {
    return 'none'
  }

  if (
    evidence.confidence === 'dato_oficial' ||
    evidence.confidence === 'otra_fuente'
  ) {
    return 'backed'
  }

  if (evidence.confidence === 'estimacion') {
    return 'estimate'
  }

  return 'none'
}

const DATA_SUFFICIENCY_CORE_FIELDS = ['situacionActual', 'demand', 'salary']

/**
 * @param {Record<string, unknown>} result
 * @returns {'sufficient' | 'partial' | 'insufficient'}
 */
function computeDataSufficiency(result) {
  const states = DATA_SUFFICIENCY_CORE_FIELDS.map(field =>
    classifyEvidenceState(/** @type {any} */ (result[field]))
  )

  const backedCount = states.filter(state => state === 'backed').length
  const noneCount = states.filter(state => state === 'none').length

  if (noneCount === states.length) {
    return 'insufficient'
  }

  if (backedCount >= 2) {
    return 'sufficient'
  }

  return 'partial'
}

module.exports = {
  analyzeMarketForProfile,
  verifyMarketResultSources,
  verifyClaimsAgainstContent,
  sanitizeMarketResultFormat,
  computeDataSufficiency,
  MARKET_ANALYSIS_VERSION,
  MARKET_DATA_VERSION
}
