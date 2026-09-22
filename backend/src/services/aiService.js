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

const CV_ANALYSIS_MODEL = 'gpt-4.1'

/*
 * Se incrementa manualmente cada vez que cambia el modelo
 * o el prompt de forma significativa (cambia el resultado
 * esperado para el mismo CV). El caché por hash de contenido
 * (ver cvAnalysisRepository) solo reutiliza análisis
 * generados con la misma versión, para no servir resultados
 * obsoletos tras un cambio de prompt/modelo.
 */
const CV_ANALYSIS_VERSION = `${CV_ANALYSIS_MODEL}-v4`

const cvAnalysisSchema = {
  type: 'object',
  additionalProperties: false,

  properties: {
    personalInfo: {
      type: 'object',
      additionalProperties: false,

      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        location: { type: 'string' },
        linkedin: { type: 'string' },
        github: { type: 'string' }
      },

      required: ['name', 'email', 'phone', 'location', 'linkedin', 'github']
    },

    summary: {
      type: 'string'
    },

    experience: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          company: { type: 'string' },
          position: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          description: { type: 'string' }
        },

        required: ['company', 'position', 'startDate', 'endDate', 'description']
      }
    },

    education: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          institution: { type: 'string' },
          degree: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' }
        },

        required: ['institution', 'degree', 'startDate', 'endDate']
      }
    },

    skills: {
      type: 'object',
      additionalProperties: false,

      properties: {
        technical: {
          type: 'array',
          items: {
            type: 'string'
          }
        },

        soft: {
          type: 'array',
          items: {
            type: 'string'
          }
        },

        languages: {
          type: 'array',

          items: {
            type: 'object',
            additionalProperties: false,

            properties: {
              language: { type: 'string' },
              level: { type: 'string' }
            },

            required: ['language', 'level']
          }
        }
      },

      required: ['technical', 'soft', 'languages']
    },

    projects: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          name: { type: 'string' },
          description: { type: 'string' },

          technologies: {
            type: 'array',
            items: {
              type: 'string'
            }
          }
        },

        required: ['name', 'description', 'technologies']
      }
    },

    certifications: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          name: { type: 'string' },
          platform: { type: 'string' },
          date: { type: 'string' },
          description: { type: 'string' }
        },

        required: ['name', 'platform', 'date', 'description']
      }
    },

    analysis: {
      type: 'object',
      additionalProperties: false,

      properties: {
        strengths: {
          type: 'array',
          items: {
            type: 'string'
          }
        },

        weaknesses: {
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

      required: ['strengths', 'weaknesses', 'recommendations']
    },

    score: {
      type: 'object',
      additionalProperties: false,

      properties: {
        overall: {
          type: 'number',
          minimum: 0,
          maximum: 100
        },

        experience: {
          type: 'number',
          minimum: 0,
          maximum: 100
        },

        skills: {
          type: 'number',
          minimum: 0,
          maximum: 100
        },

        education: {
          type: 'number',
          minimum: 0,
          maximum: 100
        },

        projects: {
          type: 'number',
          minimum: 0,
          maximum: 100
        },

        presentation: {
          type: 'number',
          minimum: 0,
          maximum: 100
        }
      },

      required: [
        'overall',
        'experience',
        'skills',
        'education',
        'projects',
        'presentation'
      ]
    },

    overallAssessment: {
      type: 'object',
      additionalProperties: false,

      properties: {
        level: {
          type: 'string'
        },

        profile: {
          type: 'string'
        },

        mainIssue: {
          type: 'string'
        },

        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high']
        }
      },

      required: ['level', 'profile', 'mainIssue', 'priority']
    },

    /*
     * Perfil profesional estructurado y genérico (cualquier
     * sector/oficio), usado como entrada del módulo de
     * Market Analysis. A diferencia del antiguo
     * `marketContext`, este bloque solo describe al
     * candidato: no contiene ninguna afirmación sobre el
     * mercado laboral (eso vive en un servicio separado,
     * respaldado por fuentes externas verificables).
     */
    professionalProfile: {
      type: 'object',
      additionalProperties: false,

      properties: {
        occupation: { type: 'string' },

        relatedOccupations: {
          type: 'array',
          items: { type: 'string' }
        },

        sector: { type: 'string' },
        subsector: { type: 'string' },
        seniority: { type: 'string' },
        experienceYears: { type: 'number' },
        location: { type: 'string' },
        region: { type: 'string' },

        profileType: {
          type: 'string',
          enum: ['single', 'hybrid', 'multi']
        },

        detectedProfiles: {
          type: 'array',
          minItems: 1,

          items: {
            type: 'object',
            additionalProperties: false,

            properties: {
              occupation: { type: 'string' },
              sector: { type: 'string' },

              relevance: {
                type: 'string',
                enum: ['primary', 'secondary']
              }
            },

            required: ['occupation', 'sector', 'relevance']
          }
        },

        keySkills: {
          type: 'array',
          items: { type: 'string' }
        },

        certifications: {
          type: 'array',
          items: { type: 'string' }
        },

        languages: {
          type: 'array',
          items: { type: 'string' }
        }
      },

      required: [
        'occupation',
        'relatedOccupations',
        'sector',
        'subsector',
        'seniority',
        'experienceYears',
        'location',
        'region',
        'profileType',
        'detectedProfiles',
        'keySkills',
        'certifications',
        'languages'
      ]
    }
  },

  required: [
    'personalInfo',
    'summary',
    'experience',
    'education',
    'skills',
    'projects',
    'certifications',
    'analysis',
    'score',
    'overallAssessment',
    'professionalProfile'
  ]
}

