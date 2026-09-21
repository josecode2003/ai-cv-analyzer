// @ts-check

const OpenAI = /** @type {any} */ (require('openai'))

const { MARKET_DATA_VERSION } = require('../config/versions')

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

  return sanitizeMarketResult(result)
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
function sanitizeEvidence(evidence) {
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
function sanitizeMarketResult(result) {
  const sanitized = { ...result }

  for (const key of ['situacionActual', 'demand', 'salary']) {
    if (sanitized[key]) {
      sanitized[key] = sanitizeEvidence(/** @type {any} */ (sanitized[key]))
    }
  }

  for (const key of ['trends', 'geographicDistribution']) {
    if (Array.isArray(sanitized[key])) {
      sanitized[key] = /** @type {any[]} */ (sanitized[key]).map(
        sanitizeEvidence
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

module.exports = {
  analyzeMarketForProfile,
  MARKET_ANALYSIS_VERSION,
  MARKET_DATA_VERSION
}
