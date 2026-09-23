# 🤖 AI CV Analyzer

**AI CV Analyzer** es una aplicación web Full Stack desarrollada como proyecto de portfolio después de finalizar mis estudios de **Desarrollo de Aplicaciones Web (DAW)**.

La aplicación utiliza **Inteligencia Artificial** para analizar currículums en formato PDF y ayudar al usuario a conocer mejor su perfil profesional. Además, permite comparar un CV analizado con una oferta de empleo para calcular su nivel de compatibilidad, detectar habilidades que coinciden, identificar carencias y obtener recomendaciones para mejorar la candidatura.

El proyecto nace con una idea sencilla: **utilizar tecnologías que he aprendido durante mi formación para construir una aplicación completa y cercana a un caso de uso real.**

---

## 🎯 ¿Qué hace la aplicación?

El usuario puede, sin necesidad de registrarse ni iniciar sesión:

- Subir su CV en formato PDF, para prácticamente cualquier profesión u oficio (no solo perfiles de oficina/tecnología).
- Analizar el contenido del CV mediante Inteligencia Artificial.
- Obtener información estructurada sobre su perfil profesional (ocupación, sector, subsector, senioridad, ubicación, competencias clave).
- Obtener una evaluación estricta con el **baremo de su propia profesión** (un electricista se mide con criterios de electricista, un médico con los de médico), criterio a criterio y con la cita del CV que lo prueba.
- Consultar una puntuación global calculada por fórmula (no la decide la IA), con topes cuando falta un requisito obligatorio de la profesión.
- Consultar un resumen de la situación del mercado laboral en España, una nota sobre la demanda de su profesión y la noticia más reciente de un periódico.
- Guardar y consultar sus análisis anteriores.
- Eliminar análisis del historial.
- Comparar uno de sus CV con una oferta de empleo.
- Obtener una puntuación de compatibilidad sobre 100.
- Identificar habilidades coincidentes y faltantes.
- Detectar fortalezas y brechas respecto a la oferta.
- Obtener keywords relevantes.
- Recibir recomendaciones para mejorar la candidatura.
- Consultar posteriormente las comparaciones realizadas.

Además, el proyecto incorpora mecanismos de **hashing y reutilización de resultados** para evitar procesamientos y llamadas innecesarias a la API de Inteligencia Artificial, tanto para el análisis del CV como para el análisis de mercado.

---

# ✨ Funcionalidades

## 🔐 Sesiones anónimas

La aplicación no requiere cuentas: no hay registro ni inicio de sesión.

En su lugar, cada visitante recibe una **sesión anónima** la primera vez que accede a la aplicación:

- El backend crea una fila en la tabla `sessions` y la identifica mediante una cookie **httpOnly** y **firmada** (`COOKIE_SECRET`).
- Esa cookie es lo único que vincula un CV, un análisis o una comparación con "quien los creó": nunca se pide nombre, email ni contraseña.
- Mientras la cookie exista, el visitante puede seguir consultando y gestionando sus propios análisis y comparaciones.

Cada sesión únicamente puede acceder a sus propios CV, análisis y comparaciones.

---

## 📄 Análisis de CV

El usuario puede subir un currículum en formato PDF.

El proceso es:

```text
PDF
 ↓
Validación
 ↓
Extracción del texto
 ↓
Limpieza y normalización
 ↓
Generación de hash
 ↓
Comprobación de CV existente
 ↓
1. Detección de la profesión (gpt-4.1-mini) — rechaza (422) PDFs que no son un CV
 ↓
2. Baremo de la profesión (gpt-4.1, generado una vez y guardado en `profession_rubrics`)
 ↓
3. Evaluación criterio a criterio + extracción de datos (gpt-4.1)
 ↓
4. Verificación de citas y cálculo de la nota (código, sin IA)
 ↓
PostgreSQL
 ↓
Resultado
```

### Evaluación estricta por profesión

Cada CV se evalúa con dos tipos de criterios:

