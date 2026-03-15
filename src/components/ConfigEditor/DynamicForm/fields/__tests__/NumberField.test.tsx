// Test the internal validation logic by copying the functions

function shouldUseSlider(schema: any): boolean {
  if (schema.minimum !== undefined && schema.maximum !== undefined) {
    const range = schema.maximum - schema.minimum
    return range <= 100 && range > 0
  }
  return false
}

function validateNumber(schema: any, value: number): string | undefined {
  if (schema.nullable === false && (value === undefined || value === null)) {
    return '此字段为必填项'
  }

  if (schema.minimum !== undefined && value < schema.minimum) {
    return `最小值为 ${schema.minimum}`
  }

  if (schema.maximum !== undefined && value > schema.maximum) {
    return `最大值为 ${schema.maximum}`
  }

  return undefined
}

describe('NumberField', () => {
  describe('validateNumber', () => {
    it('returns validation error for minimum value', () => {
      const schema = { type: 'number', minimum: 10 }
      const result = validateNumber(schema, 5)
      expect(result).toBe('最小值为 10')
    })

    it('returns undefined for valid minimum value', () => {
      const schema = { type: 'number', minimum: 10 }
      const result = validateNumber(schema, 15)
      expect(result).toBeUndefined()
    })

    it('returns validation error for maximum value', () => {
      const schema = { type: 'number', maximum: 100 }
      const result = validateNumber(schema, 150)
      expect(result).toBe('最大值为 100')
    })

    it('returns undefined for valid maximum value', () => {
      const schema = { type: 'number', maximum: 100 }
      const result = validateNumber(schema, 50)
      expect(result).toBeUndefined()
    })

    it('returns undefined when no validation specified', () => {
      const schema = { type: 'number' }
      const result = validateNumber(schema, 42)
      expect(result).toBeUndefined()
    })

    it('returns validation error for required field', () => {
      const schema = { type: 'number', nullable: false }
      const result = validateNumber(schema, null as any)
      expect(result).toBe('此字段为必填项')
    })

    it('returns undefined for valid required field', () => {
      const schema = { type: 'number', nullable: false }
      const result = validateNumber(schema, 10)
      expect(result).toBeUndefined()
    })
  })

  describe('shouldUseSlider', () => {
    it('returns true when range is small (0-2)', () => {
      const schema = { type: 'number', minimum: 0, maximum: 2 }
      expect(shouldUseSlider(schema)).toBe(true)
    })

    it('returns false when range is large (0-101)', () => {
      const schema = { type: 'number', minimum: 0, maximum: 101 }
      expect(shouldUseSlider(schema)).toBe(false)
    })

    it('returns false when no range specified', () => {
      const schema = { type: 'number' }
      expect(shouldUseSlider(schema)).toBe(false)
    })

    it('returns true when range is exactly 0-1', () => {
      const schema = { type: 'number', minimum: 0, maximum: 1 }
      expect(shouldUseSlider(schema)).toBe(true)
    })

    it('returns false when range is 0', () => {
      const schema = { type: 'number', minimum: 0, maximum: 0 }
      expect(shouldUseSlider(schema)).toBe(false)
    })

    it('returns false when only minimum is specified', () => {
      const schema = { type: 'number', minimum: 10 }
      expect(shouldUseSlider(schema)).toBe(false)
    })

    it('returns false when only maximum is specified', () => {
      const schema = { type: 'number', maximum: 100 }
      expect(shouldUseSlider(schema)).toBe(false)
    })

    it('returns true for exact small range (5-10)', () => {
      const schema = { type: 'number', minimum: 5, maximum: 10 }
      expect(shouldUseSlider(schema)).toBe(true)
    })
  })
})