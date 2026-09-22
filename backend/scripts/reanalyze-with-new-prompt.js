// @ts-check

require('dotenv').config({ quiet: true })

const pool = require('../src/config/database')

const { analyzeCV, CV_ANALYSIS_VERSION } = require('../src/services/aiService')

const { createCVHash } = require('../src/services/hashService')

/*
 * Los PDFs originales de estos CVs ya no existen (se borran del
 * servidor tras procesarse, ver cvRoutes.js). Pero el JSON
 * `analysis` guardado en cada fila ya contiene TODO lo extraído
 * cuidadosamente del CV original, así que reconstruimos un texto
 * de CV fiel a partir de esos datos YA extraídos (sin resumir ni
 * inventar nada) y lo volvemos a pasar por analyzeCV con el nuevo
 * prompt estricto y sector-aware (Parte 1).
 */
const CV_IDS = [562, 563, 564, 565, 566, 567]

/*
 * Palabras clave de las señales de calidad sectoriales descritas
 * en la sección "SECTOR-SPECIFIC EVIDENCE OF QUALITY" del prompt
 * (aiService.js, reglas 42a-42g). Se usan solo para reportar por
 * consola si el nuevo análisis las nombra explícitamente cuando
 * el análisis anterior no lo hacía — no afectan al análisis en sí.
 */
const SECTOR_SIGNAL_KEYWORDS = [
  'RFESS',
  'Real Federación Española de Salvamento',
  'Técnico en Emergencias Sanitarias',
  'TES',
  'REBT',
  'Instalador Eléctrico Autorizado',
  'Baja Tensión',
  'Tarjeta Profesional de la Construcción',
  'TPC',
  'carnet de carretillero',
  'carné de carretillero',
  'carretillero',
  'Google Analytics',
  'Google Ads',
  'certificado de profesionalidad',
  'colegio profesional'
]

/**
 * Reconstruye un texto de CV en formato plano a partir del JSON
 * `analysis` ya guardado, sin omitir ni inventar información.
 *
 * @param {Record<string, any>} analysis
 * @returns {string}
 */
function rebuildCVText(analysis) {
  const lines = []

  const personalInfo = analysis.personalInfo || {}

  lines.push(`Nombre: ${personalInfo.name || ''}`)
  if (personalInfo.email) lines.push(`Email: ${personalInfo.email}`)
  if (personalInfo.phone) lines.push(`Teléfono: ${personalInfo.phone}`)
  if (personalInfo.location) lines.push(`Ubicación: ${personalInfo.location}`)
  if (personalInfo.linkedin) lines.push(`LinkedIn: ${personalInfo.linkedin}`)
  if (personalInfo.github) lines.push(`GitHub: ${personalInfo.github}`)

  lines.push('')

  if (analysis.summary) {
    lines.push('RESUMEN')
    lines.push(analysis.summary)
    lines.push('')
  }

  if (Array.isArray(analysis.experience) && analysis.experience.length > 0) {
    lines.push('EXPERIENCIA PROFESIONAL')

    for (const exp of analysis.experience) {
      const range = `${exp.startDate || 'Fecha no indicada'} - ${exp.endDate || 'Actualidad'}`
      lines.push(`${exp.position || ''} en ${exp.company || ''} (${range})`)
      if (exp.description) lines.push(exp.description)
      lines.push('')
    }
  }

  if (Array.isArray(analysis.education) && analysis.education.length > 0) {
    lines.push('FORMACIÓN ACADÉMICA')

    for (const edu of analysis.education) {
      const range = `${edu.startDate || ''} - ${edu.endDate || ''}`
      lines.push(`${edu.degree || ''} - ${edu.institution || ''} (${range})`)
    }

    lines.push('')
  }

  const skills = analysis.skills || {}

  if (Array.isArray(skills.technical) && skills.technical.length > 0) {
    lines.push('HABILIDADES TÉCNICAS')
    lines.push(skills.technical.join(', '))
    lines.push('')
  }

  if (Array.isArray(skills.soft) && skills.soft.length > 0) {
    lines.push('HABILIDADES PERSONALES')
    lines.push(skills.soft.join(', '))
    lines.push('')
  }

  if (Array.isArray(skills.languages) && skills.languages.length > 0) {
    lines.push('IDIOMAS')

    for (const lang of skills.languages) {
      lines.push(`${lang.language}${lang.level ? ` - ${lang.level}` : ''}`)
    }

    lines.push('')
  }

  if (Array.isArray(analysis.projects) && analysis.projects.length > 0) {
    lines.push('PROYECTOS / TRABAJOS DESTACADOS')

    for (const project of analysis.projects) {
      lines.push(project.name || '')
      if (project.description) lines.push(project.description)

      if (Array.isArray(project.technologies) && project.technologies.length > 0) {
        lines.push(`Tecnologías/herramientas: ${project.technologies.join(', ')}`)
      }

      lines.push('')
    }
  }

  if (Array.isArray(analysis.certifications) && analysis.certifications.length > 0) {
    lines.push('CERTIFICACIONES Y CURSOS')

    for (const cert of analysis.certifications) {
      const header = [cert.name, cert.platform, cert.date].filter(Boolean).join(' - ')
      lines.push(header)
      if (cert.description) lines.push(cert.description)
    }

    lines.push('')
  }

  return lines.join('\n').trim()
}