- **16 criterios genéricos**, definidos en código e iguales para todos (fechas en cada puesto, logros cuantificados, datos de contacto, estructura, ortografía…).
- **6–12 criterios de su profesión** (el _baremo_), que genera el modelo **una sola vez por profesión** y se guarda en la base de datos. Así todos los electricistas se miden con exactamente el mismo baremo: el carné de instalador REBT, la titulación de FP de electricidad, la lectura de planos, etc. El baremo marca como **obligatorio** solo lo que la ley exige para ejercer (título de socorrista, colegiación médica, carné REBT…) y acepta el FP como vía válida cuando lo es en España.

El modelo solo dictamina cada criterio (**cumple / parcial / no cumple**) y aporta una **cita literal del CV** como prueba. La nota la calcula `scoringService` con una fórmula fija:

- Cada categoría = media ponderada de sus criterios (cumple = 1, parcial = 0,5, no cumple = 0; pesos 3 = esencial, 2 = importante, 1 = complemento).
- Global = Experiencia 30 % + Habilidades 25 % + Formación reglada 15 % + Cursos y certificaciones 15 % + Presentación 15 %.
- **Verificación de citas**: si la cita no aparece literalmente en el CV, el dictamen baja un escalón (la IA no puede "dar por hecho" algo que el CV no dice).
- **Topes**: si falta un requisito obligatorio, la nota global no puede pasar de 55 (ni de 40 la categoría afectada); si solo está parcialmente acreditado, de 70.

Resultado: la nota es coherente entre CVs de la misma profesión y prácticamente reproducible para el mismo CV (en pruebas con CVs reales, ±2 puntos entre ejecuciones).

El resultado se guarda en PostgreSQL para poder consultarlo posteriormente.

---

## ♻️ Detección de CV duplicados

Para evitar procesamientos innecesarios, la aplicación genera una huella basada en el contenido limpio del CV, **no en el nombre del archivo**: `CV_Manu.pdf` y `curriculum_final.pdf` se consideran el mismo CV si su contenido relevante es idéntico.

```text
CV
 ↓
Extracción del texto
 ↓
Limpieza y normalización
 ↓
Hash SHA-256
 ↓
¿Existe (de cualquier sesión, misma versión de modelo)?
 ├── Sí → Reutilizar análisis existente
 └── No → Analizar mediante IA
```

El caché es **global**, no por sesión: si dos visitantes distintos suben exactamente el mismo CV, el segundo reutiliza el análisis del primero en vez de pagar una segunda llamada a OpenAI (cada uno conserva igualmente su propia fila en su historial, para poder listarlo/borrarlo de forma independiente). Cada análisis guarda además la versión del modelo/prompt (`model_version`) con la que se generó, así que un cambio de prompt no sirve por error un resultado calculado con las reglas antiguas.

Esto permite:

- Reducir llamadas a OpenAI.
- Reducir costes.
- Evitar procesamiento duplicado.
- Mejorar el tiempo de respuesta.

---

## 🧭 Detección de perfil profesional

La aplicación no está limitada a perfiles de oficina o tecnología: analiza CVs de prácticamente cualquier profesión u oficio (sanidad, hostelería, administración, logística, industria, construcción, educación, etc.), sin ninguna lista cerrada de profesiones en el código.

De cada CV se extrae un `professionalProfile` estructurado y genérico:

- Ocupación y ocupaciones relacionadas.
- Sector y subsector.
- Senioridad y años de experiencia.
- Ubicación (solo si el CV la indica; nunca se inventa).
- Competencias clave, certificaciones e idiomas.
- Tipo de perfil: `single` o `hybrid` (para perfiles que combinan dos disciplinas, p. ej. "Marketing + análisis de datos").

Este perfil es la única entrada del módulo de **Inteligencia de mercado laboral** (ver siguiente sección): el análisis de mercado nunca vuelve a leer el CV original, solo este perfil ya extraído.

---

## 📊 Inteligencia de mercado laboral en España

Además del análisis del propio CV, la aplicación muestra la **situación del mercado laboral**, en dos bloques independientes y **sin listas de fuentes ni enlaces**, salvo uno: la noticia más reciente de un periódico.

