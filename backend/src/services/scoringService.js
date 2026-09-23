// @ts-check

/*
 * Puntuación determinista del CV.
 *
 * El modelo NO decide ninguna nota. Solo dictamina, criterio a
 * criterio, si el CV cumple (met), cumple a medias (partial) o no
 * cumple (missing), aportando una cita literal del CV como prueba.
 * A partir de ahí la nota se calcula aquí, siempre con la misma
 * fórmula: dos CVs con los mismos dictámenes obtienen la misma nota,
 * y un CV de electricista se mide con los mismos criterios que
 * cualquier otro electricista (ver rubricService).
 */

/** @typedef {'experience' | 'skills' | 'education' | 'certifications' | 'presentation'} Category */
/** @typedef {'met' | 'partial' | 'missing'} CriterionStatus */

/**
 * @typedef {object} Criterion
 * @property {string} id
 * @property {Category} category
 * @property {string} label
 * @property {1 | 2 | 3} weight 1 = complemento, 2 = importante, 3 = esencial
 * @property {boolean} mandatory requisito obligatorio para ejercer la profesión en España
 * @property {boolean} evidenceRequired si el dictamen debe apoyarse en una cita literal del CV
 */

/**
 * @typedef {object} CriterionAssessment
 * @property {string} id
 * @property {string} status
 * @property {string} evidence
 * @property {string} note
 */

const CATEGORIES = /** @type {Category[]} */ ([
  'experience',
  'skills',
  'education',
  'certifications',
  'presentation'
])

const CATEGORY_WEIGHTS = {
  experience: 0.3,
  skills: 0.25,
  education: 0.15,
  certifications: 0.15,
  presentation: 0.15
}

const STATUS_FACTOR = {
  met: 1,
  partial: 0.5,
  missing: 0
}

/*
 * Topes por requisitos obligatorios. Sin el carné, título o
 * colegiación que la ley exige para ejercer, el CV no puede ser
 * competitivo por muy bien escrito que esté: la nota global se
 * limita, y también la de la categoría donde falta el requisito.
 */
const MANDATORY_MISSING_CATEGORY_CAP = 40
const MANDATORY_MISSING_OVERALL_CAP = 55
const MANDATORY_PARTIAL_OVERALL_CAP = 70

/*
 * Fragmentos más cortos que esto (p. ej. "B1") no prueban nada
 * por sí solos: coincidirían casi con cualquier texto.
 */
const MIN_EVIDENCE_FRAGMENT_CHARS = 4

const UNVERIFIED_EVIDENCE_NOTE =
  'La cita aportada no aparece literalmente en el CV, así que no se da por probada.'

const MISSING_ASSESSMENT_NOTE = 'No se ha podido evaluar este criterio.'

/**
 * Reduce un texto a letras y dígitos sin acentos, en minúsculas.
 * Hace la comparación inmune a espacios, saltos de línea,
 * puntuación y ligaduras que introduce la extracción del PDF.
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeForMatch(text) {
  return (text || '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]/g, '')
}

/**
 * Comprueba que la cita aportada por el modelo existe de verdad en
 * el CV. Admite varios fragmentos separados por "…" o "...".
 *
 * @param {string} evidence
 * @param {string} normalizedCV resultado de normalizeForMatch sobre el CV
 * @returns {boolean}
 */
function isEvidenceInCV(evidence, normalizedCV) {
  const fragments = (evidence || '')
    .split(/…|\.\.\./)
    .map(normalizeForMatch)
    .filter(fragment => fragment.length > 0)

  if (fragments.length === 0) {
    return false
  }

  if (fragments.every(f => f.length < MIN_EVIDENCE_FRAGMENT_CHARS)) {
    return false
  }

  return fragments.every(fragment => normalizedCV.includes(fragment))
}

/**
 * @param {string} status
 * @returns {CriterionStatus}
 */
function normalizeStatus(status) {
  return status === 'met' || status === 'partial' ? status : 'missing'
}

/**
 * @param {CriterionStatus} status
 * @returns {CriterionStatus}
 */
function downgrade(status) {
  return status === 'met' ? 'partial' : 'missing'
}

/**
 * @param {string} note
 * @param {string} extra
 * @returns {string}
 */
function appendNote(note, extra) {
  return note ? `${note} ${extra}` : extra
}

/**
 * Cruza los criterios con los dictámenes del modelo, aplicando la
 * verificación de citas: un "cumple" cuya cita no aparece en el CV
 * baja un escalón. Un criterio sin dictamen cuenta como no cumplido.
 *
 * @param {Criterion[]} criteria
 * @param {CriterionAssessment[]} assessments
 * @param {string} cvText
 */
