import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="kr-card p-6">
          <h2 className="font-heading text-lg font-semibold text-red-700">Something went wrong</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {this.props.message ?? 'This page hit an unexpected error. You can try again or go back to the dashboard.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={this.handleRetry} className="btn-primary">
              Try again
            </button>
            <Link to="/dashboard" className="btn-secondary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
