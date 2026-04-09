import { Component } from 'react'
import { logError } from '../utils/logger'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import * as Sentry from '@sentry/react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    logError('ErrorBoundary caught:', error, errorInfo)
    Sentry.captureException(error, { extra: { componentStack: errorInfo?.componentStack } })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6">
          <div className="w-12 h-12 rounded-full bg-[#F0E0D2] flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-[#7A5C44]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Something went wrong</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4 max-w-md">
            An unexpected error occurred. Your data is safe — try refreshing this section.
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#C2D64A] hover:bg-[#A8BA32] rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          {this.state.error && import.meta.env.DEV && (
            <pre className="mt-4 text-[11px] text-[var(--text-muted)] bg-[var(--surface-raised)] rounded-lg p-3 max-w-md overflow-auto text-left">
              {this.state.error.message}
            </pre>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
