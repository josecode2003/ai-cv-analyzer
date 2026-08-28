# 🤖 AI CV Analyzer

**AI CV Analyzer** es una aplicación web Full Stack desarrollada como proyecto de portfolio después de finalizar mis estudios de **Desarrollo de Aplicaciones Web (DAW)**.

La aplicación utiliza **Inteligencia Artificial** para analizar currículums en formato PDF y ayudar al usuario a conocer mejor su perfil profesional. Además, permite comparar un CV analizado con una oferta de empleo para calcular su nivel de compatibilidad, detectar habilidades que coinciden, identificar carencias y obtener recomendaciones para mejorar la candidatura.

El proyecto nace con una idea sencilla: **utilizar tecnologías que he aprendido durante mi formación para construir una aplicación completa y cercana a un caso de uso real.**

---

## 🎯 ¿Qué hace la aplicación?

El usuario puede:

* Crear una cuenta e iniciar sesión.
* Subir su CV en formato PDF.
* Analizar el contenido del CV mediante Inteligencia Artificial.
* Obtener información estructurada sobre su perfil profesional.
* Consultar una puntuación global del CV.
* Guardar y consultar sus análisis anteriores.
* Eliminar análisis del historial.
* Comparar uno de sus CV con una oferta de empleo.
* Obtener una puntuación de compatibilidad sobre 100.
* Identificar habilidades coincidentes y faltantes.
* Detectar fortalezas y brechas respecto a la oferta.
* Obtener keywords relevantes.
* Recibir recomendaciones para mejorar la candidatura.
* Consultar posteriormente las comparaciones realizadas.

Además, el proyecto incorpora mecanismos de **hashing y reutilización de resultados** para evitar procesamientos y llamadas innecesarias a la API de Inteligencia Artificial.

---

# ✨ Funcionalidades

## 🔐 Autenticación

El sistema cuenta con un sistema de autenticación basado en JWT.

Incluye:

* Registro de usuarios.
* Inicio de sesión.
* Recuperación de sesión.
* Consulta del usuario autenticado.
* Cierre de sesión.
* Protección de endpoints privados.
* Rate limiting en las operaciones de autenticación.

Cada usuario únicamente puede acceder a sus propios CV, análisis y comparaciones.

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
OpenAI API
 ↓
Análisis estructurado
 ↓
PostgreSQL
 ↓
Resultado
```

El análisis permite obtener información como:

* Datos personales.
* Perfil profesional.
* Nivel profesional.
* Experiencia.
* Formación.
* Habilidades.
* Evaluación general.
* Puntuación del CV.

El resultado se guarda en PostgreSQL para poder consultarlo posteriormente.

---

## ♻️ Detección de CV duplicados

Para evitar procesamientos innecesarios, la aplicación genera una huella basada en el contenido limpio del CV.

```text
CV
 ↓
Texto limpio
 ↓
Hash
 ↓
¿Existe?
 ├── Sí → Recuperar análisis existente
 └── No → Analizar mediante IA
```

Si el usuario vuelve a subir exactamente el mismo contenido, la aplicación puede recuperar el análisis existente en lugar de volver a consumir la API de IA.

Esto permite:

* Reducir llamadas a OpenAI.
* Reducir costes.
* Evitar procesamiento duplicado.
* Mejorar el tiempo de respuesta.

---

# 🎯 Comparación entre CV y oferta de empleo

Una de las funcionalidades principales de la aplicación es la posibilidad de comparar un CV previamente analizado con una oferta de empleo.

El usuario introduce:

* Título del puesto.
* Texto de la oferta.

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

* Autenticación mediante JWT.
* Protección de endpoints privados.
* Helmet.
* Configuración de CORS.
* Rate limiting.
* Validación de entradas.
* Validación del tipo de archivo.
* Límite máximo de **5 MB por CV**.
* Límites de tamaño para las peticiones.
* Control de acceso mediante el usuario autenticado.
* Comprobación de propiedad de los recursos.
* Variables sensibles mediante `.env`.
* Exclusión de `.env` mediante `.gitignore`.
* Eliminación de archivos PDF temporales después de su procesamiento.

Las credenciales y claves privadas no forman parte del repositorio.

---

# 🧰 Tecnologías utilizadas

## Frontend

* **Vue.js**
* **Vite**
* JavaScript
* HTML5
* CSS3

## Backend

* **Node.js**
* **Express.js**
* API REST
* JWT
* Multer
* Helmet
* CORS
* Express Rate Limit

## Base de datos

* **PostgreSQL**

## Inteligencia Artificial

* **OpenAI API**
* Modelo `gpt-5.6-luna`

## Procesamiento de documentos

* PDF parsing
* Extracción de texto
* Limpieza y normalización
* Hashing de contenido

---

# 🏗️ Arquitectura

El proyecto está dividido en un frontend desarrollado con Vue y un backend desarrollado con Node.js y Express.

```text
ai-cv-analyzer/
│
├── backend/
│   ├── middleware/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   ├── app.js
│   ├── server.js
│   └── package.json
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── analysis/
│   │   ├── auth/
│   │   └── cv/
│   │
│   ├── services/
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── cvService.js
│   │   ├── analysisService.js
│   │   └── comparisonService.js
│   │
│   ├── App.vue
│   └── style.css
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
│ Usuarios     │ │ CV Analysis  │
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

