/*
 * La calidad del juicio del LLM (si detecta bien la profesión
 * de un CV real) no se puede probar de forma fiable ni
 * determinista en CI. Lo que SÍ podemos y debemos probar es
 * que el pipeline completo (aiService → cvRoutes →
 * cvAnalysisRepository → respuesta HTTP) transporta
 * correctamente un `professionalProfile` estructurado para
 * cualquier sector, incluyendo perfiles híbridos y CVs sin
 * profesión/ubicación clara — sin asumir nunca "developer" por
 * defecto.
 */

const mockAnalyzeCV = jest.fn()

/*
 * Cada caso de este archivo sube un PDF distinto y debe
 * generar un contentHash distinto (para no chocar con el
 * caché por hash, que es intencionadamente global). El mock
 * de extractTextFromPDF devuelve un texto único por llamada
 * en vez de un texto fijo, precisamente para no interferir
 * con ese caché mientras se prueba.
 */
let mockExtractedTextCounter = 0

jest.mock('../src/services/pdfService', () => ({
  extractTextFromPDF: jest.fn(
    async () => `Texto de CV de prueba ${mockExtractedTextCounter++}`
  )
}))

jest.mock('../src/services/aiService', () => ({
  analyzeCV: (...args) => mockAnalyzeCV(...args),
  CV_ANALYSIS_VERSION: 'test-cv-model-v1'
}))

const pool = require('../src/config/database')

const { createSessionAgent } = require('./helpers/sessionAgent')

function analysisFor(professionalProfile, overrides = {}) {
  return {
    personalInfo: {
      name: 'Candidato Test',
      email: 'candidate@test.com',
      phone: '',
      location: professionalProfile.location || '',
      linkedin: '',
      github: ''
    },
    summary: 'Perfil de prueba.',
    experience: [],
    education: [],
    skills: { technical: [], soft: [], languages: [] },
    projects: [],
    certifications: [],
    analysis: { strengths: [], weaknesses: [], recommendations: [] },
    score: {
      overall: 70,
      experience: 70,
      skills: 70,
      education: 70,
      projects: 70,
      presentation: 70
    },
    overallAssessment: {
      level: professionalProfile.seniority || 'No determinado',
      profile: professionalProfile.occupation || 'No determinado',
      mainIssue: 'Ninguno',
      priority: 'low'
    },
    professionalProfile,
    ...overrides
  }
}