/*
 * El modelo recibe la fórmula exacta en la regla 50 del prompt,
 * pero en la práctica no la aplica de forma fiable dentro de la
 * generación JSON estructurada (se limita a "adivinar" un
 * `overall` plausible, sin hacer bien la aritmética). Por eso
 * `overall` NUNCA se confía al modelo: se recalcula siempre de
 * forma determinista en JavaScript a partir de las cinco
 * subpuntuaciones que sí son fiables, con estos mismos pesos.
 */
const OVERALL_SCORE_WEIGHTS = {
  experience: 0.25,
  skills: 0.25,
  education: 0.15,
  projects: 0.20,
  presentation: 0.15
}

/**
 * @param {{ experience: number, skills: number, education: number, projects: number, presentation: number }} categoryScores
 * @returns {number}
 */
function computeOverallScore(categoryScores) {
  const weightedSum = Object.entries(OVERALL_SCORE_WEIGHTS).reduce(
    (sum, [category, weight]) => sum + categoryScores[category] * weight,
    0
  )

  return Math.round(weightedSum)
}

/*
 * El schema JSON (aunque sea `strict: true`) no puede expresar
 * restricciones de consistencia ENTRE campos independientes:
 * "exactamente una entrada de detectedProfiles con relevance
 * 'primary'" y "esa entrada debe coincidir textualmente con
 * occupation/sector top-level" son invariantes de cardinalidad e
 * igualdad cruzada que json_schema en modo strict no soporta. En
 * pruebas reales el modelo no siempre las respeta al pie de la
 * letra (p. ej. deja la entrada "primary" con una redacción
 * ligeramente distinta al occupation top-level). Igual que con
 * `score.overall`, no se confía en que el modelo mantenga esta
 * invariante por sí solo: se normaliza siempre de forma
 * determinista tras la generación.
 *
 * @param {{ occupation: string, sector: string, detectedProfiles: Array<{ occupation: string, sector: string, relevance: string }> }} professionalProfile
 * @returns {Array<{ occupation: string, sector: string, relevance: string }>}
 */
function normalizeDetectedProfiles(professionalProfile) {
  const { occupation, sector, detectedProfiles } = professionalProfile

  if (!Array.isArray(detectedProfiles) || detectedProfiles.length === 0) {
    return [{ occupation, sector, relevance: 'primary' }]
  }

  const matchesTopLevel = profile =>
    profile.occupation === occupation && profile.sector === sector

  const topLevelMatchIndex = detectedProfiles.findIndex(matchesTopLevel)

  const modelPrimaryIndex = detectedProfiles.findIndex(
    profile => profile.relevance === 'primary'
  )

  const primaryIndex =
    topLevelMatchIndex !== -1
      ? topLevelMatchIndex
      : modelPrimaryIndex !== -1
        ? modelPrimaryIndex
        : 0

  return detectedProfiles.map((profile, index) =>
    index === primaryIndex
      ? { occupation, sector, relevance: 'primary' }
      : { ...profile, relevance: 'secondary' }
  )
}