function resolveCriteria(criteria, assessments, cvText) {
  const normalizedCV = normalizeForMatch(cvText)

  const assessmentById = new Map(
    (assessments || []).map(assessment => [assessment.id, assessment])
  )

  return criteria.map(criterion => {
    const assessment = assessmentById.get(criterion.id)

    if (!assessment) {
      return {
        ...criterion,
        status: /** @type {CriterionStatus} */ ('missing'),
        evidence: '',
        note: MISSING_ASSESSMENT_NOTE
      }
    }

    let status = normalizeStatus(assessment.status)
    let evidence = (assessment.evidence || '').trim()
    let note = (assessment.note || '').trim()

    if (
      status !== 'missing' &&
      criterion.evidenceRequired &&
      !isEvidenceInCV(evidence, normalizedCV)
    ) {
      status = downgrade(status)
      evidence = ''
      note = appendNote(note, UNVERIFIED_EVIDENCE_NOTE)
    }

    return { ...criterion, status, evidence, note }
  })
}

/**
 * @param {ReturnType<typeof resolveCriteria>} resolved
 * @param {Category} category
 * @returns {number}
 */
function rawCategoryScore(resolved, category) {
  const inCategory = resolved.filter(c => c.category === category)

  const totalWeight = inCategory.reduce((sum, c) => sum + c.weight, 0)

  if (totalWeight === 0) {
    return 0
  }

  const earned = inCategory.reduce(
    (sum, c) => sum + c.weight * STATUS_FACTOR[c.status],
    0
  )

  return Math.round((earned / totalWeight) * 100)
}

/**
 * @param {ReturnType<typeof resolveCriteria>} resolved
 * @returns {{ scope: 'overall' | Category, limit: number, reason: string }[]}
 */
function computeCaps(resolved) {
  const caps = []

  const mandatory = resolved.filter(c => c.mandatory)

  for (const criterion of mandatory.filter(c => c.status === 'missing')) {
    caps.push({
      scope: criterion.category,
      limit: MANDATORY_MISSING_CATEGORY_CAP,
      reason: `Falta un requisito obligatorio: ${criterion.label}.`
    })
  }

  const missing = mandatory.filter(c => c.status === 'missing')
  const partial = mandatory.filter(c => c.status === 'partial')

  if (missing.length > 0) {
    caps.push({
      scope: 'overall',
      limit: MANDATORY_MISSING_OVERALL_CAP,
      reason: `Falta un requisito obligatorio de la profesión: ${missing
        .map(c => c.label)
        .join('; ')}.`
    })
  } else if (partial.length > 0) {
    caps.push({
      scope: 'overall',
      limit: MANDATORY_PARTIAL_OVERALL_CAP,
      reason: `Un requisito obligatorio de la profesión no queda plenamente acreditado: ${partial
        .map(c => c.label)
        .join('; ')}.`
    })
  }

  return caps
}

/**
 * @param {Record<Category, number>} categoryScores
 * @returns {number}
 */
function computeOverallScore(categoryScores) {
  const weightedSum = CATEGORIES.reduce(
    (sum, category) =>
      sum + categoryScores[category] * CATEGORY_WEIGHTS[category],
    0
  )

  return Math.round(weightedSum)
}

/**
 * @param {Criterion[]} criteria
 * @param {CriterionAssessment[]} assessments
 * @param {string} cvText
 */
function scoreCV(criteria, assessments, cvText) {
  const resolved = resolveCriteria(criteria, assessments, cvText)

  const caps = computeCaps(resolved)

  const capFor = scope =>
    caps
      .filter(cap => cap.scope === scope)
      .reduce((min, cap) => Math.min(min, cap.limit), 100)

  /** @type {Record<Category, number>} */
  const categoryScores = /** @type {any} */ ({})

  for (const category of CATEGORIES) {
    categoryScores[category] = Math.min(
      rawCategoryScore(resolved, category),
      capFor(category)
    )
  }

  const overall = Math.min(
    computeOverallScore(categoryScores),
    capFor('overall')
  )

  return {
    score: { overall, ...categoryScores },
    criteria: resolved,
    caps
  }
}

module.exports = {
  scoreCV,
  computeOverallScore,
  normalizeForMatch,
  isEvidenceInCV,
  CATEGORIES,
  CATEGORY_WEIGHTS,
  MANDATORY_MISSING_CATEGORY_CAP,
  MANDATORY_MISSING_OVERALL_CAP,
  MANDATORY_PARTIAL_OVERALL_CAP
}