const sectorProfiles = [
  {
    label: 'tecnología',
    profile: {
      occupation: 'Desarrolladora Backend',
      relatedOccupations: ['Ingeniera de software'],
      sector: 'Tecnología',
      subsector: 'Desarrollo de software',
      seniority: 'Mid-level',
      experienceYears: 3,
      location: 'Barcelona',
      region: 'Cataluña',
      profileType: 'single',
      detectedProfiles: [
        {
          occupation: 'Desarrolladora Backend',
          sector: 'Tecnología',
          relevance: 'primary'
        }
      ],
      keySkills: ['Node.js', 'PostgreSQL'],
      certifications: [],
      languages: ['Inglés']
    }
  },
  {
    label: 'sanidad',
    profile: {
      occupation: 'Enfermero de UCI',
      relatedOccupations: [],
      sector: 'Sanidad',
      subsector: 'Cuidados intensivos',
      seniority: 'Senior',
      experienceYears: 8,
      location: 'Sevilla',
      region: 'Andalucía',
      profileType: 'single',
      detectedProfiles: [
        {
          occupation: 'Enfermero de UCI',
          sector: 'Sanidad',
          relevance: 'primary'
        }
      ],
      keySkills: ['Cuidados críticos', 'RCP avanzada'],
      certifications: ['Soporte vital avanzado'],
      languages: []
    }
  },
  {
    label: 'hostelería',
    profile: {
      occupation: 'Camarero de sala',
      relatedOccupations: ['Jefe de rango'],
      sector: 'Hostelería',
      subsector: 'Restauración',
      seniority: 'Oficial de 1ª',
      experienceYears: 5,
      location: 'Palma de Mallorca',
      region: 'Islas Baleares',
      profileType: 'single',
      detectedProfiles: [
        {
          occupation: 'Camarero de sala',
          sector: 'Hostelería',
          relevance: 'primary'
        }
      ],
      keySkills: ['Atención al cliente', 'Coctelería'],
      certifications: ['Manipulador de alimentos'],
      languages: ['Inglés', 'Alemán']
    }
  },
  {
    label: 'administración',
    profile: {
      occupation: 'Auxiliar administrativo',
      relatedOccupations: [],
      sector: 'Administración',
      subsector: 'Gestión de oficina',
      seniority: 'Junior',
      experienceYears: 1,
      location: 'Zaragoza',
      region: 'Aragón',
      profileType: 'single',
      detectedProfiles: [
        {
          occupation: 'Auxiliar administrativo',
          sector: 'Administración',
          relevance: 'primary'
        }
      ],
      keySkills: ['Ofimática', 'Atención telefónica'],
      certifications: [],
      languages: []
    }
  },
  {
    label: 'logística',
    profile: {
      occupation: 'Mozo/a de almacén',
      relatedOccupations: ['Carretillero/a'],
      sector: 'Logística',
      subsector: 'Almacenamiento',
      seniority: 'Oficial',
      experienceYears: 2,
      location: 'Guadalajara',
      region: 'Castilla-La Mancha',
      profileType: 'single',
      detectedProfiles: [
        {
          occupation: 'Mozo/a de almacén',
          sector: 'Logística',
          relevance: 'primary'
        }
      ],
      keySkills: ['Carretilla elevadora', 'Gestión de inventario'],
      certifications: ['Carnet de carretillero'],
      languages: []
    }
  },
  {
    label: 'industria',
    profile: {
      occupation: 'Operario/a de producción industrial',
      relatedOccupations: [],
      sector: 'Industria',
      subsector: 'Fabricación',
      seniority: 'Oficial de 2ª',
      experienceYears: 4,
      location: 'Vigo',
      region: 'Galicia',
      profileType: 'single',
      detectedProfiles: [
        {
          occupation: 'Operario/a de producción industrial',
          sector: 'Industria',
          relevance: 'primary'
        }
      ],
      keySkills: ['Manejo de maquinaria', 'Control de calidad'],
      certifications: ['PRL 20h'],
      languages: []
    }
  }
]

