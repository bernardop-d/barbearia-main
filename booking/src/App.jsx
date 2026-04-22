import { useState, useEffect, useMemo } from 'react'
import { criarAgendamentoPublico, buscarHorariosOcupados, buscarDiasBloqueados } from './services/supabase'

const SERVICOS = [
  { id: 'corte',       label: 'Corte Normal',   preco: 35,  emoji: '✂️', desc: 'Tesoura e máquina' },
  { id: 'combo',       label: 'Cabelo + Barba', preco: 55,  emoji: '💈', desc: 'Corte + barba completa' },
  { id: 'platinado',   label: 'Platinado',      preco: 60,  emoji: '⚡', desc: 'Descoloração completa' },
  { id: 'tinta',       label: 'Tinta Preta',    preco: 15,  emoji: '🖤', desc: 'Adicional de tinta' },
  { id: 'mensal',      label: 'Plano Mensal',   preco: 80,  emoji: '📅', desc: 'Corte todo mês' },
  { id: 'mensaltinta', label: 'Mensal + Tinta', preco: 100, emoji: '💎', desc: 'Corte mensal + tinta' },
]

const HORARIOS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatarData(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).replace(/^./, s => s.toUpperCase())
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

function validar(form, horaSelecionada) {
  const nome = form.nome.trim()
  if (!nome) return 'Informe seu nome.'
  if (nome.length < 2) return 'Nome muito curto.'
  if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nome)) return 'Nome inválido (só letras).'
  if (!form.data) return 'Escolha a data.'
  if (form.data < hojeISO()) return 'Data inválida.'
  if (horaSelecionada === null) return 'Escolha um horário.'
  const w = form.whatsapp.replace(/\D/g, '')
  if (w) {
    if (w.length < 10 || w.length > 11) return 'WhatsApp inválido (DDD + número).'
    const ddd = parseInt(w.slice(0, 2))
    if (ddd < 11) return 'DDD inválido.'
  }
  return null
}