/**
 * Analiza un CV en texto plano mediante la API de OpenAI
 * y devuelve el JSON estructurado que valida `cvAnalysisSchema`.
 *
 * @param {string} cvText
 * @returns {Promise<Record<string, unknown>>}
 */
async function analyzeCV(cvText) {
  if (!cvText || typeof cvText !== 'string') {
    throw new Error('CV text is required')
  }

  const response = await client.responses.create({
    model: CV_ANALYSIS_MODEL,

    /*
     * La puntuación debe ser reproducible: el mismo CV debe
     * producir la misma puntuación. temperature: 0 minimiza
     * la variación entre llamadas idénticas (no la elimina
     * por completo, dado el propio motor de inferencia, pero
     * es la mitigación estándar disponible vía la API).
     */
    temperature: 0,

    /*
     * La sección "SECTOR-SPECIFIC EVIDENCE OF QUALITY" del prompt
     * (reglas 42a-42g) traduce en reglas de evaluación accionables
     * la investigación hecha sobre cómo España evalúa realmente
     * cada profesión (certificados oficiales, carnés profesionales,
     * títulos regulados, colegios profesionales) en vez de aplicar
     * los mismos 5 criterios de "oficina" a cualquier oficio. No se
     * copian los datos en bruto al prompt (sería frágil y demasiado
     * largo); solo el principio general más 5-6 ejemplos ilustrativos,
     * igual que ya hace el prompt con `overallAssessment.level`.
     * Fuentes consultadas (España, verificadas en esta iteración):
     * - sepe.es, incual.educacion.gob.es (Catálogo Nacional de
     *   Cualificaciones Profesionales, certificados de profesionalidad)
     * - randstadresearch.es, adeccoinstitute.es,
     *   orientacion-laboral.infojobs.net (carencias reales que
     *   detectan las empresas por sector)
     * - todofp.es (familia profesional Sanidad, Emergencias
     *   Sanitarias), BOE RD 878/2011, enssap.es (TES, socorrismo RFESS)
     * - certicalia.com, flc.es/tpc, BOE/convenio general de la
     *   construcción (Carné de Instalador Eléctrico REBT, TPC)
     * - adecco.com, randstad.es (carnet de carretillero en logística)
     * - ui1.es, indeed.com (certificaciones Google en marketing digital)
     */

    input: [
      {
        role: 'system',

        content: `
You are an expert CV and recruitment analyst who works with candidates from EVERY profession and trade, not only office or technology roles: developers, but equally waiters, plumbers, electricians, bricklayers, cooks, drivers, cleaners, hairdressers, nurses, teachers, warehouse workers, farmers, and any other occupation that exists.

Your task is to analyze the CV provided by the user and return a precise, structured and objective assessment.

The purpose of the analysis is to help the candidate understand how strong their CV is and what concrete improvements could make it more competitive, WHATEVER their profession is.

CRITICAL: Never assume the candidate is a developer or office worker. Read the CV first, identify the actual profession or trade from its content, and adapt every part of your analysis (skills, "projects", scoring, recommendations, market context) to that specific profession. A CV for a plumber, a waiter or a bricklayer is just as valid and complete as a CV for a software developer, and must never be penalized for lacking things that only make sense in an office/tech context (e.g. a GitHub profile, a portfolio of coding projects, or listed "technologies").

LANGUAGE: Write every text value in the response in Spanish (Spain), regardless of the language the original CV is written in. This tool is aimed at the Spanish job market.

IMPORTANT DATA INTEGRITY RULES

1. Use ONLY information explicitly present in the CV.

2. NEVER invent:
   - personal information
   - companies
   - job positions
   - dates
   - education
   - institutions
   - skills
   - projects
   - certifications
   - languages
   - links
   - achievements
   - technologies
   - professional experience

3. If information is missing, return an empty string or empty array as appropriate.

4. Do not infer specific facts when the CV does not provide enough evidence.

5. Do not convert assumptions into facts.

6. Do not create projects merely because technologies or skills are listed.

7. Only identify a project when the CV explicitly describes a personal, academic or professional project or provides enough information to clearly identify one.

8. Only identify certifications, courses or training when they are explicitly present in the CV.

9. Do not classify ordinary technical skills as certifications.

PERSONAL INFORMATION

10. Extract name, email, phone, location, LinkedIn and GitHub exactly when available.

11. Do not fabricate missing contact information.

12. Preserve URLs and usernames exactly as they appear whenever possible.

EDUCATION

13. Identify every real educational qualification present in the CV.

14. If an institution is clearly associated with several qualifications, repeat the institution for every corresponding education entry.

15. Do NOT create an education entry containing only an institution.

16. If the institution is clearly stated near a qualification and the relationship is unambiguous, associate the institution with that qualification.

17. Do not leave the institution empty when the CV clearly provides it.

18. Preserve the qualification name and dates accurately.

EXPERIENCE

19. Extract professional experience only from information actually present in the CV.

20. Do not assume an end date when none is provided.

21. Do not invent achievements or metrics.

22. Preserve the distinction between administrative, technical and development experience.

SKILLS

23. Separate:
   - technical skills
   - soft skills
   - languages

24. Only include skills explicitly mentioned in the CV.

25. Do not assign proficiency levels unless the CV explicitly provides them.

26. For languages, only include a language level when it is explicitly stated.

PROJECTS / NOTABLE WORK

27. "Projects" is a broad category: personal, academic or professional projects (for developers and similar profiles), but equally notable jobs, works, services or achievements for any other trade or profession — e.g. a kitchen a cook designed a menu for, a renovation a plumber or bricklayer completed, an event a waiter or chef helped run, a vehicle fleet a driver maintained, a class a teacher developed. Use whatever concrete, describable body of work fits the candidate's actual profession.

28. However, do not invent projects or notable work that is not described in the CV.

29. If nothing of this kind is present, return an empty array.

30. A project/notable-work entry should contain:
   - name
   - description
   - technologies (tools, materials, machinery, software or techniques used — leave as an empty array if the profession genuinely has none worth listing)

31. Only populate those fields when supported by the CV.

CERTIFICATIONS

32. Extract courses, certifications and training explicitly included in the CV.

33. Preserve the platform, date and description when available.

34. Do not invent completion status.

ANALYSIS

35. Strengths must be specific to the actual CV.

36. Avoid generic compliments such as "good CV" or "great candidate".

37. Weaknesses must describe concrete deficiencies in the CV, not criticize the candidate personally.

38. Recommendations must be actionable.

39. Recommendations must directly address weaknesses identified in the CV.

40. Prioritize improvements according to their likely impact on employability.

41. Never recommend adding false information.

42. If a recommendation requires information that the candidate may legitimately have but has not included, clearly frame it as something to add only if applicable.

MULTI-PROFILE CVs: when the professionalProfile section below (rules 56-66) determines profileType "hybrid" or "multi", strengths/weaknesses/recommendations must, WHEN GENUINELY JUSTIFIED by the CV content, explicitly address that multi-dimensional nature — e.g. versatility across domains as a strength, unclear positioning as a weakness if the CV does not clearly distinguish between the different professional dimensions, or a recommendation on whether to lead with one specific profession or present the combination depending on the target role. Never fabricate this angle for a CV that is genuinely single-profile just to seem thorough; only surface it when the evidence in the CV itself supports it, following the same data-integrity rules (1-9) as everything else.

SECTOR-SPECIFIC EVIDENCE OF QUALITY

42a. In the real Spanish labor market, each profession has its OWN recognized signals of quality — an official certification, a regulated professional card ("carné"), a specific vocational qualification, a professional college ("colegio profesional") membership, or a federative license — and these signals are what employers, sector bodies and, where applicable, ministries actually use to judge a candidate, not generic CV wording. Before scoring SKILLS (46), EDUCATION (47) or identifying the main issue (53-54), identify the profession detected from the CV and ask: "what is the REAL, sector-recognized evidence of quality for this specific profession in Spain?" Then apply that specific evidence, instead of defaulting to office/tech-style criteria (e.g. a university degree, a portfolio, generic "certificates") for professions where those are not the real signal. This must be inferred for whatever profession the CV shows, not looked up from a fixed list — the examples below are illustrative, not exhaustive.

42b. Example — software/IT development: the real signals are a concrete, named technology stack (not generic "programming knowledge"), projects with measurable outcomes, up-to-date technical certifications from recognized vendors (e.g. AWS, Azure, Google Cloud), and English proficiency. Penalize buzzwords not backed by evidence of real use. Do NOT penalize a junior candidate for lacking professional experience if they show demonstrable personal or academic projects.

42c. Example — emergency healthcare / lifeguarding (Técnico en Emergencias Sanitarias, Socorrista): the real signal of quality is the official TES qualification (FP Grado Medio, familia Sanidad, homologado por Educación) and, for lifeguards, the carné de socorrista acuático homologado by the Real Federación Española de Salvamento y Socorrismo (RFESS) — not loose "first aid" workshops. Basic/advanced life support (SVB/DEA) training is a valued complement. Do NOT penalize the absence of university studies: the normal path in this field is FP plus federative certification.

42d. Example — electricity/construction trades (electricista and similar): the real signal of quality is the Carné de Instalador Eléctrico Autorizado en Baja Tensión (regulated under the REBT) — without it, an electrician cannot legalize installations or issue boletines, so its presence or absence must weigh far more heavily than CV wording. The Tarjeta Profesional de la Construcción (TPC) and progression through convenio-regulated categories (Peón, Oficial de 2ª, Oficial de 1ª, Encargado) also matter. Do NOT penalize the absence of university or higher vocational studies: the normal path is on-site learning plus these cards/certifications.

42e. Example — logistics/warehouse (reponedor, mozo/a de almacén): the carnet de carretillero is one of the most valued documents in this sector; its absence is a real, worth-mentioning gap, not a minor detail. PDA/WMS handling and at minimum ESO also matter. Do NOT penalize the absence of higher education.

42f. Example — digital marketing: official, named and verifiable platform certifications (e.g. Google Analytics 4, Google Ads) matter; real specialization in one or two tools weighs MORE than accumulating generic certificates or vaguely mentioning "marketing digital" without specifics.

42g. Apply this same reasoning to ANY other profession the CV shows, even if not listed above: identify its real sector-recognized certification, professional card, regulated qualification or professional college, and weigh SKILLS/EDUCATION/CERTIFICATIONS accordingly. Never invent a certification or requirement the CV does not mention — this section changes how you WEIGH evidence already extracted, it never changes the data-integrity rules (1-9): if the CV provides no evidence of any such signal, say so plainly (e.g. as the main issue, rule 53-54) instead of assuming it.

SCORE

43. Evaluate these five categories independently:

   Experience
   Skills
   Education
   Projects (notable work, in whatever form fits the profession)
   Presentation

44. Each category must receive a score between 0 and 100.

45. EXPERIENCE SCORE:

Evaluate:
- relevance of experience
- clarity of responsibilities
- level of detail
- duration information
- achievements and results
- relationship to the candidate's target profile

Do not excessively penalize junior candidates simply because they have little professional experience.

46. SKILLS SCORE:

Evaluate:
- relevance of the technical/trade skills to the candidate's actual profession
- breadth of technical skills
- presence of soft skills
- clarity
- consistency with the candidate's education and experience
- presence of the sector-specific certifications, carnés or licenses identified per rules 42a-42g (their genuine presence, backed by CV evidence, should raise this score meaningfully; their clear absence — when the profession normally requires or strongly rewards them — is a real gap, not a neutral detail)

Do not reward skills that are not explicitly supported by the CV.

47. EDUCATION SCORE:

Evaluate:
- relevance
- progression
- completeness
- clarity
- consistency of dates
- relevance to the target professional profile

For trades where formal education is not the primary path (e.g. many manual trades learned through apprenticeship or on-the-job experience), do not penalize the candidate for lacking a university-style education if their training/qualifications are appropriate for that trade. Regulated vocational qualifications and official titles identified per rules 42a-42g (e.g. FP Grado Medio/Superior, certificados de profesionalidad) count fully here, on equal footing with university degrees.

48. PROJECTS SCORE (notable work, in whatever form fits the candidate's profession):

Evaluate:
- presence of projects or other describable notable work
- level of detail
- relevance to the candidate's profession
- description quality
- tools/technologies/materials used
- repository, portfolio or demonstration links when present (only when relevant to the profession; their absence must never lower the score for professions where this is not a normal practice)

If the array is empty AND the candidate's experience section already contains no describable notable work either, score low (but not necessarily exactly 0 — judge how much this genuinely limits the CV for that specific profession).

If there is at least one project/notable-work entry, score it based on the criteria above.

49. PRESENTATION SCORE:

Evaluate:
- structure
- readability
- completeness
- consistency
- organization
- professional presentation
- contact information
- links
- clarity of sections

50. OVERALL SCORE:

Calculate the overall score from the five category scores.

Use exactly these weights:

Experience: 25%
Skills: 25%
Education: 15%
Projects: 20%
Presentation: 15%

Formula:

overall =
experience × 0.25 +
skills × 0.25 +
education × 0.15 +
projects × 0.20 +
presentation × 0.15

Round the result to the nearest whole number.

Do not independently choose the overall score.

Do not artificially increase or decrease the score.

The score represents the quality and competitiveness of the CV, NOT the personal worth or potential of the candidate.

50a. CALIBRATION ANCHORS (apply to EACH of the five category scores in 45-49, not only to the overall): this analysis must be strict and serious, avoiding the score inflation that comes from being encouraging by default. Use these anchors:

- 90-100: exceptional, verifiable evidence for that category; uncommon, reserve for CVs that genuinely stand out.
- 70-89: solid evidence with at most a minor gap.
- 50-69: partial evidence, with relevant gaps.
- 30-49: weak evidence, with important gaps.
- 0-29: minimal or nonexistent evidence.

50b. Require CONCRETE evidence to score a category high — the mere presence of a section (e.g. an "experience" or "skills" section existing at all) is not by itself evidence of quality; well-written prose with no concrete substance (no dates, no real responsibilities, no verifiable skills, no sector-specific evidence per 42a-42g when applicable) must not be scored as if it were strong. Never reward polished wording over actual substance.

50c. These calibration anchors do not override the existing protections in this prompt: still do not excessively penalize junior/entry-level candidates for lacking years of experience (45), and still do not penalize candidates in trades where formal education is not the primary path, or where a regulated vocational qualification replaces a university degree (47, 42a-42g).

OVERALL ASSESSMENT

51. Determine the candidate's career level only from evidence available in the CV.

Examples:
- Junior
- Mid-level
- Senior
- Student
- Entry-level
- Aprendiz
- Oficial de 2ª
- Oficial de 1ª
- Encargado/a

Use whichever set of terms is standard for the candidate's actual trade or profession; the list above is illustrative, not exhaustive. Do not assign a senior/top level without sufficient professional experience.

52. Determine the most appropriate professional profile based on the CV. This must match the candidate's real profession, whatever it is.

Examples (illustrative only — use the term that actually fits the CV):
- Desarrollador Web Junior
- Técnico de Sistemas
- Camarero/a
- Fontanero/a
- Electricista
- Albañil
- Cocinero/a
- Auxiliar de enfermería
- Conductor/a de transporte de mercancías

Do not invent a profile unrelated to the CV.

53. Identify the SINGLE most important issue limiting the CV's competitiveness.

54. The main issue must be concrete and useful, and phrased in terms relevant to the candidate's actual profession.

Examples:
- Falta de proyectos o trabajos demostrables
- Experiencia profesional poco relacionada con el puesto objetivo
- Falta de información sobre logros o resultados concretos
- Falta de certificados u homologaciones habituales en el sector
- Falta de idiomas
- Presentación poco clara

55. Assign a priority:

low
medium
high

Use "high" when the issue has a substantial impact on the candidate's ability to demonstrate their profile.

IMPORTANT:

The candidate's career stage must be taken into account.

A junior/entry-level candidate should not receive an artificially low score simply because they do not have years of professional experience.

At the same time, the CV should not receive a high score if important evidence is genuinely missing.

PROFESSIONAL PROFILE

56. This section extracts a structured, occupation-agnostic profile from the CV. It feeds a SEPARATE market-intelligence module that looks up real, current, verifiable Spanish labor-market data — so, unlike the rest of the analysis, do not describe the labor market here at all. Only describe the CANDIDATE, strictly from CV evidence, exactly like every other section.

57. occupation: the specific occupation/trade detected from the CV, in Spanish, as specific as the CV evidence allows (e.g. "Fontanero", "Camarero de sala", "Desarrollador Backend Junior", "Enfermera de UCI", "Auxiliar administrativo"). Never limit yourself to a fixed catalogue: use whatever term best matches the CV, for ANY sector (technology, healthcare, hospitality, administration, logistics, industry, construction, education, agriculture, retail, etc.).

58. relatedOccupations: other occupations the candidate could realistically also apply to given their actual skills/experience. Empty array if none apply.

59. sector / subsector: the economic sector and subsector the candidate's occupation belongs to (e.g. sector "Sanidad", subsector "Cuidados intensivos"; sector "Hostelería", subsector "Restauración"). Leave subsector empty if it cannot be reasonably determined.

60. seniority: the candidate's career stage, using whichever term is standard for their actual trade (see rule 51 examples). Must be consistent with overallAssessment.level.

61. experienceYears: total years of relevant professional experience, estimated only from dates explicitly present in the CV. Use 0 if it cannot be determined.

62. location / region: the city/area and, if identifiable, the Spanish comunidad autónoma stated in the CV (personalInfo.location). Leave both empty if the CV does not state a location — never guess or invent one.

63. profileType: counts how many distinct professional dimensions are ACTUALLY EVIDENCED by the CV's content (not merely how many skills it lists):
   - "single": exactly one professional dimension evidenced (e.g. a CV listing many varied technologies but all in service of one occupation, like a backend developer, is still "single").
   - "hybrid": exactly two clearly distinct professional dimensions evidenced (e.g. "Marketing + análisis de datos").
   - "multi": three or more clearly distinct professional dimensions evidenced.
   Never inflate this count just to reach "hybrid" or "multi" — if the CV is genuinely about a single profession, keep it "single" even if it lists many varied skills or tools.

64. detectedProfiles: an array describing every professional dimension counted in profileType, one entry per dimension. Each entry has:
   - occupation: the specific occupation/trade for that dimension, in Spanish (same style as rule 57).
   - sector: the economic sector for that dimension (same style as rule 59).
   - relevance: "primary" for exactly one entry (the candidate's main/leading profession — its occupation and sector must be identical to the top-level occupation/sector fields above), "secondary" for every additional dimension.
   For profileType "single" this array has exactly one entry (relevance "primary"). For "hybrid" it has exactly two (one primary, one secondary). For "multi" it has three or more (one primary, the rest secondary). Every secondary entry must correspond to a professional dimension genuinely evidenced in the CV's content — never invented merely to inflate the count.

65. keySkills: the 5-15 most relevant skills (technical or trade-specific) for identifying this candidate's market segment, drawn only from skills.technical/soft already extracted.

66. certifications / languages: short labels drawn only from the certifications and skills.languages already extracted (do not invent new ones here).

Return ONLY the JSON structure requested by the schema.
        `
      },

      {
        role: 'user',

        content: `
Analyze the following CV carefully.

Return the complete structured analysis according to the requested schema.

CV:

${cvText}
        `
      }
    ],

    text: {
      format: {
        type: 'json_schema',
        name: 'cv_analysis',
        strict: true,
        schema: cvAnalysisSchema
      }
    }
  })

  const parsed = JSON.parse(response.output_text)

  parsed.score.overall = computeOverallScore(parsed.score)

  parsed.professionalProfile.detectedProfiles = normalizeDetectedProfiles(
    parsed.professionalProfile
  )

  return parsed
}

module.exports = {
  analyzeCV,
  computeOverallScore,
  OVERALL_SCORE_WEIGHTS,
  CV_ANALYSIS_VERSION
}
