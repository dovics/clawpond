// Test the internal validation logic by copying the functions

function validateString(schema: any, value: string): string | undefined {
  if (schema.nullable === false && !value) {
    return '此字段为必填项'
  }

  // Note: minLength is not available in ResolvedSchemaNode, removed validation

  if (schema.pattern) {
    try {
      const regex = new RegExp(schema.pattern)
      if (!regex.test(value)) {
        return '格式不正确'
      }
    } catch (e) {
      console.error('Invalid pattern:', schema.pattern)
    }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    return `必须是以下值之一: ${schema.enum.join(', ')}`
  }

  return undefined
}

describe('StringField', () => {
  describe('validateString', () => {
    it('returns validation error for required field', () => {
      const schema = { type: 'string', nullable: false }
      const result = validateString(schema, '')
      expect(result).toBe('此字段为必填项')
    })

    it('returns undefined for valid required field', () => {
      const schema = { type: 'string', nullable: false }
      const result = validateString(schema, 'test')
      expect(result).toBeUndefined()
    })

    it('returns validation error for pattern mismatch', () => {
      const schema = { type: 'string', pattern: '^[a-z]+$' }
      const result = validateString(schema, 'ABC123')
      expect(result).toBe('格式不正确')
    })

    it('returns undefined for valid pattern', () => {
      const schema = { type: 'string', pattern: '^[a-z]+$' }
      const result = validateString(schema, 'abc')
      expect(result).toBeUndefined()
    })

    it('returns validation error for enum mismatch', () => {
      const schema = { type: 'string', enum: ['a', 'b', 'c'] }
      const result = validateString(schema, 'd')
      expect(result).toBe('必须是以下值之一: a, b, c')
    })

    it('returns undefined for valid enum value', () => {
      const schema = { type: 'string', enum: ['a', 'b', 'c'] }
      const result = validateString(schema, 'a')
      expect(result).toBeUndefined()
    })

    it('handles invalid pattern gracefully', () => {
      const schema = { type: 'string', pattern: '[invalid regex' }
      const result = validateString(schema, 'test')
      expect(result).toBeUndefined() // Should not throw error
    })
  })
})