```text
Resumen general de España (uno al día, compartido por todos los usuarios)
 ├── ¿Existe el de hoy en `labor_market_snapshots`? → Reutilizar
 └── No → web_search (INE/EPA, afiliación, paro registrado, noticias)
          ↓
        Cifras clave: se descarga la página citada y solo se publican
        las que esa página respalda (claimVerificationService)
          ↓
        Noticia: la más reciente de un periódico español reconocido
        (lista blanca de dominios), con fecha de los últimos 45 días y
        URL comprobada; si no hay ninguna válida, búsqueda dedicada
          ↓
        Si todo falla → último resumen de los 7 días anteriores

Nota de la profesión (2-3 frases + habilidades más demandadas)
 └── Cacheada 30 días por profesión en `market_analyses`
```

Puntos clave del diseño:

- **Desacoplado del análisis del CV**: el mercado se calcula a partir de la profesión ya detectada, nunca reprocesa el PDF.
- **Coste acotado**: el resumen general se genera como mucho una vez al día y la nota de cada profesión una vez al mes, sin importar cuántos CVs se analicen.
- **Sin cifras inventadas**: el resumen y los puntos clave no pueden llevar cifras; las cifras clave solo se muestran si la página de la que salen las respalda.
- **Resiliente a fallos externos**: cada bloque se resuelve por separado; si uno falla, se muestra el otro. Si fallan los dos, el endpoint responde `available: false` con un mensaje claro.
- **Versionado independiente**: `MARKET_DATA_VERSION` (variable de entorno) invalida las cachés de mercado sin tocar ningún CV.

> **Decisión de arquitectura documentada:** esta versión usa la herramienta de búsqueda web integrada en la API de OpenAI (Responses API, `tools: [{ type: 'web_search' }]`) como fuente de datos en tiempo real, en vez de integrar directamente las APIs estadísticas oficiales (SEPE/INE/Eurostat no ofrecen una API REST simple de "dame la demanda actual de la profesión X"; integrarlas de forma robusta sería un proyecto en sí mismo). Es la vía más razonable, dentro del alcance de esta iteración, para cumplir la regla de "no inventar datos" citando fuente y fecha reales. Migrar a datasets oficiales descargados/indexados es una mejora futura natural, sin cambiar el resto de la arquitectura.

# 🎯 Comparación entre CV y oferta de empleo

Una de las funcionalidades principales de la aplicación es la posibilidad de comparar un CV previamente analizado con una oferta de empleo.

El usuario introduce:

- Título del puesto.
- Texto de la oferta.

La aplicación utiliza el análisis almacenado del CV y procesa la oferta mediante IA.

El resultado incluye:

### 📊 Compatibilidad

Una puntuación de compatibilidad sobre 100.

### ✅ Habilidades coincidentes

Tecnologías, conocimientos o habilidades que aparecen tanto en el perfil como en la oferta.

### ⚠️ Habilidades faltantes

Requisitos de la oferta que no aparecen explícitamente en el CV analizado.

### 💪 Fortalezas

Aspectos del perfil que pueden favorecer al candidato.

### 📌 Brechas

Aspectos que pueden reducir la compatibilidad con el puesto.

### 🔑 Keywords

Palabras y términos relevantes detectados en la oferta.

### 🚀 Recomendaciones

Sugerencias para mejorar la candidatura en función de los requisitos del puesto.

---

## ♻️ Caché de comparaciones

Las comparaciones también utilizan hashing para evitar repetir análisis idénticos.

La huella se genera utilizando:

```text
CV + título de la oferta + contenido de la oferta
```

Después se comprueba si existe una comparación anterior para ese usuario.

```text
Comparación
     ↓
Hash
     ↓
¿Existe?
 ├── Sí → Recuperar resultado
 └── No → OpenAI API
              ↓
          Guardar resultado
```

De esta forma se reducen las llamadas innecesarias a la API.

---

# 🛡️ Seguridad

