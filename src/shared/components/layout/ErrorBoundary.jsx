import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="glass p-8 rounded-2xl max-w-md w-full border border-slate-700">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <i className="fa fa-exclamation-triangle text-3xl text-red-400"></i>
              </div>
              <h2 className="text-2xl font-bold text-red-400 mb-2">
                Something went wrong
              </h2>
              <p className="text-slate-400">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mb-4 text-xs text-slate-500 bg-slate-800/50 p-3 rounded-lg">
                <summary className="cursor-pointer font-semibold mb-2">
                  Error Details (Development Only)
                </summary>
                <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleReload}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all"
            >
              <i className="fa fa-refresh mr-2"></i>
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
