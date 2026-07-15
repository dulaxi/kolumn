import { Component } from 'react'
import { logError } from '../utils/logger'
import { ArrowsClockwise, WarningCircle } from '@phosphor-icons/react'
import * as Sentry from '@sentry/react'
import InlineNotice from './ui/InlineNotice'

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
        <InlineNotice
          variant="error"
          className="items-center py-2"
          icon={<WarningCircle size={16} className="shrink-0" />}
          action={
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] bg-[var(--surface-card)] rounded-md border border-[var(--color-copper)] hover:opacity-80 transition-opacity cursor-pointer"
            >
              <ArrowsClockwise className="w-3 h-3" />
              Retry
            </button>
          }
        >
          Couldn&apos;t load {this.props.name}
        </InlineNotice>
      )
    }

    return this.props.children
  }
}