Durante el desarrollo también se han tenido en cuenta diferentes aspectos de seguridad.

El proyecto incorpora:

- Sesiones anónimas mediante cookie **httpOnly** y **firmada** (`COOKIE_SECRET`), sin contraseñas que proteger.
- Protección de endpoints privados.
- Helmet.
- Configuración de CORS con `credentials: true` restringida al origen del frontend.
- Rate limiting.
- Validación de entradas.
- Validación del tipo de archivo.
- Límite máximo de **5 MB por CV**.
- Límites de tamaño para las peticiones.
- Control de acceso mediante la sesión anónima del visitante.
- Comprobación de propiedad de los recursos.
- Variables sensibles mediante `.env`.
- Exclusión de `.env` mediante `.gitignore`.
- Eliminación de archivos PDF temporales después de su procesamiento: el PDF original nunca se conserva, solo el resultado estructurado del análisis.
- Minimización de datos en el Market Analysis: la tabla `market_analyses` no almacena ningún dato personal del CV (ni nombre, ni email, ni el propio texto del currículum), solo el perfil profesional agregado (ocupación/sector/ubicación) y el informe de mercado, que es información pública sobre el mercado laboral, no sobre la persona.
- Timeouts explícitos (60-90 s) en las llamadas con búsqueda web, para que una fuente externa lenta no bloquee la petición del usuario.
- La única URL externa que se muestra al usuario (la noticia) debe pertenecer a una lista blanca de periódicos españoles, usar http(s) y existir de verdad.

Las credenciales y claves privadas no forman parte del repositorio.

**Nota RGPD:** la aplicación aplica buenas prácticas técnicas de privacidad (sesiones anónimas, minimización de datos, no persistencia del PDF), pero esto **no constituye una auditoría legal**. Antes de un uso en producción con usuarios reales conviene una revisión de cumplimiento RGPD por una persona cualificada, especialmente en torno a la base legal de tratamiento y el tiempo de retención de `cv_analyses`.

---

# 🧰 Tecnologías utilizadas

## Frontend

- **Vue.js**
- **Vue Router**
- **Vite**
- JavaScript
- HTML5
- CSS3

## Backend

- **Node.js**
- **Express.js**
- API REST
- Sesiones anónimas mediante cookies firmadas (`cookie-parser`)
- Multer
- Helmet
- CORS
- Express Rate Limit

## Base de datos

- **PostgreSQL**

## Inteligencia Artificial

- **OpenAI API** (Responses API, salida estructurada con `json_schema` en modo `strict`)
- `gpt-4.1`: baremo de cada profesión, evaluación del CV, mercado laboral y comparación con ofertas
- `gpt-4.1-mini`: detección de la profesión (paso rápido y barato)
- Salidas estructuradas (`json_schema` en modo `strict`) y `temperature: 0` en todas las llamadas
- Herramienta `web_search` nativa de la API, usada exclusivamente por el mercado laboral

## Procesamiento de documentos

- PDF parsing
- Extracción de texto
- Limpieza y normalización
- Hashing de contenido

---

# 🏗️ Arquitectura

El proyecto está dividido en un frontend desarrollado con Vue y un backend desarrollado con Node.js y Express.

