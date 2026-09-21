/*
 * Mock del servicio de Market Analysis.
 *
 * Así los tests no llaman a OpenAI (ni a su herramienta de
 * búsqueda web) y podemos comprobar con precisión cuántas
 * veces se invoca el servicio real (para verificar el caché).
 */

const mockAnalyzeMarketForProfile = jest.fn()

jest.mock('../src/services/marketAnalysisService', () => ({
  analyzeMarketForProfile: (...args) => mockAnalyzeMarketForProfile(...args),
  MARKET_ANALYSIS_VERSION: 'test-market-model-v1',
  MARKET_DATA_VERSION: 'test-market-data-v1'
}))

const pool = require('../src/config/database')

const { createAnalysis } = require('../src/repositories/cvAnalysisRepository')

const { createSessionAgent } = require('./helpers/sessionAgent')

/* =========================================================
   FIXTURE
   ========================================================= */

function baseAnalysis(overrides = {}) {
  return {
    personalInfo: {
      name: 'Candidato Test',
      email: 'candidate@test.com',
      phone: '',
      location: overrides.location || '',
      linkedin: '',
      github: ''
    },
    summary: 'Perfil de prueba.',
    experience: [],
    education: [],
    skills: { technical: [], soft: [], languages: [] },
    projects: [],
    certifications: [],
    analysis: {
      strengths: [],
      weaknesses: [],
      recommendations: []
    },
    score: {
      overall: 75,
      experience: 70,
      skills: 75,
      education: 80,
      projects: 60,
      presentation: 90
    },
    overallAssessment: {
      level: 'Junior',
      profile: 'Perfil de prueba',
      mainIssue: 'Ninguno',
      priority: 'low'
    },
    professionalProfile: overrides.professionalProfile
  }
}

async function createAnalysisFixture(sessionId, professionalProfile) {
  const analysis = baseAnalysis({ professionalProfile })

  return createAnalysis({
    sessionId,
    originalFilename: 'test-cv.pdf',
    filename: 'test-file.pdf',
    fileSize: 12345,
    mimeType: 'application/pdf',
    candidateName: 'Candidato Test',
    candidateEmail: 'candidate@test.com',
    score: 75,
    profile: 'Perfil de prueba',
    level: 'Junior',
    analysis,
    contentHash: `hash-${Math.random()}`,
    modelVersion: 'test-cv-model-v1'
  })
}

const nurseProfile = {
  occupation: 'Enfermera de UCI',
  relatedOccupations: [],
  sector: 'Sanidad',
  subsector: 'Cuidados intensivos',
  seniority: 'Mid-level',
  experienceYears: 4,
  location: 'Madrid',
  region: 'Comunidad de Madrid',
  profileType: 'single',
  keySkills: ['Cuidados críticos'],
  certifications: [],
  languages: []
}

const waiterProfile = {
  occupation: 'Camarero de sala',
  relatedOccupations: [],
  sector: 'Hostelería',
  subsector: 'Restauración',
  seniority: 'Oficial de 1ª',
  experienceYears: 3,
  location: 'Valencia',
  region: 'Comunitat Valenciana',
  profileType: 'single',
  keySkills: ['Atención al cliente'],
  certifications: ['Manipulador de alimentos'],
  languages: []
}

const fakeMarketResult = {
  profileSummary: {
    occupation: 'Enfermera de UCI',
    sector: 'Sanidad',
    region: 'Madrid'
  },
  dataSufficiency: 'partial',
  situacionActual: {
    summary: 'Datos de prueba',
    confidence: 'otra_fuente',
    source: 'Fuente de prueba',
    sourceUrl: 'https://example.com/fuente',
    dataDate: '2026-01-01'
  },
  demand: {
    level: 'alta',
    explanation: 'Explicación de prueba',
    confidence: 'otra_fuente',
    source: 'Fuente de prueba',
    sourceUrl: 'https://example.com/fuente',
    dataDate: '2026-01-01'
  },
  salary: {
    range: '1.800-2.200 €/mes',
    period: 'mensual',
    confidence: 'sin_datos_suficientes',
    source: '',
    sourceUrl: '',
    dataDate: ''
  },
  trends: [],
  sectorsHiring: ['Sanidad pública'],
  relatedRoles: [],
  skillsInDemand: [],
  geographicDistribution: [],
  recommendations: ['Recomendación de prueba'],
  sourcesUsed: [
    {
      title: 'Fuente',
      url: 'https://example.com/fuente',
      publisher: 'Test',
      date: '2026-01-01'
    }
  ]
}

