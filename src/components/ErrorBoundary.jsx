import { Component } from 'react'
import { Button, Card } from './ui/index.js'
import { logAppError } from '../utils/appState.js'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    logAppError('react_error_boundary', error, {
      componentStack: String(errorInfo?.componentStack ?? '').slice(0, 240),
    })
  }

  reset = () => {
    this.setState({ error: null, errorInfo: null })
  }

  goHome = () => {
    window.history.pushState({}, '', '/')
    window.dispatchEvent(new window.PopStateEvent('popstate'))
    this.reset()
  }

  reload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-kupan-black p-4 text-kupan-bone">
        <Card className="w-full max-w-lg p-5 text-center" variant="warning">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-kupan-flame">Error inesperado</p>
          <h1 className="mt-3 text-3xl font-black uppercase leading-tight text-white">La app necesita tomar aire.</h1>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Algo se cortó mientras cargábamos KUPAN. Puedes reintentar, volver al inicio o recargar la aplicación.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Button type="button" variant="secondary" onClick={this.reset}>Reintentar</Button>
            <Button type="button" variant="secondary" onClick={this.goHome}>Inicio</Button>
            <Button type="button" onClick={this.reload}>Recargar</Button>
          </div>
        </Card>
      </main>
    )
  }
}
