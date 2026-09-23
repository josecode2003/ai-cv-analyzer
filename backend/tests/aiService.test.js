/*
 * Pipeline de analyzeCV sin llamar a OpenAI: se comprueba que la nota
 * NUNCA la decide el modelo (se calcula con scoringService a partir de
 * sus dictámenes) y que el baremo de la profesión llega a la evaluación.
 */

const mockCreate = jest.fn()

jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({ responses: { create: mockCreate } }))
)

const mockDetectProfession = jest.fn()
const mockGetRubric = jest.fn()

jest.mock('../src/services/rubricService', () => ({
  ...jest.requireActual('../src/services/rubricService'),
  detectProfession: (...args) => mockDetectProfession(...args),
  getRubric: (...args) => mockGetRubric(...args)
}))

const { analyzeCV } = require('../src/services/aiService')
const { GENERIC_CRITERIA } = jest.requireActual('../src/services/rubricService')

const CV_TEXT = `Laura Gómez · 600 000 000 · laura@example.com · Sevilla
Socorrista en Piscina Municipal de Sevilla (06/2022 – 09/2024)
Título de Socorrista en Instalaciones Acuáticas`

const RUBRIC = {
  occupation: 'Socorrista',
  sector: 'Deporte y ocio',
  criteria: [
    {
      id: 'prof_1',
      category: 'certifications',
      label: 'Título oficial de socorrista acuático',
      weight: 3,
      mandatory: true,
      evidenceRequired: true
    }
  ]
}

function modelOutput(criteriaAssessment) {
  return {
    personalInfo: {
      name: 'Laura Gómez',
      email: 'laura@example.com',
      phone: '600 000 000',
      location: 'Sevilla',
      linkedin: '',
      github: ''
    },
    summary: '',
    experience: [],
    education: [],
    skills: { technical: [], soft: [], languages: [] },
    projects: [],
    certifications: [],
    criteriaAssessment,
    analysis: { strengths: [], weaknesses: [], recommendations: [] },
    overallAssessment: {
      level: 'Junior',
      profile: 'Socorrista',
      mainIssue: '',
      priority: 'low'
    },
    professionalProfile: {
      occupation: 'Socorrista',
      relatedOccupations: [],
      sector: 'Deporte y ocio',
      subsector: '',
      seniority: 'Junior',
      experienceYears: 2,
      location: 'Sevilla',
      region: 'Andalucía',
      profileType: 'single',
      detectedProfiles: [
        {
          occupation: 'Socorrista acuático',
          sector: 'Ocio',
          relevance: 'primary'
        }
      ],
      keySkills: [],
      certifications: [],
      languages: []
    },
    // Aunque el modelo intentara colar una nota, se ignora.
    score: { overall: 99 }
  }
}

describe('analyzeCV', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockDetectProfession.mockResolvedValue({
      occupation: 'Socorrista',
      sector: 'Deporte y ocio'
    })
    mockGetRubric.mockResolvedValue(RUBRIC)
  })

  test('envía al modelo los criterios genéricos y los de la profesión', async () => {
    mockCreate.mockResolvedValue({
      output_text: JSON.stringify(modelOutput([]))
    })

    await analyzeCV(CV_TEXT)

    const userMessage = mockCreate.mock.calls[0][0].input[1].content

    expect(userMessage).toContain('Socorrista')
    expect(userMessage).toContain('prof_1')
    for (const criterion of GENERIC_CRITERIA) {
      expect(userMessage).toContain(criterion.id)
    }
  })

  test('calcula la nota en código y adjunta el baremo evaluado', async () => {
    mockCreate.mockResolvedValue({
      output_text: JSON.stringify(
        modelOutput([
          {
            id: 'prof_1',
            status: 'met',
            evidence: 'Título de Socorrista en Instalaciones Acuáticas',
            note: ''
          }
        ])
      )
    })

    const result = await analyzeCV(CV_TEXT)

    expect(result.score.overall).not.toBe(99)
    expect(result.score).toHaveProperty('certifications')
    expect(result.score).not.toHaveProperty('projects')
    expect(result).not.toHaveProperty('criteriaAssessment')
    expect(result.evaluation.occupation).toBe('Socorrista')
    expect(result.evaluation.criteria).toHaveLength(
      GENERIC_CRITERIA.length + RUBRIC.criteria.length
    )
    expect(result.evaluation.caps).toEqual([])
  })

  test('sin el título obligatorio la nota queda topada', async () => {
    mockCreate.mockResolvedValue({
      output_text: JSON.stringify(
        modelOutput([
          // El modelo dice "cumple", pero la cita no está en el CV.
          {
            id: 'prof_1',
            status: 'met',
            evidence: 'Título de socorrista homologado por la RFESS',
            note: ''
          }
        ])
      )
    })

    const result = await analyzeCV(CV_TEXT)

    const title = result.evaluation.criteria.find(c => c.id === 'prof_1')

    expect(title.status).toBe('partial')
    expect(result.evaluation.caps.some(cap => cap.scope === 'overall')).toBe(
      true
    )
  })

  test('normaliza el perfil principal para que coincida con la ocupación', async () => {
    mockCreate.mockResolvedValue({
      output_text: JSON.stringify(modelOutput([]))
    })

    const result = await analyzeCV(CV_TEXT)

    expect(result.professionalProfile.detectedProfiles).toEqual([
      {
        occupation: 'Socorrista',
        sector: 'Deporte y ocio',
        relevance: 'primary'
      }
    ])
  })

  test('propaga el error cuando el documento no es un CV', async () => {
    const { NotACVError } = jest.requireActual('../src/services/rubricService')

    mockDetectProfession.mockRejectedValue(new NotACVError('No es un CV'))

    await expect(analyzeCV('Factura nº 123')).rejects.toThrow('No es un CV')
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('toOccupationKey', () => {
  const { toOccupationKey } = jest.requireActual(
    '../src/services/rubricService'
  )

  test('unifica variantes de género, acentos y mayúsculas', () => {
    expect(toOccupationKey('Camarero/a')).toBe('camarero')
    expect(toOccupationKey('camarero')).toBe('camarero')
    expect(toOccupationKey('Técnico/a de Marketing')).toBe(
      'tecnico de marketing'
    )
    expect(toOccupationKey('Médico(a)')).toBe('medico')
  })
})
