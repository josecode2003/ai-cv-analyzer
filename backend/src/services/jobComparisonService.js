// @ts-check

/*
 * El SDK de openai publica sus tipos pensados para ESM
 * (export default). Bajo require() en CommonJS el valor
 * en tiempo de ejecución es idéntico, pero TypeScript no
 * puede inferir la firma de constructor automáticamente.
 */

const OpenAI = /** @type {any} */ (require('openai'))

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const comparisonSchema = {
  type: 'object',

  additionalProperties: false,

  properties: {
    compatibilityScore: {
      type: 'integer',
      minimum: 0,
      maximum: 100
    },

    summary: {
      type: 'string'
    },

    matchingSkills: {
      type: 'array',
      items: {
        type: 'string'
      }
    },

    missingSkills: {
      type: 'array',
      items: {
        type: 'string'
      }
    },

    strengths: {
      type: 'array',
      items: {
        type: 'string'
      }
    },

    gaps: {
      type: 'array',
      items: {
        type: 'string'
      }
    },

    keywords: {
      type: 'array',
      items: {
        type: 'string'
      }
    },

    recommendations: {
      type: 'array',
      items: {
        type: 'string'
      }
    }
  },

  required: [
    'compatibilityScore',
    'summary',
    'matchingSkills',
    'missingSkills',
    'strengths',
    'gaps',
    'keywords',
    'recommendations'
  ]
}

/**
 * Compara un análisis de CV ya generado con una oferta de
 * empleo mediante la API de OpenAI.
 *
 * @param {Record<string, unknown>} cvAnalysis
 * @param {string} jobOfferText
 * @param {string} [jobTitle]
 * @returns {Promise<Record<string, unknown> & { compatibilityScore: number }>}
 */
async function compareCVWithJobOffer(cvAnalysis, jobOfferText, jobTitle) {
  if (!cvAnalysis || typeof cvAnalysis !== 'object') {
    throw new Error('CV analysis is required')
  }

  if (!jobOfferText || typeof jobOfferText !== 'string') {
    throw new Error('Job offer text is required')
  }

  if (jobOfferText.trim().length < 50) {
    throw new Error('La oferta de empleo es demasiado corta')
  }

  const response = await client.responses.create({
    model: 'gpt-4.1',

    input: [
      {
        role: 'system',

        content: `
You are an expert recruiter and CV-to-job matching analyst who works with every profession and trade, not only office or technology roles.

Your task is to compare a candidate CV with a job offer. Write every text value in the response in Spanish (Spain), regardless of the language of the CV or job offer.

IMPORTANT RULES:

1. Use only information present in the CV and job offer.
2. Never invent candidate experience.
3. Never invent candidate skills.
4. Never claim a candidate has a skill that is not explicitly supported by the CV.
5. Never claim professional experience that is not present in the CV.
6. Distinguish between:
   - matching skills
   - missing skills
   - candidate strengths
   - candidate gaps
7. A skill should only be considered a match when the CV explicitly supports it.
8. A missing skill means the job offer requests or strongly implies a skill that is not explicitly present in the CV.
9. The compatibility score must represent how well the CV currently matches the job offer.
9b. The compatibility score must be a whole integer between 0 and 100 (for example 70), never a decimal or a 0-1 fraction (never 0.7).
10. Do not inflate the score to be encouraging.
11. Do not unfairly penalize a junior candidate simply for having limited professional experience.
12. Consider:
    - technical skills
    - professional experience
    - education
    - projects
    - certifications
    - responsibilities
    - job requirements
13. Extract relevant keywords from the job offer.
14. Recommendations must be concrete and actionable.
15. Never recommend inventing experience or skills.
16. If a recommendation depends on information the candidate may genuinely have but did not include, state that it should only be added if true.
17. Return only the requested JSON structure.
          `
      },

      {
        role: 'user',

        content: `
Compare the following CV with the job offer.

JOB TITLE:
${jobTitle || ''}

CV:
${JSON.stringify(cvAnalysis)}

JOB OFFER:
${jobOfferText}
          `
      }
    ],

    text: {
      format: {
        type: 'json_schema',

        name: 'job_comparison',

        strict: true,

        schema: comparisonSchema
      }
    }
  })

  const result = JSON.parse(response.output_text)

  result.compatibilityScore = normalizeCompatibilityScore(
    result.compatibilityScore
  )

  return result
}

/*
 * Defensa adicional: aunque el schema exige un integer 0-100,
 * si el modelo alguna vez devuelve una fracción 0-1 (p. ej. 0.7
 * en lugar de 70), la normalizamos en vez de dejar que la
 * columna INTEGER de PostgreSQL rechace el INSERT.
 */

/**
 * @param {unknown} score
 * @returns {number}
 */

function normalizeCompatibilityScore(score) {
  const numericScore =
    typeof score === 'number' && Number.isFinite(score) ? score : 0

  const scaledScore =
    numericScore > 0 && numericScore <= 1 ? numericScore * 100 : numericScore

  return Math.min(100, Math.max(0, Math.round(scaledScore)))
}

module.exports = {
  compareCVWithJobOffer
}
