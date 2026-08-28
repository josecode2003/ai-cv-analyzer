# 🤖 AI CV Analyzer

Aplicación web Full Stack que utiliza **Inteligencia Artificial** para analizar currículums en PDF y evaluar su compatibilidad con ofertas de empleo.

El usuario puede subir su CV, obtener un análisis estructurado mediante IA, consultar su historial y comparar cualquiera de sus CV analizados con una oferta de empleo para conocer su nivel de compatibilidad y detectar posibles áreas de mejora.

---

## ✨ Funcionalidades

### 🔐 Autenticación

* Registro de usuarios.
* Inicio de sesión.
* Autenticación mediante **JWT**.
* Recuperación de sesión.
* Consulta del usuario autenticado.
* Cierre de sesión.
* Protección de rutas privadas.
* Rate limiting en autenticación.

### 📄 Análisis de CV

* Subida de archivos PDF.
* Validación del tipo de archivo.
* Límite máximo de **5 MB**.
* Extracción del texto del PDF.
* Limpieza y normalización del contenido.
* Análisis mediante Inteligencia Artificial.
* Extracción estructurada de información del candidato.
* Puntuación global del CV.
* Evaluación del perfil y nivel profesional.
* Guardado de los análisis en PostgreSQL.
* Historial de CV analizados.
* Consulta individual de análisis.
* Eliminación de análisis.

### ♻️ Detección de CV duplicados

El contenido limpio del CV se utiliza para generar un hash.

Si el usuario vuelve a subir exactamente el mismo CV:

* No se vuelve a ejecutar el análisis mediante IA.
* Se recupera el análisis almacenado.
* Se reducen llamadas innecesarias a la API.
* Se reducen costes de procesamiento.

### 🎯 Comparación CV ↔ Oferta de empleo

El usuario puede seleccionar uno de sus CV y pegar una oferta de empleo.

La aplicación analiza:

* Compatibilidad general.
* Habilidades coincidentes.
* Habilidades faltantes.
* Fortalezas.
* Brechas.
* Keywords relevantes.
* Recomendaciones.
* Puntuación de compatibilidad sobre 100.

Las comparaciones también se almacenan en PostgreSQL y pueden consultarse posteriormente desde el historial.

### ♻️ Caché de comparaciones

Las comparaciones utilizan una huella basada en:

* CV analizado.
* Título de la oferta.
* Contenido de la oferta.

Si la misma comparación ya existe para el usuario, se recupera el resultado almacenado sin volver a consumir la API de IA.

### 🛡️ Seguridad

El proyecto incorpora diferentes medidas de seguridad:

* JWT para autenticación.
* Helmet.
* CORS configurado.
* Rate limiting.
* Validación de archivos.
* Límite de tamaño de archivos.
* Límites de tamaño para peticiones.
* Protección de rutas privadas.
* Verificación de propiedad de los recursos.
* Variables sensibles mediante `.env`.
* Eliminación de archivos PDF temporales después del procesamiento.

---

## 🧰 Tecnologías

### Frontend

* **Vue.js**
* **Vite**
* JavaScript
* HTML5
* CSS3

### Backend

* **Node.js**
* **Express.js**
* REST API
* JWT
* Multer
* Helmet
* CORS
* Express Rate Limit

### Base de datos

* **PostgreSQL**

### Inteligencia Artificial

* **OpenAI API**
* Modelo `gpt-5.6-luna`

### Procesamiento de documentos

* PDF parsing
* Extracción y limpieza de texto
* Hashing de contenido

---

## 🏗️ Arquitectura

El proyecto está dividido en dos aplicaciones principales:

```text
ai-cv-analyzer/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── analysis/
│   │   │   ├── auth/
│   │   │   └── cv/
│   │   │
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── authService.js
│   │   │   ├── cvService.js
│   │   │   ├── analysisService.js
│   │   │   └── comparisonService.js
│   │   │
│   │   ├── App.vue
│   │   └── style.css
│   │
│   └── package.json
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
├── .env.example
├── .gitignore
└── README.md
```

La comunicación sigue una arquitectura cliente-servidor:

```text
┌──────────────────────┐
│       Vue.js         │
│      Frontend        │
└──────────┬───────────┘
           │
           │ HTTP / REST
           ▼
┌──────────────────────┐
│    Node + Express    │
│       Backend        │
└───────┬────────┬─────┘
        │        │
        │        │
        ▼        ▼
┌────────────┐ ┌──────────────┐
│ PostgreSQL │ │  OpenAI API  │
│            │ │              │
│ Usuarios   │ │ CV Analysis  │
│ CVs        │ │ Matching     │
│ Comparaciones│             │
└────────────┘ └──────────────┘
```

---

## 🔄 Flujo de análisis

```text
Usuario
   │
   ▼
Sube CV en PDF
   │
   ▼
Validación del archivo
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
   ├── CV ya analizado ──────► Recuperar resultado
   │
   └── CV nuevo
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

---

## 🎯 Flujo de comparación

```text
CV guardado
     │
     ▼
Seleccionar oferta
     │
     ▼
Título + texto de la oferta
     │
     ▼
Generar hash
     │
     ├── Comparación existente
     │          │
     │          ▼
     │      Recuperar resultado
     │
     └── Comparación nueva
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

## 🔌 API

### Autenticación

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### CV

```text
POST   /api/cv
GET    /api/cv
GET    /api/cv/:id
DELETE /api/cv/:id
```

