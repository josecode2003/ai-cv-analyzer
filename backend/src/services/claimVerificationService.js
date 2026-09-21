// @ts-check

const OpenAI = /** @type {any} */ (require('openai'))

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const CLAIM_VERIFIER_MODEL = 'gpt-4.1'
const CLAIM_VERIFIER_TIMEOUT_MS = 15000

/*
 * "¿El contenido de la fuente respalda realmente el dato
 * afirmado?" se decide en dos pasos, priorizando el más barato:
 *
 * 1. Comprobación determinista de números (rápida, gratis,
 *    perfectamente reproducible): si la afirmación es numérica
 *    (salario, porcentaje, cifra concreta) y todos sus números
 *    aparecen en el contenido (en formato europeo o anglosajón),
 *    se acepta sin necesidad de IA.
 *
 * 2. Si el paso 1 no da un veredicto claro (afirmación no
 *    numérica, o números que no aparecen claramente en el
 *    contenido), se recurre a una segunda llamada a OpenAI,
 *    estrictamente acotada al texto recuperado: NO puede usar
 *    conocimiento externo, solo debe juzgar si ESE contenido
 *    respalda ESA afirmación.
 */

/**
 * Extrae números de un texto junto con su posición, normalizando
 * separadores de miles (formato europeo "36.800" o anglosajón
 * "36,800") y decimales, para poder comparar cifras entre la
 * afirmación y el contenido sin exigir coincidencia textual
 * exacta. La posición permite después comprobar el CONTEXTO en el
 * que aparece cada número (ver isContextCompatible).
 *
 * @param {string} text
 * @returns {{ value: number, index: number }[]}
 */
function extractNumberOccurrences(text) {
  if (!text) {
    return []
  }

  const occurrences = []
  const regex = /\d[\d.,]*\d|\d/g
  let match

  while ((match = regex.exec(text)) !== null) {
    const value = normalizeNumberToken(match[0])

    if (value !== null && Number.isFinite(value)) {
      occurrences.push({ value, index: match.index })
    }
  }

  return occurrences
}

/**
 * @param {string} text
 * @returns {number[]}
 */
function extractNumbers(text) {
  return extractNumberOccurrences(text).map(occurrence => occurrence.value)
}

/**
 * @param {string} token
 * @returns {number | null}
 */
function normalizeNumberToken(token) {
  let cleaned = token.replace(/[^\d.,]/g, '')

  if (!cleaned) {
    return null
  }

  // Separadores de miles: un punto o coma seguido de exactamente
  // 3 dígitos y luego fin de token u otro separador.
  cleaned = cleaned.replace(/([.,])(?=\d{3}(?:[.,]|$))/g, '')

  // El separador que quede (si queda) es decimal.
  cleaned = cleaned.replace(',', '.')

  const value = Number.parseFloat(cleaned)

  return Number.isFinite(value) ? value : null
}

/**
 * @param {number} a
 * @param {number} b
 * @returns {boolean}
 */
function numbersEquivalent(a, b) {
  const tolerance = Math.max(1, Math.abs(a) * 0.005)
  return Math.abs(a - b) <= tolerance
}

/*
 * Que un número aparezca en la página no significa que aparezca
 * en el CONTEXTO correcto: una página puede listar "Junior:
 * 22.000 €" y "Senior: 45.000 €" en la misma tabla, y una
 * afirmación sobre "Senior" no debe darse por respaldada solo
 * porque 22.000 aparece en algún punto del texto.
 *
 * Estrategia deliberadamente ligera (sin NLP): grupos de palabras
 * clave mutuamente excluyentes (senioridad, ubicación). Si la
 * afirmación menciona un término de un grupo, el número solo se
 * considera respaldado cuando aparece en una zona del contenido
 * que NO menciona un término distinto del MISMO grupo. Si la
 * afirmación no menciona ningún término de ese grupo, no se
 * exige nada sobre él (no todo dato tiene por qué especificar
 * senioridad o ubicación).
 */

const CONTEXT_GROUP_SETS = [
  // Senioridad
  [
    ['junior', 'trainee', 'becari', 'practica'],
    ['senior', 'sénior'],
    ['mid-level', 'semi-senior', 'semi senior', 'intermedio']
  ],
  // Ubicación (comunidades/ciudades habituales en las fuentes usadas)
  [
    ['madrid'],
    ['barcelona', 'cataluña', 'catalunya'],
    ['valencia', 'comunitat valenciana', 'comunidad valenciana'],
    ['andalucía', 'sevilla', 'málaga'],
    ['país vasco', 'euskadi', 'bilbao'],
    ['galicia'],
    ['canarias'],
    ['baleares']
  ]
]

/**
 * @param {string} text
 * @param {string[][]} groupSet
 * @returns {number} índice del grupo detectado (el primero que aparece en el texto), o -1 si ninguno.
 */
function findGroupIndex(text, groupSet) {
  const lower = text.toLowerCase()

  for (let i = 0; i < groupSet.length; i++) {
    if (groupSet[i].some(term => lower.includes(term))) {
      return i
    }
  }

  return -1
}

const CONTEXT_WINDOW_CHARS = 80

/**
 * A diferencia de "¿aparece algún término del grupo en la
 * ventana?", busca la etiqueta de contexto MÁS CERCANA a esa
 * posición del texto. Es necesario porque una tabla compacta
 * como "Junior: 22.000 €. Senior: 55.000 €." puede tener ambas
 * etiquetas dentro de la misma ventana de una sola cifra: lo que
 * importa es a cuál de las dos está pegado el número, no si
 * ambas aparecen en algún punto cercano.
 *
 * @param {string} text
 * @param {number} position
 * @param {string[][]} groupSet
 * @returns {number} índice del grupo más cercano, o -1 si no hay ninguno dentro de la ventana.
 */
