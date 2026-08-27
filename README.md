# AI CV Analyzer

Aplicación web desarrollada para analizar currículums mediante inteligencia artificial y comparar el perfil de un candidato con ofertas de empleo.

El proyecto permite subir un CV en formato PDF, extraer y procesar su contenido, analizarlo mediante la API de OpenAI y almacenar los resultados en PostgreSQL.

También incluye autenticación de usuarios, historial de análisis, comparación con ofertas de empleo y diferentes medidas de seguridad.

## Funcionalidades

### Análisis de CV

- Subida de currículums en formato PDF.
- Validación del tipo de archivo.
- Límite de tamaño de 5 MB.
- Extracción del texto del PDF.
- Limpieza y normalización del contenido.
- Análisis mediante inteligencia artificial.
- Obtención de información estructurada del candidato.
- Puntuación del CV.
- Identificación del perfil profesional.
- Estimación del nivel profesional.
- Almacenamiento del análisis en PostgreSQL.
- Historial de análisis.

### Comparación con ofertas de empleo

- Comparación entre un CV analizado y una oferta de empleo.
- Cálculo de compatibilidad.
- Análisis mediante inteligencia artificial.
- Almacenamiento de las comparaciones.
- Historial de comparaciones.
- Consulta individual de cada comparación.
- Eliminación de comparaciones.

### Usuarios y autenticación

- Registro de usuarios.
- Inicio de sesión.
- Contraseñas protegidas mediante bcrypt.
- Autenticación mediante JWT.
- Protección de rutas privadas.
- Separación de los datos por usuario.

### Seguridad

- Helmet para cabeceras HTTP de seguridad.
- CORS configurado.
- Rate limiting.
- Validación de tokens JWT.
- Protección de recursos mediante `user_id`.
- Validación de identificadores.
- Límite de tamaño para peticiones JSON.
- Validación de archivos subidos.
- Variables sensibles almacenadas mediante `.env`.

### Tests

El backend dispone de tests unitarios y de integración utilizando Jest y Supertest.

Estado actual:

- 7 suites de tests.
- 44 tests.
- 44 tests superados.
- 0 tests fallidos.

```text
Test Suites: 7 passed, 7 total
Tests:       44 passed, 44 total