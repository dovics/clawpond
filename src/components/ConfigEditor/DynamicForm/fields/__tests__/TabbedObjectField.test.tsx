// @ts-expect-error - jest-dom types not loaded during tsc
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { TabbedObjectField } from '../TabbedObjectField'
import { ResolvedSchemaNode } from '@/lib/config/schema/preprocessor'

const mockOnChange = jest.fn()

describe('TabbedObjectField', () => {
  const schema: ResolvedSchemaNode = {
    type: 'object',
    properties: {
      cli: {
        type: 'boolean',
        description: 'CLI channel'
      },
      telegram: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          token: { type: 'string' }
        }
      },
      discord: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          token: { type: 'string' }
        }
      }
    }
  }

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders tabs for all properties', () => {
    render(
      <TabbedObjectField
        schema={schema}
        value={{}}
        onChange={mockOnChange}
        path="channels_config"
      />
    )

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    expect(screen.getByRole('tab', { name: 'cli' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'telegram' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'discord' })).toBeInTheDocument()
  })

  it('switches between tabs', async () => {
    const user = userEvent.setup()
    render(
      <TabbedObjectField
        schema={schema}
        value={{ cli: true }}
        onChange={mockOnChange}
        path="channels_config"
      />
    )

    const telegramTab = screen.getByRole('tab', { name: 'telegram' })
    await user.click(telegramTab)

    await waitFor(() => {
      expect(telegramTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  it('renders first tab as default', () => {
    render(
      <TabbedObjectField
        schema={schema}
        value={{ cli: true }}
        onChange={mockOnChange}
        path="channels_config"
      />
    )

    expect(screen.getByRole('tab', { name: 'cli' })).toHaveAttribute('aria-selected', 'true')
  })

  it('measures tab switch performance', async () => {
    const user = userEvent.setup()
    render(
      <TabbedObjectField
        schema={schema}
        value={{ cli: true, telegram: { enabled: false }, discord: { enabled: true } }}
        onChange={mockOnChange}
        path="channels_config"
      />
    )

    const telegramTab = screen.getByRole('tab', { name: 'telegram' })
    const discordTab = screen.getByRole('tab', { name: 'discord' })

    const times: number[] = []

    for (let i = 0; i < 3; i++) {
      const start = performance.now()

      // Switch to telegram
      await user.click(telegramTab)
      await waitFor(() => expect(telegramTab).toHaveAttribute('aria-selected', 'true'))
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      // Switch to discord
      await user.click(discordTab)
      await waitFor(() => expect(discordTab).toHaveAttribute('aria-selected', 'true'))
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      const end = performance.now()
      times.push(end - start)
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length

    console.log(`Average tab switch time: ${avgTime.toFixed(2)}ms`)
    expect(avgTime).toBeLessThan(300) // Target: < 300ms
  })
})