/**
 * @param {Record<string, any>} analysis
 * @returns {string[]}
 */
function findSectorSignals(analysis) {
  const haystack = JSON.stringify(analysis).toLowerCase()

  return SECTOR_SIGNAL_KEYWORDS.filter(keyword =>
    haystack.includes(keyword.toLowerCase())
  )
}

async function reanalyzeAll() {
  const { rows } = await pool.query(
    `SELECT id, candidate_name, score, profile, level, analysis
     FROM cv_analyses
     WHERE id = ANY($1)
     ORDER BY id`,
    [CV_IDS]
  )

  for (const row of rows) {
    const oldAnalysis = row.analysis

    const cvText = rebuildCVText(oldAnalysis)

    const newAnalysis = await analyzeCV(cvText)

    const newContentHash = createCVHash(cvText)

    await pool.query(
      `UPDATE cv_analyses
       SET analysis = $1,
           score = $2,
           profile = $3,
           level = $4,
           model_version = $5,
           content_hash = $6
       WHERE id = $7`,
      [
        newAnalysis,
        newAnalysis.score.overall,
        newAnalysis.overallAssessment.profile,
        newAnalysis.overallAssessment.level,
        CV_ANALYSIS_VERSION,
        newContentHash,
        row.id
      ]
    )

    const oldSignals = findSectorSignals(oldAnalysis)
    const newSignals = findSectorSignals(newAnalysis)
    const newlyDetectedSignals = newSignals.filter(
      signal => !oldSignals.includes(signal)
    )

    console.log(`\n=== CV id=${row.id}: ${row.candidate_name || 'sin nombre'} ===`)
    console.log(
      `Profesión: ${row.profile || 'N/D'} → ${newAnalysis.overallAssessment.profile}`
    )
    console.log(`Score: ${row.score} → ${newAnalysis.score.overall}`)
    console.log(
      newlyDetectedSignals.length > 0
        ? `Señales sectoriales nuevas mencionadas explícitamente: ${newlyDetectedSignals.join(', ')}`
        : 'Sin señales sectoriales nuevas detectadas respecto al análisis anterior.'
    )
  }

  console.log(`\nTotal de CVs reanalizados: ${rows.length} de ${CV_IDS.length} solicitados.`)
}

reanalyzeAll()
  .catch(error => {
    console.error('❌ Error reanalizando CVs:', error)
    process.exitCode = 1
  })
  .finally(() => {
    pool.end()
  })