```text
ai-cv-analyzer/
│
├── backend/
│   ├── migrations/
│   │   └── 001_...  →  008_add_rubrics_and_market_snapshots.js
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── versions.js
│   │   ├── middleware/
│   │   ├── repositories/
│   │   │   ├── cvAnalysisRepository.js
│   │   │   ├── jobComparisonRepository.js
│   │   │   ├── laborMarketRepository.js
│   │   │   ├── marketAnalysisRepository.js
│   │   │   ├── professionRubricRepository.js
│   │   │   └── sessionRepository.js
│   │   ├── routes/
│   │   │   ├── cvRoutes.js
│   │   │   ├── jobComparisonRoutes.js
│   │   │   └── marketRoutes.js
│   │   ├── services/
│   │   │   ├── aiService.js            (pipeline de análisis del CV)
│   │   │   ├── rubricService.js        (profesión + baremo por profesión)
│   │   │   ├── scoringService.js       (nota determinista y verificación de citas)
│   │   │   ├── marketAnalysisService.js
│   │   │   ├── jobComparisonService.js
│   │   │   ├── hashService.js
│   │   │   ├── pdfService.js
│   │   │   └── textService.js
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   └── package.json
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── analysis/
│   │   │   ├── AnalysisDetail.vue
│   │   │   ├── CriteriaBoard.vue       (baremo de la profesión)
│   │   │   ├── MarketAnalysis.vue
│   │   │   ├── ScoreGauge.vue
│   │   │   └── ScoreMeter.vue
│   │   ├── cv/
│   │   │   ├── AnalyzingProgress.vue
│   │   │   └── CVUploader.vue
│   │   ├── icons/
│   │   └── ui/                         (ThemeToggle, ConfirmDialog)
│   │
│   ├── layouts/
│   │   └── AppLayout.vue
│   │
│   ├── router/
│   │   └── index.js
│   │
│   ├── stores/
│   │   └── session.js
│   │
│   ├── views/
│   │   ├── HomeView.vue
│   │   ├── AnalysesView.vue
│   │   ├── AnalysisView.vue
│   │   ├── ComparisonFormView.vue
│   │   ├── ComparisonResultView.vue
│   │   └── ComparisonsView.vue
│   │
│   ├── services/
│   │   ├── api.js
│   │   ├── cvService.js
│   │   ├── analysisService.js
│   │   ├── marketService.js
│   │   └── comparisonService.js
│   │
│   ├── utils/
│   │   ├── format.js
│   │   └── theme.js
│   │
│   ├── App.vue
│   ├── app.css
│   └── main.js
│
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

La comunicación entre las diferentes partes sigue una arquitectura cliente-servidor:

```text
┌──────────────────────┐
│      Vue.js          │
│      Frontend        │
└──────────┬───────────┘
           │
           │ HTTP / REST
           ▼
┌──────────────────────┐
│    Node + Express    │
│       Backend        │
└──────────┬───────────┘
           │
       ┌───┴───────────┐
       │               │
       ▼               ▼
┌──────────────┐ ┌──────────────┐
│  PostgreSQL  │ │  OpenAI API  │
│              │ │              │
│ Sesiones     │ │ CV Analysis  │
│ CVs          │ │ Matching     │
│ Comparaciones│ │              │
└──────────────┘ └──────────────┘
```

---

# 🔄 Flujo completo de la aplicación

## Análisis de CV

```text
Usuario
   │
   ▼
Sube CV
   │
   ▼
Validación del PDF
   │
   ▼
Extracción del texto
   │
   ▼
Limpieza del contenido
   │
   ▼
Generación del hash
   │
   ├─────────────── CV existente
   │                       │
   │                       ▼
   │                Recuperar resultado
   │
   └─────────────── CV nuevo
                           │
                           ▼
                      OpenAI API
                           │
                           ▼
                   Análisis estructurado
                           │
                           ▼
                       PostgreSQL
                           │
                           ▼
                    Resultado al usuario
```

## Comparación con oferta

```text
CV analizado
     │
     ▼
Seleccionar CV
     │
     ▼
Introducir oferta
     │
     ▼
Generar hash
     │
     ├──────────── Comparación existente
     │                         │
     │                         ▼
     │                  Recuperar resultado
     │
     └──────────── Comparación nueva
                               │
                               ▼
                          OpenAI API
                               │
                               ▼
                    Análisis de compatibilidad
                               │
                               ▼
                           PostgreSQL
                               │
                               ▼
                            Resultado
