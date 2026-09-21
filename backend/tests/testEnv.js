process.env.NODE_ENV = 'test'

/*
 * Se fija NODE_ENV antes de cargar dotenv para que las
 * variables del .env (que trae NODE_ENV=development) no
 * lo sobrescriban. dotenv nunca pisa una variable que ya
 * exista en process.env.
 *
 * Esto debe cargarse aquí (setupFiles) y no esperar a que
 * lo haga app.js, porque tests/setup.js (setupFilesAfterEnv)
 * requiere config/database.js antes que el propio archivo
 * de test, y el Pool de pg necesita DB_PASSWORD ya disponible
 * en ese momento.
 */

require('dotenv').config({ quiet: true })