export default function App() {
  const [step,           setStep]           = useState(1)
  const [servico,        setServico]        = useState(null)
  const [form,           setForm]           = useState({ nome: '', whatsapp: '', data: hojeISO() })
  const [horaSelecionada, setHoraSelecionada] = useState(null)
  const [horasOcupadas,  setHorasOcupadas]  = useState([])
  const [diasBloqueados, setDiasBloqueados] = useState([])
  const [loadingSlots,   setLoadingSlots]   = useState(false)
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState('')
  const [resultado,      setResultado]      = useState(null)

  useEffect(() => {
    buscarDiasBloqueados().then(setDiasBloqueados)
  }, [])

  useEffect(() => {
    if (!form.data) return
    setHoraSelecionada(null)
    setLoadingSlots(true)
    buscarHorariosOcupados(form.data)
      .then(setHorasOcupadas)
      .catch(() => setHorasOcupadas([]))
      .finally(() => setLoadingSlots(false))
  }, [form.data])

  const slotDesabilitado = useMemo(() => {
    const agora  = new Date()
    const ehHoje = form.data === hojeISO()
    return (hora) => {
      if (horasOcupadas.includes(hora)) return true
      if (ehHoje && hora <= agora.getHours()) return true
      return false
    }
  }, [horasOcupadas, form.data])

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validar(form, horaSelecionada)
    if (err) { setError(err); return }
    setError('')
    setLoading(true)
    try {
      const datetime = new Date(`${form.data}T${String(horaSelecionada).padStart(2, '0')}:00:00`)
      const data = await criarAgendamentoPublico({
        nome:     form.nome.trim(),
        servico:  servico.label,
        preco:    servico.preco,
        data:     datetime.toISOString(),
        whatsapp: form.whatsapp.replace(/\D/g, ''),
      })
      setResultado(data)
      setStep('success')
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('Horário indisponível')) {
        setError('Horário indisponível. Volte e escolha outro.')
        setStep(2)
      } else if (msg.includes('já tem um agendamento')) {
        setError(msg)
      } else if (msg.includes('Serviço inválido') || msg.includes('Data inválida')) {
        setError(msg)
      } else {
        setError('Erro ao agendar. Tente novamente.')
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function resetar() {
    setStep(1)
    setServico(null)
    setForm({ nome: '', whatsapp: '', data: hojeISO() })
    setHoraSelecionada(null)
    setResultado(null)
    setError('')
  }

  if (step === 'success') return <SuccessScreen resultado={resultado} onNovo={resetar} />

  return (
    <div className="min-h-screen bg-ink text-white">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-b from-ink-800 to-ink border-b border-ink-700">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-blade-500/8 blur-3xl rounded-full" />
        </div>
        <div className="relative max-w-sm mx-auto px-6 py-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blade-500/10 border border-blade-500/20 mb-5">
            <ScissorsIcon />
          </div>
          <h1 className="font-display text-5xl tracking-widest text-white leading-none mb-1">DUNGABARBER</h1>
          <p className="text-blade-400 text-sm font-medium tracking-wider uppercase mb-1">Agendamento online</p>
          <p className="text-ink-400 text-xs">Marque seu horário em menos de 1 minuto</p>
        </div>
      </div>

      {/* Steps indicator */}
      {step !== 'success' && (
        <div className="max-w-sm mx-auto px-6 pt-6 pb-2">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border transition-all
                  ${step >= n
                    ? 'bg-blade-500 border-blade-500 text-ink'
                    : 'bg-transparent border-ink-600 text-ink-500'
                  }`}>
                  {step > n ? '✓' : n}
                </div>
                {n < 3 && <div className={`flex-1 h-px transition-all ${step > n ? 'bg-blade-500' : 'bg-ink-700'}`} />}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-ink-500 uppercase tracking-wider">
            <span>Serviço</span>
            <span className="ml-3">Data & Hora</span>
            <span>Seus dados</span>
          </div>
        </div>
      )}

      <div className="max-w-sm mx-auto px-6 py-6">

        {/* STEP 1: Serviço */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-1">Qual serviço?</h2>
            <p className="text-ink-400 text-sm mb-5">Escolha o que você precisa</p>
            <div className="flex flex-col gap-3">
              {SERVICOS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setServico(s); setStep(2) }}
                  className="flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 active:scale-95 text-left bg-ink-800 border-ink-700 hover:border-blade-500/40 hover:bg-blade-500/5 group"
                >
                  <span className="text-2xl w-9 text-center">{s.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-white group-hover:text-blade-400 transition-colors">{s.label}</p>
                    <p className="text-ink-400 text-xs mt-0.5">{s.desc}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-sm text-blade-400">{formatarMoeda(s.preco)}</p>
                  </div>
                  <span className="text-ink-600 group-hover:text-blade-400 text-lg transition-colors">›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Data e Hora */}
        {step === 2 && (
          <div className="animate-fade-in">
            {/* Serviço selecionado */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-3 w-full p-3 rounded-2xl bg-blade-500/8 border border-blade-500/20 mb-5 text-left"
            >
              <span className="text-xl">{servico.emoji}</span>
              <div className="flex-1">
                <p className="text-blade-400 text-sm font-semibold">{servico.label}</p>
                <p className="text-ink-400 text-xs">{formatarMoeda(servico.preco)} · toque para alterar</p>
              </div>
              <span className="text-ink-500 text-sm">✎</span>
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Quando?</h2>
            <p className="text-ink-400 text-sm mb-5">Escolha data e horário</p>

            {/* Data */}
            <div className="mb-5">
              <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">Data</label>
              <input
                type="date"
                className="input"
                min={hojeISO()}
                value={form.data}
                onChange={e => setForm(prev => ({ ...prev, data: e.target.value }))}
              />
              {form.data && (
                <p className="text-blade-400/70 text-xs mt-2 ml-1">{formatarData(form.data)}</p>
              )}
            </div>

            {/* Horários */}
            <div className="mb-6">
              <label className="block text-xs text-ink-400 font-medium mb-3 uppercase tracking-wider">Horário</label>
              {diasBloqueados.includes(form.data) ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-4 text-red-400 text-sm text-center">
                  🔒 Sem atendimento nessa data. Escolha outro dia.
                </div>
              ) : loadingSlots ? (
                <div className="flex items-center justify-center gap-2 py-8 text-ink-500 text-sm">
                  <Spinner /> Verificando disponibilidade...
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {HORARIOS.map(hora => {
                    const ocupado = slotDesabilitado(hora)
                    const ativo   = horaSelecionada === hora
                    return (
                      <button
                        key={hora}
                        type="button"
                        disabled={ocupado}
                        onClick={() => setHoraSelecionada(hora)}
                        className={`py-3 rounded-2xl text-sm font-semibold border transition-all duration-150 active:scale-95
                          ${ocupado
                            ? 'bg-ink-800/30 border-ink-700/50 text-ink-600 cursor-not-allowed line-through'
                            : ativo
                              ? 'bg-blade-500 border-blade-500 text-ink font-bold shadow-lg shadow-blade-500/20'
                              : 'bg-ink-800 border-ink-700 text-ink-300 hover:border-blade-500/50 hover:text-blade-400'
                          }`}
                      >
                        {String(hora).padStart(2, '0')}h
                      </button>
                    )
                  })}
                </div>
              )}
              {!diasBloqueados.includes(form.data) && !loadingSlots && HORARIOS.every(h => slotDesabilitado(h)) && (
                <p className="text-center text-ink-500 text-xs mt-3 py-2">
                  Sem horários disponíveis nessa data. Escolha outro dia.
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={!horaSelecionada}
              onClick={() => setStep(3)}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continuar →
            </button>
          </div>
        )}

        {/* STEP 3: Dados pessoais */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="animate-fade-in">
            {/* Resumo */}
            <div className="card mb-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-ink-400 text-xs uppercase tracking-wider">Serviço</span>
                <span className="text-white text-sm font-semibold">{servico.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-400 text-xs uppercase tracking-wider">Data</span>
                <span className="text-white text-sm">{formatarData(form.data)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-400 text-xs uppercase tracking-wider">Horário</span>
                <span className="text-white text-sm font-semibold">{String(horaSelecionada).padStart(2, '0')}:00</span>
              </div>
              <div className="pt-2 mt-1 border-t border-ink-700 flex items-center justify-between">
                <span className="text-ink-400 text-xs uppercase tracking-wider">Total</span>
                <span className="text-blade-400 font-mono font-bold">{formatarMoeda(servico.preco)}</span>
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-1">Seus dados</h2>
            <p className="text-ink-400 text-sm mb-5">Quase lá! Só precisamos do seu nome</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">
                  Nome completo *
                </label>
                <input
                  className="input"
                  placeholder="João Silva"
                  value={form.nome}
                  maxLength={100}
                  autoFocus
                  onChange={e => setForm(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">
                  WhatsApp <span className="normal-case text-ink-500 font-normal">(opcional)</span>
                </label>
                <input
                  type="tel"
                  className="input"
                  placeholder="(11) 99999-9999"
                  value={form.whatsapp}
                  maxLength={15}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                    let masked = digits
                    if (digits.length > 2)  masked = `(${digits.slice(0,2)}) ${digits.slice(2)}`
                    if (digits.length > 7)  masked = `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
                    if (digits.length > 10) masked = `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7,11)}`
                    setForm(prev => ({ ...prev, whatsapp: masked }))
                  }}
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm" role="alert">
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary mt-1" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner /> Confirmando...
                  </span>
                ) : 'Confirmar agendamento'}
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-ink-500 text-sm text-center hover:text-ink-300 transition-colors py-1"
              >
                ← Voltar
              </button>
            </div>
          </form>
        )}
      </div>

      <p className="text-center text-ink-600 text-xs pb-8">
        DUNGABARBER © {new Date().getFullYear()}
      </p>
    </div>
  )
}