describe('Market analysis', () => {
  let sessionA
  let sessionB

  beforeAll(async () => {
    sessionA = await createSessionAgent()
    sessionB = await createSessionAgent()
  })

  beforeEach(() => {
    mockAnalyzeMarketForProfile.mockReset()
  })

  /* =======================================================
     PERFIL AUSENTE
     ======================================================= */

  test('debe informar de que no hay perfil sin llamar al servicio de mercado', async () => {
    const savedAnalysis = await createAnalysisFixture(sessionA.sessionId, {
      ...nurseProfile,
      occupation: ''
    })

    const response = await sessionA.agent.post(
      `/api/cv/${savedAnalysis.id}/market-analysis`
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.available).toBe(false)
    expect(mockAnalyzeMarketForProfile).not.toHaveBeenCalled()
  })

  /* =======================================================
     PROPIEDAD
     ======================================================= */

  test('la sesión B no debe poder pedir el mercado de un análisis de la sesión A', async () => {
    const savedAnalysis = await createAnalysisFixture(
      sessionA.sessionId,
      nurseProfile
    )

    const response = await sessionB.agent.post(
      `/api/cv/${savedAnalysis.id}/market-analysis`
    )

    expect(response.statusCode).toBe(404)
    expect(mockAnalyzeMarketForProfile).not.toHaveBeenCalled()
  })

  /* =======================================================
     GENERACIÓN + CACHÉ GLOBAL POR PERFIL
     ======================================================= */

  test('debe generar el análisis una vez y reutilizarlo para el mismo perfil desde otra sesión/CV', async () => {
    mockAnalyzeMarketForProfile.mockResolvedValue(fakeMarketResult)

    const analysisA = await createAnalysisFixture(
      sessionA.sessionId,
      nurseProfile
    )
    const analysisB = await createAnalysisFixture(
      sessionB.sessionId,
      nurseProfile
    )

    const firstResponse = await sessionA.agent.post(
      `/api/cv/${analysisA.id}/market-analysis`
    )

    expect(firstResponse.statusCode).toBe(201)
    expect(firstResponse.body.available).toBe(true)
    expect(firstResponse.body.cached).toBe(false)
    expect(firstResponse.body.marketAnalysis.demand.level).toBe('alta')
    expect(mockAnalyzeMarketForProfile).toHaveBeenCalledTimes(1)

    /*
     * Mismo perfil profesional, CV y sesión distintos:
     * debe reutilizar el resultado sin volver a llamar
     * al servicio de mercado.
     */

    const secondResponse = await sessionB.agent.post(
      `/api/cv/${analysisB.id}/market-analysis`
    )

    expect(secondResponse.statusCode).toBe(200)
    expect(secondResponse.body.available).toBe(true)
    expect(secondResponse.body.cached).toBe(true)
    expect(secondResponse.body.marketAnalysis.demand.level).toBe('alta')
    expect(mockAnalyzeMarketForProfile).toHaveBeenCalledTimes(1)
  })

  /* =======================================================
     PERFILES DISTINTOS → NO COMPARTEN CACHÉ
     ======================================================= */

  test('perfiles distintos deben generar análisis de mercado independientes', async () => {
    mockAnalyzeMarketForProfile.mockResolvedValue(fakeMarketResult)

    /*
     * Usamos ocupaciones exclusivas de este test (no
     * reutilizadas en otros) para que su firma de perfil
     * no coincida con nada ya cacheado por tests anteriores.
     */

    const industryProfile = {
      ...waiterProfile,
      occupation: 'Operario/a de producción industrial',
      sector: 'Industria',
      subsector: 'Fabricación'
    }

    const logisticsProfile = {
      ...waiterProfile,
      occupation: 'Mozo/a de almacén',
      sector: 'Logística',
      subsector: 'Almacenamiento'
    }

    const analysisA = await createAnalysisFixture(
      sessionA.sessionId,
      industryProfile
    )
    const analysisB = await createAnalysisFixture(
      sessionA.sessionId,
      logisticsProfile
    )

    await sessionA.agent.post(`/api/cv/${analysisA.id}/market-analysis`)
    await sessionA.agent.post(`/api/cv/${analysisB.id}/market-analysis`)

    expect(mockAnalyzeMarketForProfile).toHaveBeenCalledTimes(2)
  })

  /* =======================================================
     FALLO DE LA FUENTE EXTERNA
     ======================================================= */

  test('un fallo del servicio de mercado no debe romper la petición ni cachear nada', async () => {
    mockAnalyzeMarketForProfile.mockRejectedValueOnce(new Error('timeout'))

    const analysis = await createAnalysisFixture(sessionA.sessionId, {
      ...nurseProfile,
      occupation: 'Ocupación de prueba que falla'
    })

    const response = await sessionA.agent.post(
      `/api/cv/${analysis.id}/market-analysis`
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.available).toBe(false)
    expect(response.body.message).toMatch(/no se pudo obtener/i)

    /*
     * Un reintento posterior debe volver a llamar al
     * servicio: el fallo no se ha guardado como si fuera
     * un resultado válido.
     */

    mockAnalyzeMarketForProfile.mockResolvedValueOnce(fakeMarketResult)

    const retryResponse = await sessionA.agent.post(
      `/api/cv/${analysis.id}/market-analysis`
    )

    expect(retryResponse.statusCode).toBe(201)
    expect(retryResponse.body.available).toBe(true)
    expect(mockAnalyzeMarketForProfile).toHaveBeenCalledTimes(2)
  })

  /* =======================================================
     LIMPIEZA
     ======================================================= */

  afterAll(async () => {
    await pool.query(
      `
        DELETE FROM sessions
        WHERE id IN ($1, $2)
      `,
      [sessionA.sessionId, sessionB.sessionId]
    )

    await pool.query(
      `
        DELETE FROM market_analyses
        WHERE model_version = $1
      `,
      ['test-market-model-v1']
    )
  })
})