describe('Detección de perfil profesional por sector', () => {
  let session

  beforeAll(async () => {
    session = await createSessionAgent()
  })

  afterEach(async () => {
    mockAnalyzeCV.mockReset()
  })

  test.each(sectorProfiles)(
    'debe transportar correctamente un perfil de $label',
    async ({ profile }) => {
      mockAnalyzeCV.mockResolvedValue(analysisFor(profile))

      const response = await session.agent
        .post('/api/cv')
        .attach('cv', Buffer.from(`%PDF-1.4 CV de ${profile.occupation}`), {
          filename: `${profile.occupation}.pdf`,
          contentType: 'application/pdf'
        })

      expect(response.statusCode).toBe(201)
      expect(response.body.analysis.professionalProfile).toEqual(profile)
    }
  )

  test('debe soportar un perfil híbrido sin forzarlo a una única categoría', async () => {
    const hybridProfile = {
      occupation: 'Especialista en Marketing y análisis de datos',
      relatedOccupations: ['Analista de marketing', 'Data analyst'],
      sector: 'Marketing',
      subsector: 'Analítica de marketing',
      seniority: 'Mid-level',
      experienceYears: 3,
      location: 'Madrid',
      region: 'Comunidad de Madrid',
      profileType: 'hybrid',
      detectedProfiles: [
        {
          occupation: 'Especialista en Marketing y análisis de datos',
          sector: 'Marketing',
          relevance: 'primary'
        },
        {
          occupation: 'Analista de datos',
          sector: 'Tecnología',
          relevance: 'secondary'
        }
      ],
      keySkills: ['SQL', 'Google Analytics', 'Campañas digitales'],
      certifications: [],
      languages: []
    }

    mockAnalyzeCV.mockResolvedValue(analysisFor(hybridProfile))

    const response = await session.agent
      .post('/api/cv')
      .attach('cv', Buffer.from('%PDF-1.4 CV hibrido'), {
        filename: 'cv-hibrido.pdf',
        contentType: 'application/pdf'
      })

    expect(response.statusCode).toBe(201)
    expect(response.body.analysis.professionalProfile.profileType).toBe(
      'hybrid'
    )
    expect(
      response.body.analysis.professionalProfile.detectedProfiles
    ).toHaveLength(2)
  })

  test('debe soportar un perfil multi (3+ profesiones) sin forzarlo a hybrid', async () => {
    const multiProfile = {
      occupation:
        'Formador/a y coordinador/a de eventos con soporte técnico audiovisual',
      relatedOccupations: [
        'Técnico de sonido',
        'Gestor de proyectos culturales'
      ],
      sector: 'Educación',
      subsector: 'Formación de adultos',
      seniority: 'Mid-level',
      experienceYears: 6,
      location: 'Valencia',
      region: 'Comunidad Valenciana',
      profileType: 'multi',
      detectedProfiles: [
        {
          occupation: 'Formador/a de adultos',
          sector: 'Educación',
          relevance: 'primary'
        },
        {
          occupation: 'Coordinador/a de eventos',
          sector: 'Eventos',
          relevance: 'secondary'
        },
        {
          occupation: 'Técnico de sonido',
          sector: 'Audiovisual',
          relevance: 'secondary'
        }
      ],
      keySkills: [
        'Diseño instruccional',
        'Gestión de proveedores',
        'Mezcla de sonido en directo'
      ],
      certifications: [],
      languages: []
    }

    mockAnalyzeCV.mockResolvedValue(analysisFor(multiProfile))

    const response = await session.agent
      .post('/api/cv')
      .attach('cv', Buffer.from('%PDF-1.4 CV multi'), {
        filename: 'cv-multi.pdf',
        contentType: 'application/pdf'
      })

    expect(response.statusCode).toBe(201)
    expect(response.body.analysis.professionalProfile.profileType).toBe('multi')
    expect(
      response.body.analysis.professionalProfile.detectedProfiles
    ).toHaveLength(3)
    expect(
      response.body.analysis.professionalProfile.detectedProfiles.filter(
        p => p.relevance === 'primary'
      )
    ).toHaveLength(1)
  })

  test('debe aceptar un CV sin profesión ni ubicación claras sin inventar datos', async () => {
    const emptyProfile = {
      occupation: '',
      relatedOccupations: [],
      sector: '',
      subsector: '',
      seniority: '',
      experienceYears: 0,
      location: '',
      region: '',
      profileType: 'single',
      detectedProfiles: [{ occupation: '', sector: '', relevance: 'primary' }],
      keySkills: [],
      certifications: [],
      languages: []
    }

    mockAnalyzeCV.mockResolvedValue(analysisFor(emptyProfile))

    const response = await session.agent
      .post('/api/cv')
      .attach('cv', Buffer.from('%PDF-1.4 CV ambiguo'), {
        filename: 'cv-ambiguo.pdf',
        contentType: 'application/pdf'
      })

    expect(response.statusCode).toBe(201)
    expect(response.body.analysis.professionalProfile.occupation).toBe('')
    expect(response.body.analysis.professionalProfile.location).toBe('')
  })

  afterAll(async () => {
    await pool.query('DELETE FROM sessions WHERE id = $1', [session.sessionId])
  })
})