## Autenticación

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

## CV

```http
POST   /api/cv
GET    /api/cv
GET    /api/cv/:id
DELETE /api/cv/:id
```

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

* Node.js
* npm
* PostgreSQL
* Una API Key de OpenAI
* Git

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

El backend utiliza variables de entorno para almacenar la configuración y las credenciales sensibles.

Dentro de `backend/` crea un archivo:

```text
.env
```

Puedes utilizar `.env.example` como referencia.

Ejemplo:

```env
OPENAI_API_KEY=tu_api_key
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
NODE_ENV=development
```

**Nunca debes subir tu archivo `.env` a GitHub.**

El proyecto incluye `.gitignore` para evitar que las credenciales se incorporen accidentalmente al repositorio.

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

---

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

# 🗄️ Base de datos

La aplicación utiliza **PostgreSQL** para almacenar la información necesaria para el funcionamiento de la plataforma.

Entre los datos almacenados se encuentran:

* Usuarios.
* Análisis de CV.
* Resultados de análisis.
* Comparaciones.
* Resultados de comparaciones.
* Hashes utilizados para evitar procesamiento duplicado.

El acceso a la base de datos se realiza desde el backend.

---

# 🤖 Inteligencia Artificial

La aplicación utiliza la **OpenAI API** para realizar dos procesos principales.

### Análisis de currículums

El texto extraído del PDF se procesa para obtener una estructura de información relacionada con:

* Información personal.
* Perfil profesional.
* Experiencia.
* Formación.
* Habilidades.
* Nivel profesional.
* Evaluación general.
* Puntuación.

### Comparación con ofertas

El análisis previamente almacenado del CV se utiliza junto con el texto de una oferta para generar:

* Puntuación de compatibilidad.
* Habilidades coincidentes.
* Habilidades faltantes.
* Fortalezas.
* Brechas.
* Keywords.
* Recomendaciones.

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

* Reducir consumo de API.
* Reducir costes.
* Evitar procesamiento duplicado.
* Mejorar el rendimiento.

---

# 📱 Interfaz

La aplicación cuenta con diferentes vistas:

* 🔐 Login.
* 📝 Registro.
* 🏠 Inicio.
* 📄 Subida de CV.
* 📊 Historial de análisis.
* 🔎 Detalle de análisis.
* 🎯 Formulario de comparación.
* 📈 Resultado de compatibilidad.
* 🗂️ Historial de comparaciones.

La interfaz está diseñada para mantener un flujo sencillo:

```text
Login
  ↓
Inicio
  ↓
Subir CV
  ↓
Análisis
  ↓
Comparar con oferta
  ↓
Resultado
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
    ├── login.png
    ├── dashboard.png
    ├── analysis.png
    ├── comparison.png
    └── comparison-result.png
```

---

# 🎓 Objetivo y aprendizaje

Este proyecto ha sido desarrollado como parte de mi portfolio después de finalizar el **Grado Superior en Desarrollo de Aplicaciones Web**.

El objetivo principal no era únicamente crear una aplicación que funcionase, sino poner en práctica diferentes conocimientos adquiridos durante mi formación y combinarlos en un proyecto Full Stack completo.

Durante el desarrollo he trabajado con:

* Desarrollo de interfaces con Vue.js.
* Componentización.
* Comunicación mediante APIs REST.
* Desarrollo backend con Node.js y Express.
* Autenticación mediante JWT.
* Gestión de usuarios.
* PostgreSQL.
* Persistencia de información.
* Procesamiento de archivos PDF.
* Integración con APIs externas.
* Integración de Inteligencia Artificial.
* Validación de datos.
* Gestión de errores.
* Seguridad básica de aplicaciones web.
* Hashing y reutilización de resultados.
* Arquitectura basada en servicios y repositorios.
* Git y GitHub.

Uno de los principales aprendizajes del proyecto ha sido entender cómo conectar todas estas piezas para construir una aplicación que no se limite a una interfaz, sino que tenga **frontend, backend, base de datos, autenticación, procesamiento de información e integración con servicios externos**.

---

# 🚀 Posibles mejoras futuras

La versión actual cubre el alcance planteado para el proyecto.

Como posibles ampliaciones futuras podrían incorporarse:

* Generación automática de CV optimizados.
* Exportación de análisis a PDF.
* Generación de cartas de presentación.
* Recomendaciones profesionales personalizadas.
* Dashboard con estadísticas.
* Comparación con múltiples ofertas simultáneamente.
* Sistema de favoritos.
* Tests automatizados adicionales.
* Despliegue de la aplicación en producción.

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