```

---

# 🔌 API REST

No hay endpoints de autenticación: la sesión anónima se crea automáticamente (vía cookie) en la primera petición de cada visitante.

## CV

```http
POST   /api/cv
GET    /api/cv
GET    /api/cv/:id
DELETE /api/cv/:id
```

## Mercado laboral

```http
POST /api/cv/:id/market-analysis
```

Devuelve el resumen general del mercado laboral en España (`general`, con la noticia más reciente en `general.news`) y la nota de demanda de la profesión del CV `:id` (`profession`). Cualquiera de los dos puede ser `null` si no está disponible. Nunca reprocesa el CV. Devuelve `available: false` con un mensaje claro, en vez de un error, cuando no se puede obtener ninguno de los dos.

## Comparaciones

```http
POST   /api/cv/:id/compare
GET    /api/comparisons
GET    /api/comparisons/:id
DELETE /api/comparisons/:id
```

## Health Check

```http
GET /api/health
```

---

# ⚙️ Instalación

## Requisitos

Para ejecutar el proyecto necesitas:

- Node.js
- npm
- PostgreSQL
- Una API Key de OpenAI
- Git

---

## 1. Clonar el repositorio

```bash
git clone https://github.com/josecode2003/ai-cv-analyzer.git
cd ai-cv-analyzer
```

---

## 2. Instalar dependencias del frontend

Desde la raíz del proyecto:

```bash
npm install
```

---

## 3. Instalar dependencias del backend

Abre otra terminal y ejecuta:

```bash
cd backend
npm install
```

---

# 🔑 Variables de entorno

## Backend

El backend utiliza variables de entorno para almacenar la configuración y las credenciales sensibles.

Dentro de `backend/` crea un archivo `.env` usando `backend/.env.example` como referencia:

```env
# OpenAI
OPENAI_API_KEY=tu_api_key

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_cv_analyzer
DB_USER=postgres
DB_PASSWORD=tu_password

# Session cookie (no login/register: identifica sesiones anónimas)
COOKIE_SECRET=una_cadena_aleatoria_larga

# Application
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173

# Market Analysis (opcional)
# Cambiar este valor invalida la caché de mercado (fuerza a
# volver a consultar fuentes externas) sin reprocesar ningún CV.
MARKET_DATA_VERSION=2026-09-market-v1
```

## Frontend

En la raíz del proyecto crea un archivo `.env` usando `.env.example` como referencia:

```env
VITE_API_URL=http://localhost:3000/api
```

**Nunca debes subir ningún archivo `.env` a GitHub.**

El proyecto incluye `.gitignore` para evitar que las credenciales se incorporen accidentalmente al repositorio.

---

# 🗃️ Migraciones de la base de datos

El esquema de la base de datos vive en `backend/migrations/`, como una serie de migraciones numeradas (`001_...`, `002_...`, ...) que se aplican en orden. Cada migración se registra en una tabla `schema_migrations` para no volver a aplicarse dos veces.

Con PostgreSQL en marcha y `backend/.env` configurado, ejecuta desde `backend/`:

```bash
npm run migrate
```

Esto crea la base de datos (si no existe todavía), las tablas (`sessions`, `cv_analyses`, `job_comparisons`, `market_analyses`) y las columnas de hash/versión usadas para el sistema de caché.

Este paso es obligatorio antes de arrancar el backend por primera vez.

Si necesitas añadir un cambio de esquema en el futuro, crea un nuevo archivo en `backend/migrations/` siguiendo la numeración (`008_...`), exportando `{ version, up }`.

---

# ▶️ Ejecutar el proyecto

## Backend

Desde la carpeta `backend/`:

```bash
npm start
```

El backend estará disponible normalmente en:

```text
http://localhost:3000
```

## Frontend

Desde la raíz del proyecto:

```bash
npm run dev
```

Vite mostrará la dirección local de la aplicación, normalmente:

```text
http://localhost:5173
```

---

# ✅ Calidad de código

El proyecto usa **ESLint** y **Prettier** tanto en el frontend como en el backend, y una suite de **Jest** con 120 tests en el backend (incluye acceso sin login, subida sin cuenta, caché por hash entre sesiones, aislamiento entre sesiones, detección de perfil en 6 sectores distintos, perfiles híbridos, cálculo determinista de la nota, verificación de citas, topes por requisitos obligatorios, rechazo de PDFs que no son CV, selección y validación de la noticia, y caché y fallos del mercado laboral).

Desde la raíz (frontend) o desde `backend/` (backend):

```bash
npm run lint          # comprobar estilo y errores
npm run format:check  # comprobar formato
npm run format        # aplicar formato automáticamente
```

Desde `backend/`:

```bash
npm test              # ejecutar la suite de tests
npm run typecheck     # comprobar tipos (JSDoc + TypeScript, sin compilar)
```

El backend usa JSDoc con comprobación de tipos opcional por archivo
(`// @ts-check`) en los módulos principales (servicios, repositorios,
middleware de sesión), verificada por `tsc` en modo `--noEmit`
a través de `jsconfig.json`. No hay paso de compilación: el código
sigue siendo JavaScript puro, los tipos solo se comprueban en
desarrollo/CI.

