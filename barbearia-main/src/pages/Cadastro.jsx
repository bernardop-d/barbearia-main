import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { criarBarbeariaAtual, verificarSlug } from '../services/supabase'

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

export default function Cadastro() {
  const navigate = useNavigate()
  const { signup, login } = useAuth()

  const [step,    setStep]    = useState(1)
  const [email,   setEmail]   = useState('')
  const [senha,   setSenha]   = useState('')
  const [nome,    setNome]    = useState('')
  const [slug,    setSlug]    = useState('')
  const [slugOk,  setSlugOk]  = useState(null)
  const [checking, setChecking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const checkSlug = useCallback(async (s) => {
    if (s.length < 3) { setSlugOk(null); return }
    setChecking(true)
    const ok = await verificarSlug(s)
    setSlugOk(ok)
    setChecking(false)
  }, [])

  function handleNome(v) {
    setNome(v)
    const s = slugify(v)
    setSlug(s)
    checkSlug(s)
  }

  function handleSlug(v) {
    const s = v.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 50)
    setSlug(s)
    checkSlug(s)
  }

  async function handleConta(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signup(email, senha)
      await login(email, senha)
      setStep(2)
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('already registered')) setError('Email já cadastrado. Tente fazer login.')
      else if (msg.includes('Password'))      setError('Senha muito curta. Mínimo 6 caracteres.')
      else setError('Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleBarbearia(e) {
    e.preventDefault()
    if (!slug || slug.length < 3) { setError('Endereço muito curto.'); return }
    if (slugOk === false)          { setError('Esse endereço não está disponível.'); return }
    setError('')
    setLoading(true)
    try {
      await criarBarbeariaAtual(nome.trim(), slug)
      setStep(3)
    } catch (err) {
      if (err.message?.includes('duplicate')) setError('Endereço já em uso. Escolha outro.')
      else setError('Erro ao criar barbearia. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const base = window.location.href.replace(/[^/]*$/, '').replace(/\/?$/, '/')
  const bookingUrl = `${base}booking/?b=${slug}`

  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/login" className="text-ink-500 text-sm hover:text-ink-300 transition-colors block mb-4">
            ← Voltar
          </Link>
          <Link to="/" className="font-display text-3xl text-gradient tracking-widest inline-block">
            Your Barber
          </Link>
          <p className="text-ink-400 text-sm mt-1">Criar sua conta</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all
                ${step > n  ? 'bg-blade-500 border-blade-500 text-ink'
                : step === n ? 'border-blade-500 text-blade-400 bg-blade-500/10'
                : 'border-ink-700 text-ink-600'}`}
              >
                {step > n ? '✓' : n}
              </div>
              {n < 3 && <div className={`flex-1 h-px transition-all ${step > n ? 'bg-blade-500' : 'bg-ink-800'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Conta */}
        {step === 1 && (
          <form onSubmit={handleConta} className="card flex flex-col gap-4 animate-fade-in">
            <div>
              <h2 className="font-display text-2xl text-white tracking-wide mb-1">Sua conta</h2>
              <p className="text-ink-400 text-sm">Email e senha para acessar o painel</p>
            </div>

            <div>
              <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">Email</label>
              <input
                type="email" required className="input"
                placeholder="seu@email.com"
                value={email} onChange={e => setEmail(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">Senha</label>
              <input
                type="password" required minLength={6} className="input"
                placeholder="Mínimo 6 caracteres"
                value={senha} onChange={e => setSenha(e.target.value)}
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Criando conta...' : 'Continuar →'}
            </button>

            <p className="text-center text-ink-500 text-xs">
              Já tem conta?{' '}
              <Link to="/login" className="text-blade-400 hover:underline">Entrar</Link>
            </p>
          </form>
        )}

        {/* Step 2: Barbearia */}
        {step === 2 && (
          <form onSubmit={handleBarbearia} className="card flex flex-col gap-4 animate-fade-in">
            <div>
              <h2 className="font-display text-2xl text-white tracking-wide mb-1">Sua barbearia</h2>
              <p className="text-ink-400 text-sm">Como seus clientes vão te encontrar</p>
            </div>

            <div>
              <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">Nome da barbearia</label>
              <input
                className="input"
                placeholder="Ex: Barbearia do João"
                value={nome} onChange={e => handleNome(e.target.value)}
                maxLength={60} required autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">
                Endereço personalizado
                {checking && <span className="ml-2 text-ink-500 font-normal normal-case">verificando...</span>}
                {!checking && slugOk === true  && <span className="ml-2 text-blade-400 font-normal normal-case">✓ disponível</span>}
                {!checking && slugOk === false && <span className="ml-2 text-red-400 font-normal normal-case">indisponível</span>}
              </label>
              <input
                className={`input font-mono text-sm ${slugOk === false ? 'border-red-500/50' : slugOk === true ? 'border-blade-500/50' : ''}`}
                placeholder="minha-barbearia"
                value={slug} onChange={e => handleSlug(e.target.value)}
                maxLength={50} required
              />
              {slug && (
                <p className="text-ink-500 text-xs mt-1.5 truncate">
                  Agendamentos em: <span className="text-ink-300">.../?b={slug}</span>
                </p>
              )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" className="btn-primary" disabled={loading || !slugOk}>
              {loading ? 'Criando barbearia...' : 'Finalizar cadastro →'}
            </button>
          </form>
        )}

        {/* Step 3: Sucesso */}
        {step === 3 && (
          <div className="card flex flex-col gap-6 text-center animate-fade-in">
            <div>
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="font-display text-2xl text-white tracking-wide mb-1">Tudo pronto!</h2>
              <p className="text-ink-400 text-sm">Sua barbearia está configurada e pronta para receber agendamentos.</p>
            </div>

            <div className="bg-ink-700/50 border border-ink-600 rounded-xl p-4 text-left">
              <p className="text-ink-400 text-xs uppercase tracking-wider mb-2">Seu link de agendamento</p>
              <p className="text-blade-400 font-mono text-xs break-all">{bookingUrl}</p>
              <button
                onClick={() => navigator.clipboard?.writeText(bookingUrl)}
                className="mt-2 text-ink-500 text-xs hover:text-ink-300 transition-colors"
              >
                Copiar link
              </button>
            </div>

            <p className="text-ink-400 text-xs">
              Vá em <strong className="text-white">Configurações</strong> no painel para adicionar seu WhatsApp, serviços e horários.
            </p>

            <button onClick={() => navigate('/')} className="btn-primary">
              Acessar painel →
            </button>
          </div>
        )}

        {step < 3 && (
          <p className="text-center text-ink-600 text-xs mt-6">
            <Link to="/termos"      className="hover:text-ink-400">Termos</Link>
            {' · '}
            <Link to="/privacidade" className="hover:text-ink-400">Privacidade</Link>
          </p>
        )}
      </div>
    </div>
  )
}
