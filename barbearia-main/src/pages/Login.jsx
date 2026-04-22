// src/pages/Login.jsx
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { user, login, signup } = useAuth()
  const [isSignup, setIsSignup] = useState(false)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      if (isSignup) {
        // Cadastro
        await signup(email, password)
        // Login automático após cadastro
        await login(email, password)
      } else {
        // Login
        await login(email, password)
      }
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setError('Email ou senha incorretos.')
      } else if (msg.includes('User already registered') || msg.includes('already registered')) {
        setError('Email já cadastrado. Clique em "Já tem conta? Faça login".')
      } else if (msg.includes('Email not confirmed')) {
        setError('Email não confirmado. Desative a verificação no Supabase.')
      } else if (msg.includes('rate limit') || msg.includes('email rate')) {
        setError('Muitas tentativas. Aguarde alguns minutos.')
      } else if (msg.includes('Password should be')) {
        setError('Senha deve ter no mínimo 6 caracteres.')
      } else {
        setError(isSignup ? `Erro ao criar conta: ${msg}` : `Erro ao entrar: ${msg}`)
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Fundo decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blade-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blade-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-ink-800 rounded-full opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-ink-800 rounded-full opacity-20" />
      </div>

      <div className="w-full max-w-sm animate-fade-in relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blade-500/10 border border-blade-500/30 rounded-3xl mb-6">
            <ScissorsIcon />
          </div>
          <h1 className="font-display text-5xl text-gradient tracking-widest mb-1">DUNGABARBER</h1>
          <p className="text-ink-400 text-sm">Área do proprietário</p>
        </div>

        {/* Card */}
        <div className="card">
          <h2 className="font-display text-2xl text-white tracking-wide mb-1">
            {isSignup ? 'Criar conta' : 'Entrar'}
          </h2>
          <p className="text-ink-400 text-sm mb-6">
            {isSignup ? 'Crie sua conta de proprietário' : 'Acesse sua conta'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">
                E-mail
              </label>
              <input
                type="email"
                required
                className="input"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">
                Senha
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              {isSignup && (
                <p className="text-ink-500 text-xs mt-2">Mínimo de 6 caracteres</p>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary mt-2" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner /> {isSignup ? 'Criando conta...' : 'Entrando...'}
                </span>
              ) : (
                isSignup ? 'Criar conta e entrar' : 'Entrar'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              className="text-sm text-ink-400 hover:text-blade-400 transition-colors"
              onClick={() => {
                setIsSignup(!isSignup)
                setError('')
              }}
            >
              {isSignup ? 'Já tem conta? Faça login' : 'Não tem conta? Criar uma'}
            </button>
          </div>
        </div>

        <p className="text-center text-ink-600 text-xs mt-6">
          DUNGABARBER © {new Date().getFullYear()} — Acesso do proprietário
        </p>
      </div>
    </div>
  )
}

function ScissorsIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
      <line x1="20" y1="4" x2="8.12" y2="15.88"/>
      <line x1="14.47" y1="14.48" x2="20" y2="20"/>
      <line x1="8.12" y1="8.12" x2="12" y2="12"/>
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}