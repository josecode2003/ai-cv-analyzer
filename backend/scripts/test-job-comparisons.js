// @ts-check

require('dotenv').config({ quiet: true })

const pool = require('../src/config/database')

const {
  compareCVWithJobOffer
} = require('../src/services/jobComparisonService')

const {
  createComparison
} = require('../src/repositories/jobComparisonRepository')

const { createComparisonHash } = require('../src/services/hashService')

const SESSION_ID = 12

/*
 * Ofertas de prueba redactadas a mano (no scrapeadas de ningún
 * sitio real), pensadas para encajar razonablemente con la
 * profesión que detectó el modelo en cada CV TRAS el reanálisis
 * de la Parte 2 (ver reanalyze-with-new-prompt.js). Cada oferta
 * pide, cuando aplica, la señal de calidad sectorial concreta
 * descrita en aiService.js (reglas 42a-42g), para poder observar
 * si la comparación detecta bien su presencia/ausencia en el CV.
 */
const JOB_OFFERS = {
  562: {
    title: 'Desarrollador/a Web Junior',
    text: `
Buscamos Desarrollador/a Web Junior para incorporarse a nuestro equipo de producto en Madrid, en modalidad híbrida.

Funciones: desarrollo y mantenimiento de aplicaciones web, maquetación de interfaces con HTML5, CSS3 y JavaScript, integración con APIs REST, y colaboración en el diseño de bases de datos relacionales (MySQL).

Requisitos:
- Grado Medio o Superior en Desarrollo de Aplicaciones Web/Multiplataforma, o formación equivalente en curso o finalizada.
- Conocimientos de HTML5, CSS3, JavaScript y al menos un framework o librería frontend (Bootstrap, React o similar).
- Nociones de control de versiones con Git/GitHub.
- Se valorará conocimiento de Java, Python o C#, así como de contenedores (Docker) y despliegue en la nube.
- Nivel de inglés técnico para leer documentación (B1 o superior valorado).
- Se valorarán proyectos personales o académicos demostrables (repositorios públicos, aplicaciones propias) por encima de la mera acumulación de cursos.

Ofrecemos contrato de incorporación junior, formación continua y posibilidad de especialización en backend o frontend según el perfil.
    `.trim()
  },

  563: {
    title: 'Socorrista de piscina municipal',
    text: `
El Ayuntamiento, a través de la empresa gestora de sus instalaciones deportivas, precisa incorporar Socorrista Acuático para la piscina municipal cubierta y de verano.

Funciones: vigilancia y prevención de accidentes en el vaso y su entorno, aplicación de protocolos de emergencia y primeros auxilios, control de aforo y normas de uso, y colaboración en el mantenimiento básico de la calidad del agua.

Requisitos imprescindibles:
- Carné de Socorrista Acuático homologado por la Real Federación Española de Salvamento y Socorrismo (RFESS), en vigor.
- Formación en Soporte Vital Básico y manejo de DEA.
- Disponibilidad para trabajar en turnos rotativos, incluidos fines de semana.

Se valorará:
- Titulación de Técnico en Emergencias Sanitarias (TES) o formación sanitaria complementaria.
- Experiencia previa en instalaciones acuáticas o eventos deportivos.
- Idiomas (inglés) para atención a usuarios extranjeros.

Se ofrece contrato temporal con posibilidad de renovación por temporada, salario según convenio de instalaciones deportivas.
    `.trim()
  },

  564: {
    title: 'Electricista de mantenimiento industrial',
    text: `
Empresa del sector industrial ubicada en el sur de Madrid busca Electricista de Mantenimiento para su planta de producción.

Funciones: mantenimiento preventivo y correctivo de instalaciones eléctricas de baja tensión, montaje y conexionado de cuadros eléctricos, diagnóstico y reparación de averías en maquinaria industrial, y elaboración de partes de incidencias.

Requisitos imprescindibles:
- Carné de Instalador Eléctrico Autorizado en Baja Tensión (REBT), en vigor.
- Formación en Prevención de Riesgos Laborales (mínimo 20 horas del convenio del metal o construcción).
- Carnet de conducir B y disponibilidad de vehículo propio para desplazamientos entre plantas.
- Experiencia mínima de 2 años en instalaciones o mantenimiento eléctrico industrial.

Se valorará:
- Tarjeta Profesional de la Construcción (TPC).
- Conocimientos de automatización industrial y cuadros de control.
- Categoría profesional de Oficial de 1ª según convenio.

Se ofrece incorporación estable, jornada completa y salario según convenio del metal, según la categoría acreditada.
    `.trim()
  },

  565: {
    title: 'Mozo/a de almacén con carnet de carretillero',
    text: `
Empresa de distribución y logística en Madrid busca Mozo/a de Almacén Polivalente para su centro logístico.

Funciones: recepción, clasificación y reposición de mercancía, preparación de pedidos, manejo de carretilla elevadora para carga y descarga, control de inventario y uso de sistema de gestión de almacén (WMS) mediante PDA.

Requisitos imprescindibles:
- Carnet de carretillero en vigor.
- Experiencia previa mínima de 1 año en almacén o logística.
- Disponibilidad para trabajar a turnos, incluidos fines de semana en campañas de alta demanda.
- ESO o equivalente.

Se valorará:
- Manejo de aplicaciones ofimáticas (Excel) para control documental.
- Experiencia en atención al cliente en entorno de tienda o almacén.
- Nivel básico de inglés.

Se ofrece contrato estable, jornada completa, e incorporación inmediata, con posibilidad de promoción a encargado/a de turno según desempeño.
    `.trim()
  },

  566: {
    title: 'Socorrista para club deportivo privado',
    text: `
Club deportivo privado con piscina climatizada e instalaciones multideporte busca Socorrista Acuático para cubrir turnos de mañana y tarde durante todo el año.

Funciones: vigilancia activa del vaso de piscina y zonas de baño, aplicación de protocolos de emergencia y rescate acuático, control de aforo, y apoyo puntual en tareas de recepción y gestión de reservas mediante software del club.

Requisitos imprescindibles:
- Carné de Socorrista Acuático homologado por la Real Federación Española de Salvamento y Socorrismo (RFESS), en vigor.
- Formación en primeros auxilios y soporte vital básico.
- Disponibilidad horaria completa, incluidos fines de semana.

Se valorará muy positivamente:
- Conocimientos de informática/sistemas microinformáticos para dar soporte básico en la gestión de reservas y del sistema de control de accesos del club.
- Experiencia previa en instalaciones deportivas o de ocio.
- Carácter proactivo y disposición a asumir tareas variadas dentro del club.

Se ofrece contrato indefinido a jornada completa, con posibilidad de formación interna continuada.
    `.trim()
  },

  567: {
    title: 'Técnico/a Junior de Marketing Digital',
    text: `
Agencia de marketing y publicidad en Madrid busca Técnico/a Junior de Marketing Digital para incorporarse a su equipo de campañas.

Funciones: apoyo en la planificación y ejecución de campañas de publicidad digital, análisis de resultados de campañas mediante herramientas de analítica web, elaboración de informes de rendimiento, y apoyo en la gestión de redes sociales de clientes.

Requisitos imprescindibles:
- Grado Superior en Marketing y Publicidad, o titulación universitaria equivalente.
- Certificación oficial en Google Ads y/o Google Analytics (GA4), o disposición a obtenerla en el primer mes de incorporación.
- Manejo avanzado de paquete Office, especialmente Excel para análisis de datos.
- Nivel de inglés B2 para lectura de documentación y comunicación con proveedores internacionales.

Se valorará:
- Experiencia previa, aunque sea en prácticas, en agencias de marketing o departamentos de marketing.
- Conocimiento de herramientas de gestión de redes sociales y email marketing (Meta Business Suite, Mailchimp, Hootsuite).
- Portfolio de campañas o proyectos académicos con resultados medibles.

Se ofrece contrato de incorporación junior con plan de formación en certificaciones oficiales de Google durante el primer semestre.
    `.trim()
  }
}