function SuccessScreen({ resultado, onNovo }) {
  const data = new Date(resultado.data)
  return (
    <div className="min-h-screen bg-ink flex flex-col">
      {/* Top accent */}
      <div className="h-1 bg-gradient-to-r from-transparent via-blade-500 to-transparent" />

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blade-500/10 border-2 border-blade-500/30 mb-4">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="font-display text-5xl text-white tracking-wide">Confirmado!</h2>
            <p className="text-blade-400 text-sm mt-1">Seu agendamento está garantido</p>
          </div>

          {/* Card resumo */}
          <div className="card mb-6 flex flex-col gap-4">
            <Row icon="👤" label="Cliente"  value={resultado.nome} />
            <Row icon="✂️" label="Serviço"  value={resultado.servico} />
            <Row icon="📅" label="Data"     value={new Date(resultado.data).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, s => s.toUpperCase())} />
            <Row icon="⏰" label="Horário"  value={data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} />
            <div className="pt-3 border-t border-ink-700 flex items-center justify-between">
              <span className="text-ink-400 text-sm font-medium">Total</span>
              <span className="text-blade-400 font-mono font-bold text-lg">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resultado.preco)}
              </span>
            </div>
          </div>

          <div className="bg-ink-800/50 border border-ink-700 rounded-2xl px-4 py-3 mb-6 text-center">
            <p className="text-ink-400 text-xs">Apareça no horário marcado. Em caso de imprevisto, avise com antecedência.</p>
          </div>

          <button onClick={onNovo} className="btn-primary">
            Fazer outro agendamento
          </button>
        </div>
      </div>

      <p className="text-center text-ink-600 text-xs pb-6">
        DUNGABARBER © {new Date().getFullYear()}
      </p>
    </div>
  )
}

function Row({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl w-8 text-center">{icon}</span>
      <div>
        <p className="text-ink-400 text-xs uppercase tracking-wider">{label}</p>
        <p className="text-white font-medium text-sm">{value}</p>
      </div>
    </div>
  )
}

function ScissorsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
