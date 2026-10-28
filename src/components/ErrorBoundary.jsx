import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorMessage: null }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="kr-card p-6">
          <h2 className="font-heading text-lg font-semibold text-red-700">Something went wrong</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {this.props.message ?? 'This page hit an unexpected error. You can try again or go back to Home.'}
          </p>
          {this.state.errorMessage ? (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 font-mono text-xs text-red-800">
              {this.state.errorMessage}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={this.handleRetry} className="btn-primary">
              Try again
            </button>
            <Link to="/home" className="btn-secondary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
