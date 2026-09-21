// @ts-check

const net = require('net')
const dns = require('dns')

const dnsLookup = dns.promises.lookup

/*
 * Las URLs que verificamos en el Market Analysis proceden de la
 * respuesta de un modelo de IA con acceso a búsqueda web: son
 * INPUT NO CONFIABLE. Antes de que el backend haga una sola
 * petición HTTP a una de esas URLs (para comprobar que existe o
 * para leer su contenido), hay que asegurarse de que no apunta a
 * infraestructura interna (localhost, redes privadas, endpoints
 * de metadata de la nube, puertos internos, esquemas no HTTP).
 *
 * Esto se reutiliza tanto desde la comprobación de existencia de
 * URL (verifyUrlReachable) como desde la nueva obtención de
 * contenido (sourceContentService): un único punto de verdad
 * para "¿es seguro que el backend acceda a esto?".
 */

const MAX_REDIRECTS = 5

/**
 * @param {string} ip
 * @returns {boolean}
 */
function isDisallowedIpv4(ip) {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(part => Number.isNaN(part))) {
    return true
  }

  const [a, b] = parts

  if (a === 0) return true // 0.0.0.0/8
  if (a === 10) return true // 10.0.0.0/8 (privada)
  if (a === 127) return true // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true // 169.254.0.0/16 (link-local / metadata cloud)
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12 (privada)
  if (a === 192 && b === 168) return true // 192.168.0.0/16 (privada)
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 (CGNAT)
  if (a >= 224) return true // multicast/reservado (224.0.0.0+)

  return false
}

/**
 * @param {string} ip
 * @returns {boolean}
 */
function isDisallowedIpv6(ip) {
  const normalized = ip.toLowerCase()

  if (normalized === '::1') return true // loopback
  if (normalized === '::') return true

  // IPv4 mapeada en IPv6 (::ffff:127.0.0.1, etc.)
  const mappedMatch = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mappedMatch) {
    return isDisallowedIpv4(mappedMatch[1])
  }

  if (normalized.startsWith('fe80:')) return true // link-local
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true // ULA (fc00::/7)

  return false
}

/**
 * @param {string} hostname
 * @returns {boolean}
 */
function isDisallowedHostnameLiteral(hostname) {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '')

  if (lower === 'localhost' || lower.endsWith('.localhost')) {
    return true
  }

  const ipVersion = net.isIP(lower)

  if (ipVersion === 4) {
    return isDisallowedIpv4(lower)
  }

  if (ipVersion === 6) {
    return isDisallowedIpv6(lower)
  }

  return false
}

/**
 * Comprueba el esquema y el host literal de la URL, y resuelve el
 * hostname vía DNS para comprobar también las IPs reales a las
 * que apunta (evita que un dominio público resuelva a una IP
 * interna).
 *
 * @param {string} rawUrl
 * @returns {Promise<{ safe: true } | { safe: false, reason: string }>}
 */
async function checkUrlSafety(rawUrl) {
  let parsed

  try {
    parsed = new URL(rawUrl)
  } catch {
    return { safe: false, reason: 'url_invalida' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: 'esquema_no_permitido' }
  }

  if (parsed.port && !['', '80', '443'].includes(parsed.port)) {
    return { safe: false, reason: 'puerto_no_permitido' }
  }

  if (isDisallowedHostnameLiteral(parsed.hostname)) {
    return { safe: false, reason: 'host_interno_o_reservado' }
  }

  try {
    const addresses = await dnsLookup(parsed.hostname, { all: true })

    for (const { address } of addresses) {
      if (net.isIP(address) === 4 && isDisallowedIpv4(address)) {
        return { safe: false, reason: 'dns_resuelve_a_ip_interna' }
      }

      if (net.isIP(address) === 6 && isDisallowedIpv6(address)) {
        return { safe: false, reason: 'dns_resuelve_a_ip_interna' }
      }
    }
  } catch {
    /*
     * No se pudo resolver el DNS: no es una prueba de que la URL
     * sea insegura (dominio caído, DNS lento...), así que no la
     * bloqueamos por esto — el propio fetch fallará después y ese
     * fallo se trata como "no verificable", no como "inseguro".
     */
  }

  return { safe: true }
}

/**
 * `fetch` con protección SSRF y redirecciones seguidas de forma
 * manual: cada salto se valida ANTES de seguirlo, porque una URL
 * inicialmente pública podría redirigir a una dirección interna.
 *
 * @param {string} url
 * @param {{ method?: string, signal?: AbortSignal }} options
 * @returns {Promise<Response | null>} null si la URL (o algún salto de redirección) no es segura.
 */
async function safeFetch(url, options = {}) {
  let currentUrl = url

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const safety = await checkUrlSafety(currentUrl)

    if (!safety.safe) {
      return null
    }

    const response = await fetch(currentUrl, {
      method: options.method || 'GET',
      redirect: 'manual',
      signal: options.signal
    })

    const isRedirect = response.status >= 300 && response.status < 400

    if (!isRedirect) {
      return response
    }

    const location = response.headers?.get?.('location')

    if (!location) {
      return response
    }

    currentUrl = new URL(location, currentUrl).toString()
  }

  return null
}

module.exports = {
  safeFetch,
  checkUrlSafety
}
