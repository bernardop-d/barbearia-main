// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './hooks/useAuth'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-ink flex flex-col items-center justify-center gap-4 p-6">
          <div className="font-display text-5xl text-gradient tracking-wider">Your Barber</div>
          <div className="bg-ink-800 border border-ink-700 rounded-3xl p-6 text-center max-w-sm w-full">
            <p className="text-white font-medium mb-1">Algo deu errado</p>
            <p className="text-ink-400 text-sm mb-4">Tente recarregar a página.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Recarregar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