function findNearestGroupIndex(text, position, groupSet) {
  const windowStart = Math.max(0, position - CONTEXT_WINDOW_CHARS)
  const windowEnd = Math.min(text.length, position + CONTEXT_WINDOW_CHARS)
  const lowerText = text.toLowerCase()

  let bestGroup = -1
  let bestDistance = Infinity

  for (let groupIndex = 0; groupIndex < groupSet.length; groupIndex++) {
    for (const term of groupSet[groupIndex]) {
      let searchFrom = windowStart

      for (;;) {
        const foundAt = lowerText.indexOf(term, searchFrom)

        if (foundAt === -1 || foundAt >= windowEnd) {
          break
        }

        const distance = Math.abs(foundAt - position)

        if (distance < bestDistance) {
          bestDistance = distance
          bestGroup = groupIndex
        }

        searchFrom = foundAt + term.length
      }
    }
  }

  return bestGroup
}

/**
 * @param {string} claimText
 * @param {string} contentText
 * @param {number} position posición del número dentro de contentText.
 * @returns {boolean}
 */
function isContextCompatible(claimText, contentText, position) {
  return CONTEXT_GROUP_SETS.every(groupSet => {
    const claimGroup = findGroupIndex(claimText, groupSet)

    if (claimGroup === -1) {
      // La afirmación no especifica este tipo de contexto
      // (p. ej. no menciona senioridad ni ubicación): no hay
      // nada que contrastar para este grupo.
      return true
    }

    const nearestContentGroup = findNearestGroupIndex(
      contentText,
      position,
      groupSet
    )

    return nearestContentGroup === -1 || nearestContentGroup === claimGroup
  })
}

/**
 * Intento determinista de verificar una afirmación numérica.
 *
 * @param {string} claimText
 * @param {string} contentText
 * @returns {'supported' | null} null cuando el chequeo determinista no es aplicable o el resultado es ambiguo (afirmación no numérica, número ausente, o número presente solo en un contexto incompatible) — en ese caso decide el verificador LLM.
 */
function deterministicNumberCheck(claimText, contentText) {
  const claimNumberOccurrences = extractNumberOccurrences(claimText)

  if (claimNumberOccurrences.length === 0) {
    return null
  }

  const contentOccurrences = extractNumberOccurrences(contentText)

  const allFound = claimNumberOccurrences.every(({ value: claimValue }) => {
    const matches = contentOccurrences.filter(({ value }) =>
      numbersEquivalent(claimValue, value)
    )

    if (matches.length === 0) {
      return false
    }

    return matches.some(({ index }) =>
      isContextCompatible(claimText, contentText, index)
    )
  })

  return allFound ? 'supported' : null
}

const claimVerificationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: {
      type: 'string',
      enum: ['supported', 'unsupported', 'insufficient_evidence']
    },
    explanation: { type: 'string' }
  },
  required: ['verdict', 'explanation']
}

const CLAIM_VERIFIER_SYSTEM_PROMPT = `
You are a strict fact-checker. You are given a CLAIM and the CONTENT of a web page.

Decide whether the CONTENT provides evidence for the CLAIM. Use ONLY the given CONTENT — you have no other knowledge for this task, and must not use any background knowledge about the topic. Never assume something is true because it sounds plausible; only judge based on what is literally present in CONTENT.

- "supported": CONTENT contains information (numbers, explicit statements) that directly backs the CLAIM.
- "unsupported": CONTENT is about a related topic but contradicts the CLAIM, or clearly lacks the specific information the CLAIM depends on.
- "insufficient_evidence": CONTENT does not contain enough relevant information to judge either way.

Respond only with the requested JSON.
`

/**
 * @param {string} claimText
 * @param {string} contentText
 * @returns {Promise<'supported' | 'unsupported' | 'insufficient_evidence'>}
 */
async function verifyClaimWithModel(claimText, contentText) {
  const response = await client.responses.create(
    {
      model: CLAIM_VERIFIER_MODEL,

      temperature: 0,

      input: [
        { role: 'system', content: CLAIM_VERIFIER_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `CLAIM:\n${claimText}\n\nCONTENT:\n${contentText}`
        }
      ],

      text: {
        format: {
          type: 'json_schema',
          name: 'claim_verification',
          strict: true,
          schema: claimVerificationSchema
        }
      }
    },
    { timeout: CLAIM_VERIFIER_TIMEOUT_MS }
  )

  const result = JSON.parse(response.output_text)

  return result.verdict
}

/**
 * Punto de entrada único: decide si `contentText` respalda
 * `claimText`, usando primero la comprobación determinista y
 * recurriendo al modelo solo cuando hace falta.
 *
 * @param {string} claimText
 * @param {string} contentText
 * @returns {Promise<'supported' | 'unsupported' | 'insufficient_evidence'>}
 */
async function verifyClaim(claimText, contentText) {
  if (!contentText || !contentText.trim()) {
    return 'insufficient_evidence'
  }

  const deterministic = deterministicNumberCheck(claimText, contentText)

  if (deterministic === 'supported') {
    return 'supported'
  }

  try {
    return await verifyClaimWithModel(claimText, contentText)
  } catch {
    /*
     * Si el verificador falla (timeout, error de API), no
     * podemos confirmar el dato: es más seguro tratarlo como
     * evidencia insuficiente que como respaldado.
     */
    return 'insufficient_evidence'
  }
}

module.exports = {
  verifyClaim,
  deterministicNumberCheck,
  extractNumbers,
  normalizeNumberToken
}