Estas comprobaciones se ejecutan automáticamente en cada push/PR mediante GitHub Actions (`.github/workflows/ci.yml`).

---

# 🗄️ Base de datos

La aplicación utiliza **PostgreSQL** para almacenar la información necesaria para el funcionamiento de la plataforma.

Entre los datos almacenados se encuentran:

- Sesiones anónimas.
- Análisis de CV (incluye el perfil profesional estructurado).
- Resultados de análisis.
- Comparaciones.
- Resultados de comparaciones.
- Análisis de mercado laboral (`market_analyses`), sin ningún dato personal.
- Hashes y versiones utilizados para evitar procesamiento duplicado.

El acceso a la base de datos se realiza desde el backend.

---

# 🤖 Inteligencia Artificial

La aplicación utiliza la **OpenAI API** para tres procesos independientes, cada uno con su propio modelo/prompt y su propia caché.

### Análisis de currículums

El texto extraído del PDF se procesa para obtener una estructura de información relacionada con:

- Información personal.
- Perfil profesional estructurado (ocupación, sector, subsector, senioridad, ubicación, competencias).
- Experiencia.
- Formación.
- Habilidades.
- Nivel profesional.
- Evaluación general.
- Puntuación (con `temperature: 0` para maximizar la reproducibilidad).

### Análisis de mercado laboral

