import { render, screen, fireEvent } from '@testing-library/react'
import { ArrayField } from '../ArrayField'
import { ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'

describe('ArrayField', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  const schema: ResolvedSchemaNode = {
    type: 'array',
    description: 'List of items',
    items: { type: 'string' }
  }

  it('renders array items', () => {
    render(
      <ArrayField
        schema={schema}
        value={['item1', 'item2']}
        onChange={mockOnChange}
        path="test"
      />
    )

    expect(screen.getByDisplayValue('item1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('item2')).toBeInTheDocument()
  })

  it('adds new item', () => {
    render(
      <ArrayField
        schema={schema}
        value={[]}
        onChange={mockOnChange}
        path="test"
      />
    )

    const input = screen.getByPlaceholderText('添加新项目...')
    const addButton = screen.getByRole('button', { name: /添加/i })

    fireEvent.change(input, { target: { value: 'new item' } })
    fireEvent.click(addButton)

    expect(mockOnChange).toHaveBeenCalledWith(['new item'], undefined)
  })

  it('removes item', () => {
    render(
      <ArrayField
        schema={schema}
        value={['item1', 'item2']}
        onChange={mockOnChange}
        path="test"
      />
    )

    const removeButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg'))
    fireEvent.click(removeButtons[0])

    expect(mockOnChange).toHaveBeenCalledWith(['item2'], undefined)
  })

  it('updates item', () => {
    render(
      <ArrayField
        schema={schema}
        value={['item1']}
        onChange={mockOnChange}
        path="test"
      />
    )

    const input = screen.getByDisplayValue('item1')
    fireEvent.change(input, { target: { value: 'updated' } })

    expect(mockOnChange).toHaveBeenCalledWith(['updated'], undefined)
  })

  it('shows item count', () => {
    render(
      <ArrayField
        schema={schema}
        value={['a', 'b', 'c']}
        onChange={mockOnChange}
        path="test"
      />
    )

    expect(screen.getByText('3 项')).toBeInTheDocument()
  })
})