async function runComparisons() {
  const ids = Object.keys(JOB_OFFERS).map(Number)

  const { rows } = await pool.query(
    `SELECT id, candidate_name, analysis
     FROM cv_analyses
     WHERE id = ANY($1) AND session_id = $2
     ORDER BY id`,
    [ids, SESSION_ID]
  )

  for (const row of rows) {
    const offer = JOB_OFFERS[row.id]

    const cvAnalysis = row.analysis

    const result = await compareCVWithJobOffer(
      cvAnalysis,
      offer.text,
      offer.title
    )

    const comparisonHash = createComparisonHash(
      cvAnalysis,
      offer.title,
      offer.text
    )

    await createComparison({
      sessionId: SESSION_ID,
      cvAnalysisId: row.id,
      jobTitle: offer.title,
      jobOfferText: offer.text,
      compatibilityScore: result.compatibilityScore,
      result,
      comparisonHash
    })

    console.log(
      `\n=== CV id=${row.id}: ${row.candidate_name || 'sin nombre'} ===`
    )
    console.log(
      `Profesión del CV: ${cvAnalysis.overallAssessment?.profile || 'N/D'}`
    )
    console.log(`Oferta comparada: ${offer.title}`)
    console.log(`Compatibilidad: ${result.compatibilityScore}`)
    console.log(`Resumen: ${result.summary}`)
  }

  console.log(
    `\nTotal de comparaciones realizadas: ${rows.length} de ${ids.length} solicitadas.`
  )
}

runComparisons()
  .catch(error => {
    console.error('❌ Error probando comparaciones con ofertas:', error)
    process.exitCode = 1
  })
  .finally(() => {
    pool.end()
  })
