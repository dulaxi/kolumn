import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Suppress console.error from React for intentional error throws
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

import InlineErrorBoundary from '../components/InlineErrorBoundary'

// Component that always throws
function Thrower() {
  throw new Error('Test crash')
}

// Component that renders fine
function Happy() {
  return <div>All good</div>
}

describe('InlineErrorBoundary', () => {
  test('renders children when no error', () => {
    render(
      <InlineErrorBoundary name="test">
        <Happy />
      </InlineErrorBoundary>
    )
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  test('catches render error and shows compact fallback', () => {
    render(
      <InlineErrorBoundary name="sidebar">
        <Thrower />
      </InlineErrorBoundary>
    )
    expect(screen.queryByText('All good')).not.toBeInTheDocument()
    expect(screen.getByText(/couldn't load/i)).toBeInTheDocument()
  })

  test('shows the component name in the fallback', () => {
    render(
      <InlineErrorBoundary name="header">
        <Thrower />
      </InlineErrorBoundary>
    )
    expect(screen.getByText(/header/i)).toBeInTheDocument()
  })

  test('retry button resets the error state', async () => {
    let shouldThrow = true
    function Conditional() {
      if (shouldThrow) throw new Error('fail')
      return <div>Recovered</div>
    }

    render(
      <InlineErrorBoundary name="test">
        <Conditional />
      </InlineErrorBoundary>
    )

    expect(screen.getByText(/couldn't load/i)).toBeInTheDocument()

    // Fix the error and retry
    shouldThrow = false
    const retryBtn = screen.getByRole('button', { name: /retry/i })
    await userEvent.click(retryBtn)

    expect(screen.getByText('Recovered')).toBeInTheDocument()
  })
})
