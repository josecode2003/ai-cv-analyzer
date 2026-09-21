const mockCreate = jest.fn()

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    responses: { create: (...args) => mockCreate(...args) }
  }))
})

const {
  verifyClaim,
  deterministicNumberCheck,
  extractNumbers,
  normalizeNumberToken
} = require('../src/services/claimVerificationService')

describe('normalizeNumberToken / extractNumbers', () => {
  test('normaliza formato europeo (punto de miles)', () => {
    expect(normalizeNumberToken('36.800')).toBe(36800)
  })

  test('normaliza formato anglosajón (coma de miles)', () => {
    expect(normalizeNumberToken('55,199')).toBe(55199)
  })

  test('normaliza un decimal simple sin confundirlo con separador de miles', () => {
    expect(normalizeNumberToken('3.5')).toBe(3.5)
  })

  test('normaliza miles + decimal combinados', () => {
    expect(normalizeNumberToken('42.000,50')).toBe(42000.5)
  })

  test('extrae varios números de un texto con símbolos', () => {
    expect(
      extractNumbers('Entre 36.800 € y 55.199 € (crecimiento del 15%)')
    ).toEqual(expect.arrayContaining([36800, 55199, 15]))
  })
})

describe('deterministicNumberCheck', () => {
  test('devuelve null cuando la afirmación no es numérica', () => {
    expect(
      deterministicNumberCheck('La demanda está creciendo', 'texto cualquiera')
    ).toBeNull()
  })

  test('devuelve supported cuando todos los números de la afirmación aparecen en el contenido', () => {
    const claim = 'Salario: 36.800 € – 55.199 € (anual)'
    const content =
      'Según el informe, el salario oscila entre 36.800 y 55.199 euros anuales.'

    expect(deterministicNumberCheck(claim, content)).toBe('supported')
  })

  test('acepta formatos equivalentes europeo/anglosajón', () => {
    const claim = 'Salario: 36.800 € – 55.199 €'
    const content = 'Salary ranges from 36,800 to 55,199 EUR per year.'

    expect(deterministicNumberCheck(claim, content)).toBe('supported')
  })

  test('devuelve null (no "supported") cuando falta alguno de los números', () => {
    const claim = 'Salario: 36.800 € – 55.199 €'
    const content = 'El salario mínimo es de 36.800 €, sin más detalles.'

    expect(deterministicNumberCheck(claim, content)).toBeNull()
  })

  /*
   * Contexto: que el número exista en la página no basta si
   * pertenece a un perfil o ubicación distintos de los que
   * afirma la cita.
   */

  test('no acepta un número que en el contenido pertenece a otra senioridad', () => {
    const claim = 'Salario Senior: 22.000 € - 32.000 €'
    const content =
      'Salarios por experiencia: Junior: 22.000 € - 32.000 €. Senior: 55.000 € - 70.000 €.'

    expect(deterministicNumberCheck(claim, content)).toBeNull()
  })

  test('acepta el número cuando el contexto de senioridad sí coincide', () => {
    const claim = 'Salario Senior: 55.000 € - 70.000 €'
    const content =
      'Salarios por experiencia: Junior: 22.000 € - 32.000 €. Senior: 55.000 € - 70.000 €.'

    expect(deterministicNumberCheck(claim, content)).toBe('supported')
  })

  test('no acepta un número que en el contenido pertenece a otra región', () => {
    const claim = 'Salario en Madrid: 36.800 € - 55.199 €'
    const content = 'En Barcelona, el salario oscila entre 36.800 € y 55.199 €.'

    expect(deterministicNumberCheck(claim, content)).toBeNull()
  })

  test('acepta el número cuando la región coincide', () => {
    const claim = 'Salario en Madrid: 36.800 € - 55.199 €'
    const content = 'En Madrid, el salario oscila entre 36.800 € y 55.199 €.'

    expect(deterministicNumberCheck(claim, content)).toBe('supported')
  })

  test('acepta el número cuando el contenido no menciona ningún contexto en conflicto', () => {
    const claim = 'Salario Senior: 22.000 € - 32.000 €'
    const content = 'El salario oscila entre 22.000 € y 32.000 € en el sector.'

    expect(deterministicNumberCheck(claim, content)).toBe('supported')
  })
})

describe('verifyClaim', () => {
  afterEach(() => {
    mockCreate.mockReset()
  })

  test('acepta una afirmación numérica sin llamar al modelo cuando el determinista basta', async () => {
    const claim = 'Salario: 36.800 € – 55.199 € (anual)'
    const content = 'El salario oscila entre 36.800 y 55.199 euros anuales.'

    const verdict = await verifyClaim(claim, content)

    expect(verdict).toBe('supported')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('recurre al modelo cuando el número existe pero en un contexto distinto (senioridad)', async () => {
    mockCreate.mockResolvedValue({
      output_text: JSON.stringify({
        verdict: 'unsupported',
        explanation: 'El contenido asocia esa cifra a Junior, no a Senior'
      })
    })

    const verdict = await verifyClaim(
      'Salario Senior: 22.000 € - 32.000 €',
      'Salarios por experiencia: Junior: 22.000 € - 32.000 €. Senior: 55.000 € - 70.000 €.'
    )

    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(verdict).toBe('unsupported')
  })

  test('recurre al modelo para afirmaciones no numéricas', async () => {
    mockCreate.mockResolvedValue({
      output_text: JSON.stringify({ verdict: 'supported', explanation: 'ok' })
    })

    const verdict = await verifyClaim(
      'La demanda de desarrolladores backend está creciendo.',
      'Las ofertas de desarrollador backend aumentaron un 20% este año.'
    )

    expect(verdict).toBe('supported')
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  test('devuelve unsupported cuando el modelo verificador lo determina', async () => {
    mockCreate.mockResolvedValue({
      output_text: JSON.stringify({
        verdict: 'unsupported',
        explanation: 'El contenido no menciona esa cifra'
      })
    })

    const verdict = await verifyClaim(
      'El salario es de 40.000 €.',
      'Los desarrolladores pueden ganar salarios competitivos.'
    )

    expect(verdict).toBe('unsupported')
  })

  test('devuelve insufficient_evidence si el contenido está vacío, sin llamar al modelo', async () => {
    const verdict = await verifyClaim('Cualquier afirmación', '')

    expect(verdict).toBe('insufficient_evidence')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('devuelve insufficient_evidence si el propio verificador falla', async () => {
    mockCreate.mockRejectedValue(new Error('timeout'))

    const verdict = await verifyClaim(
      'La demanda está creciendo.',
      'Contenido relacionado pero ambiguo sobre el tema.'
    )

    expect(verdict).toBe('insufficient_evidence')
  })
})