### Comparaciones

```text
POST   /api/cv/:id/compare
GET    /api/comparisons
GET    /api/comparisons/:id
DELETE /api/comparisons/:id
```

### Health check

```text
GET /api/health
```

---

## ⚙️ Instalación

### Requisitos

Antes de ejecutar el proyecto necesitas tener instalado:

* Node.js
* npm
* PostgreSQL
* Una API key de OpenAI

---

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd ai-cv-analyzer
```

---

### 2. Instalar dependencias del frontend

```bash
cd frontend
npm install
```

---

### 3. Instalar dependencias del backend

Desde otra terminal:

```bash
cd backend
npm install
```

---

## 🔑 Variables de entorno

Dentro de `backend/` crea un archivo:

```text
.env
```

con las variables necesarias:

```env
OPENAI_API_KEY=tu_api_key
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
NODE_ENV=development
```

> **Nunca subas el archivo `.env` a GitHub.**

Puedes utilizar `.env.example` como referencia.

---

## ▶️ Ejecutar el proyecto

### Backend

Desde `backend/`:

```bash
npm start
```

El servidor estará disponible en:

```text
http://localhost:3000
```

### Frontend

Desde `frontend/`:

```bash
npm run dev
```

La aplicación estará disponible normalmente en:

```text
http://localhost:5173
```

---

## 🗄️ Base de datos

La aplicación utiliza PostgreSQL para almacenar:

* Usuarios.
* Análisis de CV.
* Comparaciones.
* Resultados generados por IA.
* Hashes utilizados para evitar procesamiento duplicado.

La configuración de conexión se realiza mediante variables de entorno.

---

## 🧠 Inteligencia Artificial

La aplicación utiliza la API de OpenAI para realizar dos tareas principales:

### Análisis de CV

El contenido extraído del CV se envía al modelo para obtener información estructurada sobre:

* Datos personales.
* Perfil.
* Experiencia.
* Formación.
* Habilidades.
* Evaluación general.
* Puntuación.

### Comparación con ofertas

El análisis almacenado del CV se compara con el contenido de una oferta de empleo para obtener:

* Compatibilidad.
* Coincidencias.
* Carencias.
* Fortalezas.
* Brechas.
* Keywords.
* Recomendaciones.

Los resultados se almacenan para poder consultarlos posteriormente.

---

## 💡 Optimización de costes

Uno de los objetivos del proyecto es evitar llamadas innecesarias a la API de IA.

Para ello se implementan hashes de contenido.

### CV

```text
CV → limpiar texto → SHA/hash → comprobar existencia
```

### Comparación

```text
CV + título + oferta → hash → comprobar existencia
```

Cuando existe un resultado anterior, se devuelve directamente desde PostgreSQL.

Esto permite:

* Reducir llamadas a OpenAI.
* Reducir costes.
* Mejorar el tiempo de respuesta.
* Evitar procesamiento duplicado.

---

## 🛡️ Seguridad

Entre las medidas implementadas se encuentran:

* Autenticación JWT.
* Protección de endpoints privados.
* Helmet.
* CORS.
* Rate limiting.
* Validación de entrada.
* Validación de archivos PDF.
* Límite de 5 MB por CV.
* Límites de tamaño de request.
* Control de acceso mediante `userId`.
* Eliminación de archivos temporales.
* Protección de credenciales mediante variables de entorno.

---

## 📱 Interfaz

La aplicación dispone de diferentes vistas:

* Login.
* Registro.
* Inicio.
* Subida de CV.
* Historial de análisis.
* Detalle de análisis.
* Formulario de comparación.
* Resultado de comparación.
* Historial de comparaciones.

---

## 📸 Capturas

Las capturas de pantalla de la aplicación pueden añadirse aquí para mostrar:

1. Inicio de sesión.
2. Dashboard.
3. Análisis de CV.
4. Historial de CV.
5. Comparación con oferta.
6. Resultado de compatibilidad.
7. Historial de comparaciones.

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

## 🎓 Objetivo del proyecto

AI CV Analyzer ha sido desarrollado como proyecto **Full Stack orientado a portfolio**, con el objetivo de poner en práctica diferentes tecnologías y conceptos utilizados en aplicaciones web modernas:

* Desarrollo frontend con Vue.
* Desarrollo de APIs REST con Node.js y Express.
* Autenticación mediante JWT.
* Persistencia de datos con PostgreSQL.
* Procesamiento de archivos PDF.
* Integración con APIs de Inteligencia Artificial.
* Arquitectura basada en servicios y repositorios.
* Validación y manejo de errores.
* Seguridad de aplicaciones web.
* Optimización mediante caching y hashing.

---

## 🔮 Posibles mejoras futuras

Algunas funcionalidades que podrían incorporarse en futuras versiones:

* Generación automática de CV optimizados.
* Exportación de análisis a PDF.
* Generación de cartas de presentación.
* Sistema de recomendaciones personalizado.
* Dashboard avanzado con estadísticas.
* Comparación de múltiples ofertas.
* Sistema de favoritos.
* Despliegue en producción.
* Tests automatizados adicionales.

Estas funcionalidades quedan fuera del alcance actual de la versión V2.

---

## 👨‍💻 Autor

**Manu**

Proyecto desarrollado como parte de mi portfolio de desarrollo web y Full Stack.

---

## 📄 Licencia

Este proyecto se publica con fines educativos y de portfolio.