A partir del perfil profesional ya extraído (nunca del CV original), se consulta la web mediante la herramienta `web_search` de la API, priorizando fuentes oficiales españolas, para generar un informe con demanda, salario, tendencias, sectores, puestos relacionados, competencias demandadas, distribución geográfica y fuentes citadas con fecha. Ver la sección [📊 Inteligencia de mercado laboral en España](#-inteligencia-de-mercado-laboral-en-españa) para el detalle completo de las reglas anti-alucinación.

### Comparación con ofertas

El análisis previamente almacenado del CV se utiliza junto con el texto de una oferta para generar:

- Puntuación de compatibilidad.
- Habilidades coincidentes.
- Habilidades faltantes.
- Fortalezas.
- Brechas.
- Keywords.
- Recomendaciones.

Los resultados se almacenan en PostgreSQL para poder consultarlos posteriormente.

---

# 💰 Optimización de costes

Uno de los aspectos que quise trabajar durante el desarrollo fue evitar llamadas innecesarias a la API de Inteligencia Artificial.

Para ello se implementaron mecanismos de hashing tanto para los CV como para las comparaciones.

### CV

```text
CV
 ↓
Limpiar texto
 ↓
Generar hash
 ↓
Comprobar existencia
```

### Comparación

```text
CV + título + oferta
 ↓
Generar hash
 ↓
Comprobar existencia
```

Cuando existe un resultado anterior, se recupera desde PostgreSQL en lugar de volver a procesarlo mediante IA.

Esto permite:

- Reducir consumo de API.
- Reducir costes.
- Evitar procesamiento duplicado.
- Mejorar el rendimiento.

---

# 📱 Interfaz

La aplicación cuenta con diferentes vistas, accesibles sin necesidad de crear una cuenta:

- 🏠 Inicio (subida de CV).
- 🔎 Detalle de análisis: puntuación, perfil detectado, fortalezas/debilidades y situación del mercado laboral.
- 📊 Historial de análisis.
- 🎯 Formulario de comparación.
- 📈 Resultado de compatibilidad.
- 🗂️ Historial de comparaciones.

La interfaz está diseñada para mantener un flujo sencillo, con mensajes de estado claros durante el procesamiento (p. ej. "Identificando tu perfil profesional...", "Analizando el mercado laboral de tu sector en España...") en vez de detalles técnicos:

```text
Inicio
  ↓
Subir CV
  ↓
Análisis (navegación automática al resultado)
  ↓
Puntuación + perfil detectado
  ↓
Situación del mercado laboral
  ↓
Comparar con oferta (opcional)
  ↓
Historial
```

---

# 📸 Capturas

Las capturas de la aplicación pueden incorporarse posteriormente en esta sección para mostrar visualmente las principales funcionalidades.

Ejemplos:

```text
docs/
└── screenshots/
    ├── home.png
    ├── analysis.png
    ├── comparison.png
    └── comparison-result.png
```

---

# 🎓 Objetivo y aprendizaje

Este proyecto ha sido desarrollado como parte de mi portfolio después de finalizar el **Grado Superior en Desarrollo de Aplicaciones Web**.

El objetivo principal no era únicamente crear una aplicación que funcionase, sino poner en práctica diferentes conocimientos adquiridos durante mi formación y combinarlos en un proyecto Full Stack completo.

Durante el desarrollo he trabajado con:

- Desarrollo de interfaces con Vue.js.
- Componentización.
- Enrutado con Vue Router.
- Comunicación mediante APIs REST.
- Desarrollo backend con Node.js y Express.
- Diseño de sesiones anónimas mediante cookies firmadas.
- PostgreSQL.
- Persistencia de información.
- Procesamiento de archivos PDF.
- Integración con APIs externas.
- Integración de Inteligencia Artificial.
- Validación de datos.
- Gestión de errores.
- Seguridad básica de aplicaciones web.
- Hashing, versionado y reutilización de resultados (caché global, no solo por usuario).
- Diseño de sistemas de IA verificables: separar "dato con fuente" de "interpretación" o "estimación" en el propio schema, no solo en el prompt.
- Arquitectura basada en servicios y repositorios, con procesos desacoplados (CV Analysis vs. Market Analysis) para poder evolucionar cada uno de forma independiente.
- Git y GitHub.

Uno de los principales aprendizajes del proyecto ha sido entender cómo conectar todas estas piezas para construir una aplicación que no se limite a una interfaz, sino que tenga **frontend, backend, base de datos, gestión de sesiones, procesamiento de información e integración con servicios externos**.

---

# 🚀 Posibles mejoras futuras

La versión actual cubre el alcance planteado para el proyecto.

Como posibles ampliaciones futuras podrían incorporarse:

- Integrar directamente datasets/APIs estadísticas oficiales (INE, SEPE) además de la búsqueda web, para el Market Analysis.
- Restringir el `web_search` del Market Analysis a una lista de dominios permitidos (`filters.allowed_domains`), para sesgar aún más hacia fuentes oficiales.
- Generación automática de CV optimizados.
- Exportación de análisis a PDF.
- Generación de cartas de presentación.
- Dashboard con estadísticas.
- Comparación con múltiples ofertas simultáneamente.
- Sistema de favoritos.
- Tests E2E de interfaz (Playwright/Cypress).
- Despliegue de la aplicación en producción.

Estas funcionalidades quedan fuera del alcance de la versión actual.

---

# 👨‍💻 Autor

**Manu**

Desarrollador Web / Full Stack Junior.

Proyecto desarrollado como parte de mi portfolio tras finalizar el **Grado Superior en Desarrollo de Aplicaciones Web (DAW)**.

GitHub:

**https://github.com/josecode2003**

Repositorio:

**https://github.com/josecode2003/ai-cv-analyzer**

---

# 📄 Licencia

Este proyecto se publica con fines educativos y de portfolio.
