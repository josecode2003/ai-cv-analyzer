const request = require('supertest')

const app = require('../../src/app')
const pool = require('../../src/config/database')

/*
 * No hay login ni registro: cada "usuario" de test es en
 * realidad una sesión anónima independiente, identificada
 * por su propia cookie.
 *
 * `request.agent` mantiene esa cookie entre peticiones, así
 * que basta con hacer una petición cualquiera (que pase por
 * `attachSession`) para que el backend cree la sesión.
 *
 * Como el endpoint no devuelve el id numérico de la sesión,
 * y los tests lo necesitan para sembrar datos directamente
 * vía repository (sin pasar por OpenAI), lo leemos de la
 * tabla `sessions` justo después de crearla. Jest corre estos
 * tests con --runInBand, así que no hay riesgo de carreras
 * con otras sesiones creándose al mismo tiempo.
 */

async function createSessionAgent() {
  const agent = request.agent(app)

  await agent.get('/api/cv')

  const result = await pool.query(`
    SELECT id FROM sessions ORDER BY id DESC LIMIT 1
  `)

  return { agent, sessionId: result.rows[0].id }
}

module.exports = { createSessionAgent }
