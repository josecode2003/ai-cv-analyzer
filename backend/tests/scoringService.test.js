const {
  scoreCV,
  isEvidenceInCV,
  normalizeForMatch,
  MANDATORY_MISSING_OVERALL_CAP,
  MANDATORY_MISSING_CATEGORY_CAP,
  MANDATORY_PARTIAL_OVERALL_CAP
} = require('../src/services/scoringService')

const CV_TEXT = `
Juan Pérez · 600 111 222 · juan@example.com · Madrid
EXPERIENCIA
Oficial de 2ª electricista — Instalaciones Martínez (03/2019 – 06/2023)
Montaje de cuadros eléctricos en 40 viviendas de obra nueva.
FORMACIÓN
CFGM Instalaciones Eléctricas y Automáticas — IES Valdemoro (2016 – 2018)
`

function criterion(id, category, overrides = {}) {
  return {
    id,
    category,
    label: `Criterio ${id}`,
    weight: 2,
    mandatory: false,
    evidenceRequired: true,
    ...overrides
  }
}

const ALL_CATEGORIES_CRITERIA = [
  criterion('exp', 'experience'),
  criterion('skills', 'skills'),
  criterion('edu', 'education'),
  criterion('cert', 'certifications'),
  criterion('pres', 'presentation', { evidenceRequired: false })
]

function assessment(id, status, evidence = '') {
  return { id, status, evidence, note: '' }
}

describe('normalizeForMatch / isEvidenceInCV', () => {
  test('ignora acentos, mayúsculas, espacios y puntuación del PDF', () => {
    expect(normalizeForMatch('Técnico  en\nEmergencias.')).toBe(
      'tecnicoenemergencias'
    )

    expect(
      isEvidenceInCV(
        'montaje de cuadros   ELECTRICOS en 40 viviendas',
        normalizeForMatch(CV_TEXT)
      )
    ).toBe(true)
  })

  test('acepta varios fragmentos separados por "…" si todos existen', () => {
    const cv = normalizeForMatch(CV_TEXT)

    expect(
      isEvidenceInCV('Oficial de 2ª electricista … IES Valdemoro', cv)
    ).toBe(true)
    expect(isEvidenceInCV('Oficial de 2ª electricista … Carné REBT', cv)).toBe(
      false
    )
  })

  test('rechaza citas vacías o demasiado cortas para probar nada', () => {
    const cv = normalizeForMatch(CV_TEXT)

    expect(isEvidenceInCV('', cv)).toBe(false)
    expect(isEvidenceInCV('de', cv)).toBe(false)
  })
})

describe('scoreCV', () => {
  test('la nota se calcula solo a partir de los dictámenes y los pesos', () => {
    const { score } = scoreCV(
      ALL_CATEGORIES_CRITERIA,
      [
        assessment('exp', 'met', 'Oficial de 2ª electricista'),
        assessment('skills', 'partial', 'Montaje de cuadros eléctricos'),
        assessment('edu', 'met', 'CFGM Instalaciones Eléctricas y Automáticas'),
        assessment('cert', 'missing'),
        assessment('pres', 'met')
      ],
      CV_TEXT
    )

    expect(score).toEqual({
      experience: 100,
      skills: 50,
      education: 100,
      certifications: 0,
      presentation: 100,
      // 100·0.30 + 50·0.25 + 100·0.15 + 0·0.15 + 100·0.15 = 72.5
      overall: 73
    })
  })

  test('los mismos dictámenes dan siempre la misma nota', () => {
    const assessments = [
      assessment('exp', 'met', 'Oficial de 2ª electricista'),
      assessment('skills', 'missing'),
      assessment('edu', 'partial', 'IES Valdemoro'),
      assessment('cert', 'missing'),
      assessment('pres', 'partial')
    ]

    const first = scoreCV(ALL_CATEGORIES_CRITERIA, assessments, CV_TEXT)
    const second = scoreCV(ALL_CATEGORIES_CRITERIA, assessments, CV_TEXT)

    expect(first.score).toEqual(second.score)
  })

  test('una cita que no está en el CV baja el dictamen un escalón', () => {
    const { criteria, score } = scoreCV(
      ALL_CATEGORIES_CRITERIA,
      [
        assessment('exp', 'met', 'Encargado de obra durante 10 años'),
        assessment('skills', 'partial', 'Domina AutoCAD Electrical'),
        assessment('edu', 'met', 'CFGM Instalaciones Eléctricas y Automáticas'),
        assessment('cert', 'missing'),
        assessment('pres', 'met')
      ],
      CV_TEXT
    )

    const exp = criteria.find(c => c.id === 'exp')

    expect(exp.status).toBe('partial')
    expect(exp.evidence).toBe('')
    expect(exp.note).toMatch(/no aparece literalmente/)
    expect(criteria.find(c => c.id === 'skills').status).toBe('missing')
    expect(score.experience).toBe(50)
    expect(score.skills).toBe(0)
  })

  test('los criterios holísticos no exigen cita', () => {
    const { criteria } = scoreCV(
      ALL_CATEGORIES_CRITERIA,
      [assessment('pres', 'met')],
      CV_TEXT
    )

    expect(criteria.find(c => c.id === 'pres').status).toBe('met')
  })

  test('un criterio sin dictamen cuenta como no cumplido', () => {
    const { criteria } = scoreCV(ALL_CATEGORIES_CRITERIA, [], CV_TEXT)

    expect(criteria.every(c => c.status === 'missing')).toBe(true)
  })

  test('un dictamen con un estado desconocido cuenta como no cumplido', () => {
    const { criteria } = scoreCV(
      ALL_CATEGORIES_CRITERIA,
      [assessment('pres', 'excelente')],
      CV_TEXT
    )

    expect(criteria.find(c => c.id === 'pres').status).toBe('missing')
  })

  test('falta un requisito obligatorio: topa la categoría y la nota global', () => {
    const criteria = [
      ...ALL_CATEGORIES_CRITERIA,
      criterion('carne', 'certifications', { weight: 3, mandatory: true })
    ]

    const { score, caps } = scoreCV(
      criteria,
      [
        assessment('exp', 'met', 'Oficial de 2ª electricista'),
        assessment('skills', 'met', 'Montaje de cuadros eléctricos'),
        assessment('edu', 'met', 'CFGM Instalaciones Eléctricas y Automáticas'),
        assessment('cert', 'met', 'IES Valdemoro'),
        assessment('pres', 'met'),
        assessment('carne', 'missing')
      ],
      CV_TEXT
    )

    expect(score.certifications).toBeLessThanOrEqual(
      MANDATORY_MISSING_CATEGORY_CAP
    )
    expect(score.overall).toBe(MANDATORY_MISSING_OVERALL_CAP)
    expect(caps.map(cap => cap.scope)).toEqual(['certifications', 'overall'])
    expect(caps[1].reason).toMatch(/Criterio carne/)
  })

  test('un requisito obligatorio parcial topa la nota global más suave', () => {
    const criteria = [
      criterion('exp', 'experience'),
      criterion('carne', 'certifications', { mandatory: true })
    ]

    const { score } = scoreCV(
      criteria,
      [
        assessment('exp', 'met', 'Oficial de 2ª electricista'),
        assessment('carne', 'partial', 'Instalaciones Martínez')
      ],
      CV_TEXT
    )

    expect(score.overall).toBeLessThanOrEqual(MANDATORY_PARTIAL_OVERALL_CAP)
  })
})
