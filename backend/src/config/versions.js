// @ts-check

/*
 * Versiones usadas para invalidar caché de forma controlada.
 *
 * - CV_ANALYSIS_VERSION vive junto al prompt en aiService.js
 *   (cambia cuando cambia el modelo o el prompt de análisis
 *   de CV).
 *
 * - MARKET_DATA_VERSION es independiente: permite forzar que
 *   se vuelva a consultar el mercado laboral (por ejemplo,
 *   porque los datos han quedado desactualizados) SIN tener
 *   que reprocesar ningún CV. Se puede sobrescribir por
 *   variable de entorno para invalidar la caché de mercado
 *   en producción sin desplegar código nuevo.
 */

const MARKET_DATA_VERSION =
  process.env.MARKET_DATA_VERSION || '2026-09-market-v1'

module.exports = {
  MARKET_DATA_VERSION
}
