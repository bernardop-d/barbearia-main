import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { criarCheckout } from '../services/supabase'

const PRICE_MENSAL = import.meta.env.VITE_STRIPE_PRICE_MENSAL || ''
const PRICE_ANUAL  = import.meta.env.VITE_STRIPE_PRICE_ANUAL  || ''

const ITENS = [
  'Agendamentos ilimitados',
  'Painel admin completo',
  'Controle financeiro e estoque',
  'Serviços e horários configuráveis',
  'Instalável como app no celular',
  'Notificação via WhatsApp',
  'Suporte por WhatsApp',
]

export default function Upgrade() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError] = useState('')

  async function handleAssinar(priceId, plano) {
    if (!priceId) {
      setError('Plano não configurado. Entre em contato com o suporte.')
      return
    }
    setLoadingPlan(plano)
    setError('')
    try {
      const url = await criarCheckout(priceId)
      window.location.href = url
    } catch {
      setError('Erro ao iniciar checkout. Tente novamente.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      {/* Header */}
      <header className="border-b border-ink-800 px-6 py-4">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <span className="font-display text-xl text-gradient tracking-widest">Your Barber</span>
          <button
            onClick={async () => { await logout(); navigate('/') }}
            className="text-ink-500 text-sm hover:text-ink-300 transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">⏰</div>
            <h1 className="font-display text-3xl text-white tracking-wide mb-2">
              Período de teste encerrado
            </h1>
            <p className="text-ink-400 text-sm">
              Escolha um plano para continuar gerenciando sua barbearia
            </p>
          </div>

          {/* Itens incluídos */}
          <div className="card mb-6">
            <p className="text-xs text-ink-400 uppercase tracking-wider mb-3">Tudo incluso</p>
            <ul className="flex flex-col gap-2">
              {ITENS.map(item => (
                <li key={item} className="flex items-center gap-2 text-sm text-ink-300">
                  <span className="text-blade-400 shrink-0">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Planos */}
          <div className="flex flex-col gap-3 mb-4">
            {/* Anual — destaque */}
            <div className="card border-blade-500/30 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blade-500 text-ink text-xs font-bold">
                Mais popular
              </div>
              <div className="flex items-center justify-between mb-4 pt-2">
                <div>
                  <p className="text-white font-semibold">Anual</p>
                  <p className="text-blade-400 text-xs">2 meses grátis</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl text-white">R$490</p>
                  <p className="text-ink-400 text-xs">/ano</p>
                </div>
              </div>
              <button
                onClick={() => handleAssinar(PRICE_ANUAL, 'anual')}
                disabled={loadingPlan !== null}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loadingPlan === 'anual' ? 'Redirecionando...' : 'Assinar por R$490/ano'}
              </button>
            </div>

            {/* Mensal */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white font-semibold">Mensal</p>
                  <p className="text-ink-400 text-xs">Cancele quando quiser</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl text-white">R$49</p>
                  <p className="text-ink-400 text-xs">/mês</p>
                </div>
              </div>
              <button
                onClick={() => handleAssinar(PRICE_MENSAL, 'mensal')}
                disabled={loadingPlan !== null}
                className="w-full py-3 rounded-xl border border-ink-600 text-ink-300 text-sm font-medium hover:border-ink-500 hover:text-white transition-all disabled:opacity-50"
              >
                {loadingPlan === 'mensal' ? 'Redirecionando...' : 'Assinar por R$49/mês'}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center mt-2">{error}</p>
          )}

          <p className="text-center text-ink-600 text-xs mt-4">
            Pagamento seguro via Stripe · Cancele a qualquer momento
          </p>
        </div>
      </div>
    </div>
  )
}
