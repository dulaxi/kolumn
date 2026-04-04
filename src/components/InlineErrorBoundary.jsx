import { Component } from 'react'
import { logError } from '../utils/logger'
import { RefreshCw } from 'lucide-react'
import * as Sentry from '@sentry/react'

/**
 * Compact error boundary for sub-components (sidebar, header, columns).
 * Shows a single-line fallback instead of the full-page error screen.
 *
 * Props:
 *  - name: human-readable component name shown in fallback
 *  - children: the component tree to protect
 */
export default class InlineErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    logError(`InlineErrorBoundary [${this.props.name}]:`, error, errorInfo)
    Sentry.captureException(error, { extra: { component: this.props.name, componentStack: errorInfo?.componentStack } })
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-[#8E8E89] bg-[#F2EDE8] rounded-lg">
          <span>Couldn&apos;t load {this.props.name}</span>
          <button
            onClick={this.handleRetry}
            aria-label="Retry"
            className="flex items-center gap-1 px-2 py-0.5 text-[#5C5C57] hover:text-[#1B1B18] bg-white rounded border border-[#E0DBD5] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
