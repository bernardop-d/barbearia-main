import { useState, useEffect, useMemo } from 'react'
import {
  supabase, criarAgendamentoPublico, buscarHorariosOcupados,
  buscarDiasBloqueados, buscarConfig, getServicosCustom,
  buscarMeusAgendamentos, getAgendamentos,
  atualizarStatus, removerAgendamento, login, logout,
  getBarbeariaPorSlug,
} from './services/supabase'

const SERVICOS_BASE = [
  { id: 'corte',       label: 'Corte Normal',   preco: 35,  desc: 'Corte tradicional' },
  { id: 'combo',       label: 'Cabelo + Barba', preco: 55,  desc: 'Corte + barba completa' },
  { id: 'platinado',   label: 'Platinado',      preco: 60,  desc: 'Descoloração completa' },
  { id: 'tinta',       label: 'Tinta Preta',    preco: 15,  desc: 'Adicional de tinta' },
  { id: 'mensal',      label: 'Plano Mensal',   preco: 80,  desc: 'Corte todo mês' },
  { id: 'mensaltinta', label: 'Mensal + Tinta', preco: 100, desc: 'Corte mensal + tinta' },
]

const HORARIOS_DEFAULT = { inicio: 6, fim: 17, intervalo: 60 }

function gerarSlots(cfg) {
  const { inicio, fim, intervalo } = { ...HORARIOS_DEFAULT, ...(cfg || {}) }
  const slots = []
  for (let m = inicio * 60; m <= fim * 60; m += intervalo) {
    const h = Math.floor(m / 60)
    const min = m % 60
    slots.push(`${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`)
  }
  return slots
}

function hojeISO() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
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
    if (parseInt(w.slice(0, 2)) < 11) return 'DDD inválido.'
  }
  return null
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('booking') // 'booking' | 'meushorarios' | 'admin'

  // barbearia multi-tenant (slug vem de ?b=slug na URL)
  const [barbearia,       setBarbearia]       = useState(null)
  const [loadingBarb,     setLoadingBarb]     = useState(true)
  const slug = new URLSearchParams(window.location.search).get('b')

  const [step,            setStep]            = useState(1)
  const [allServicos,     setAllServicos]     = useState(SERVICOS_BASE)
  const [servico,         setServico]         = useState(SERVICOS_BASE[0])
  const [form,            setForm]            = useState({ nome: '', whatsapp: '', data: hojeISO() })
  const [horaSelecionada, setHoraSelecionada] = useState(null)
  const [horasOcupadas,   setHorasOcupadas]   = useState([])
  const [diasBloqueados,  setDiasBloqueados]  = useState([])
  const [almocoConfig,      setAlmocoConfig]      = useState(null)
  const [horariosConfig,    setHorariosConfig]    = useState(null)
  const [whatsappBarbearia, setWhatsappBarbearia] = useState(null)
  const [loadingSlots,    setLoadingSlots]    = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')
  const [resultado,       setResultado]       = useState(null)
  const [adminUser,       setAdminUser]       = useState(null)

  const bid           = barbearia?.id ?? null
  const nomeBarbearia = barbearia?.nome || 'Barbearia'

  // Carregar barbearia pelo slug
  useEffect(() => {
    if (!slug) { setLoadingBarb(false); return }
    getBarbeariaPorSlug(slug).then(b => { setBarbearia(b); setLoadingBarb(false) })
  }, [slug])

  useEffect(() => {
    if (loadingBarb) return
    buscarDiasBloqueados(bid).then(setDiasBloqueados)
    buscarConfig('almoco',    bid).then(setAlmocoConfig)
    buscarConfig('horarios',  bid).then(setHorariosConfig)
    buscarConfig('whatsapp',  bid).then(setWhatsappBarbearia)
    getServicosCustom(bid).then(custom => {
      if (custom.length > 0) {
        setAllServicos([
          ...SERVICOS_BASE,
          ...custom.map(sv => ({ id: sv.id, label: sv.label, preco: sv.preco, desc: sv.desc || '' })),
        ])
      }
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setAdminUser(session.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAdminUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [loadingBarb, bid])

  useEffect(() => {
    if (!form.data) return
    setHoraSelecionada(null)
    setLoadingSlots(true)
    buscarHorariosOcupados(form.data, bid)
      .then(setHorasOcupadas)
      .catch(() => setHorasOcupadas([]))
      .finally(() => setLoadingSlots(false))
  }, [form.data, bid])

  const slots = useMemo(() => gerarSlots(horariosConfig), [horariosConfig])

  const slotDesabilitado = useMemo(() => {
    const agora  = new Date()
    const ehHoje = form.data === hojeISO()
    const tSP    = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo', hour12: false })
    const [horaSP, minSP] = tSP.split(':').map(Number)
    return (slot) => {
      if (horasOcupadas.includes(slot)) return true
      if (ehHoje) {
        const [h, m] = slot.split(':').map(Number)
        if (h < horaSP || (h === horaSP && m <= minSP)) return true
      }
      if (almocoConfig?.ativo) {
        const slotH = parseInt(slot.split(':')[0])
        if (slotH >= almocoConfig.inicio && slotH < almocoConfig.fim) return true
      }
      return false
    }
  }, [horasOcupadas, form.data, almocoConfig])

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validar(form, horaSelecionada)
    if (err) { setError(err); return }
    setError('')
    setLoading(true)
    try {
      const datetime = new Date(`${form.data}T${horaSelecionada}:00`)
      const data = await criarAgendamentoPublico({
        nome:         form.nome.trim(),
        servico:      servico.label,
        preco:        servico.preco,
        data:         datetime.toISOString(),
        whatsapp:     form.whatsapp.replace(/\D/g, ''),
        barbearia_id: bid,
      })
      setResultado(data)
      setStep('success')
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('Horário indisponível')) { setError('Horário indisponível. Volte e escolha outro.'); setStep(2) }
      else if (msg.includes('já tem um agendamento')) setError(msg)
      else if (msg.includes('Serviço inválido') || msg.includes('Data inválida')) setError(msg)
      else setError('Erro ao agendar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function resetar() {
    setStep(1); setServico(allServicos[0])
    setForm({ nome: '', whatsapp: '', data: hojeISO() })
    setHoraSelecionada(null); setResultado(null); setError('')
  }

  // ─── Views ─────────────────────────────────────────────────────────────────
  if (view === 'meushorarios') {
    return <MeusAgendamentos onClose={() => setView('booking')} barbearia={barbearia} />
  }

  if (view === 'admin') {
    return (
      <AdminSection
        user={adminUser}
        bid={bid}
        nomeBarbearia={nomeBarbearia}
        onLogout={async () => { await logout(); setAdminUser(null) }}
        onClose={() => setView('booking')}
      />
    )
  }

  if (step === 'success') return <SuccessScreen resultado={resultado} nomeBarbearia={nomeBarbearia} whatsappBarbearia={whatsappBarbearia} onNovo={resetar} onMeusHorarios={() => setView('meushorarios')} />

  // ─── Public booking ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-ink text-white">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-b from-ink-800 to-ink border-b border-ink-700">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-blade-500/8 blur-3xl rounded-full" />
        </div>
        <div className="relative max-w-sm mx-auto px-6 py-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blade-500/10 border border-blade-500/20 mb-5">
            <ScissorsIcon />
          </div>
          <h1 className="font-display text-5xl tracking-widest text-white leading-none mb-1">{nomeBarbearia}</h1>
          <p className="text-blade-400 text-sm font-medium tracking-wider uppercase mb-1">Agendamento online</p>
          <button
            onClick={() => setView('meushorarios')}
            className="text-ink-400 text-xs hover:text-blade-400 transition-colors"
          >
            Ver meus agendamentos →
          </button>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="max-w-sm mx-auto px-6 pt-6 pb-2">
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border transition-all
                ${step >= n ? 'bg-blade-500 border-blade-500 text-ink' : 'bg-transparent border-ink-600 text-ink-500'}`}>
                {step > n ? '✓' : n}
              </div>
              {n < 3 && <div className={`flex-1 h-px transition-all ${step > n ? 'bg-blade-500' : 'bg-ink-700'}`} />}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-ink-500 uppercase tracking-wider">
          <span>Serviço</span>
          <span className="ml-3">Data &amp; Hora</span>
          <span>Seus dados</span>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-6 py-6">

        {/* STEP 1: Serviço */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-1">Qual serviço?</h2>
            <p className="text-ink-400 text-sm mb-5">Escolha o que você precisa</p>
            <div className="flex flex-col gap-3">
              {allServicos.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setServico(s); setStep(2) }}
                  className="flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 active:scale-95 text-left bg-ink-800 border-ink-700 hover:border-blade-500/40 hover:bg-blade-500/5 group"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-white group-hover:text-blade-400 transition-colors">{s.label}</p>
                    <p className="text-ink-400 text-xs mt-0.5">{s.desc}</p>
                  </div>
                  <p className="font-mono font-bold text-sm text-blade-400">{formatarMoeda(s.preco)}</p>
                  <span className="text-ink-600 group-hover:text-blade-400 text-lg transition-colors">›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Data e Hora */}
        {step === 2 && (
          <div className="animate-fade-in">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-blade-500/8 border border-blade-500/20 mb-5 text-left"
            >
              <div className="flex-1">
                <p className="text-blade-400 text-sm font-semibold">{servico.label}</p>
                <p className="text-ink-400 text-xs">{formatarMoeda(servico.preco)} · toque para alterar</p>
              </div>
              <span className="text-ink-400 text-xs font-medium">alterar</span>
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Quando?</h2>
            <p className="text-ink-400 text-sm mb-5">Escolha data e horário</p>

            <div className="mb-5">
              <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">Data</label>
              <input
                type="date"
                className="input"
                min={hojeISO()}
                value={form.data}
                onChange={e => setForm(prev => ({ ...prev, data: e.target.value }))}
              />
              {form.data && <p className="text-blade-400/70 text-xs mt-2 ml-1">{formatarData(form.data)}</p>}
            </div>

            <div className="mb-6">
              <label className="block text-xs text-ink-400 font-medium mb-3 uppercase tracking-wider">Horário</label>
              {diasBloqueados.includes(form.data) ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-4 text-red-400 text-sm text-center">
                  Sem atendimento nessa data. Escolha outro dia.
                </div>
              ) : loadingSlots ? (
                <div className="flex items-center justify-center gap-2 py-8 text-ink-500 text-sm">
                  <Spinner /> Verificando disponibilidade...
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map(slot => {
                    const ocupado = slotDesabilitado(slot)
                    const ativo   = horaSelecionada === slot
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={ocupado}
                        onClick={() => setHoraSelecionada(slot)}
                        className={`py-3 rounded-xl text-sm font-semibold border transition-all duration-150 active:scale-95
                          ${ocupado
                            ? 'bg-ink-800/30 border-ink-700/50 text-ink-600 cursor-not-allowed line-through'
                            : ativo
                              ? 'bg-blade-500 border-blade-500 text-ink font-bold shadow-lg shadow-blade-500/20'
                              : 'bg-ink-800 border-ink-700 text-ink-300 hover:border-blade-500/50 hover:text-blade-400'
                          }`}
                      >
                        {slot}
                      </button>
                    )
                  })}
                </div>
              )}
              {!diasBloqueados.includes(form.data) && !loadingSlots && slots.every(s => slotDesabilitado(s)) && (
                <p className="text-center text-ink-500 text-xs mt-3">Sem horários disponíveis nessa data. Escolha outro dia.</p>
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

        {/* STEP 3: Dados */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="animate-fade-in">
            <div className="card mb-5 flex flex-col gap-2">
              <Row label="Serviço" value={servico.label} />
              <Row label="Data"    value={formatarData(form.data)} />
              <Row label="Horário" value={horaSelecionada || ''} />
              <div className="pt-2 mt-1 border-t border-ink-700 flex items-center justify-between">
                <span className="text-ink-400 text-xs uppercase tracking-wider">Total</span>
                <span className="text-blade-400 font-mono font-bold">{formatarMoeda(servico.preco)}</span>
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-1">Seus dados</h2>
            <p className="text-ink-400 text-sm mb-5">Quase lá! Informe o WhatsApp para consultar seus horários depois</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">Nome completo *</label>
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
                  WhatsApp <span className="normal-case text-ink-500 font-normal">(para ver seus horários)</span>
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
                {loading ? <span className="flex items-center justify-center gap-2"><Spinner /> Confirmando...</span> : 'Confirmar agendamento'}
              </button>

              <button type="button" onClick={() => setStep(2)} className="text-ink-500 text-sm text-center hover:text-ink-300 transition-colors py-1">
                ← Voltar
              </button>
            </div>
          </form>
        )}
      </div>

      <p className="text-center text-ink-600 text-xs pb-6 space-x-2">
        <span>{nomeBarbearia} © {new Date().getFullYear()}</span>
        <span>·</span>
        <button onClick={() => setView('admin')} className="hover:text-ink-400 transition-colors">Admin</button>
        <span>·</span>
        <a href="mailto:contato.bernardopd@gmail.com" className="hover:text-ink-400 transition-colors">by BPD</a>
      </p>
    </div>
  )
}

// ─── Meus Agendamentos (cliente) ──────────────────────────────────────────────
function MeusAgendamentos({ onClose, barbearia }) {
  const [tel,          setTel]          = useState('')
  const [agendamentos, setAgendamentos] = useState([])
  const [loading,      setLoading]      = useState(false)
  const [buscado,      setBuscado]      = useState(false)
  const [error,        setError]        = useState('')

  async function buscar(e) {
    e.preventDefault()
    const digits = tel.replace(/\D/g, '')
    if (digits.length < 10) { setError('Informe um WhatsApp válido.'); return }
    setError('')
    setLoading(true)
    try {
      const data = await buscarMeusAgendamentos(digits, barbearia?.id ?? null)
      setAgendamentos(data)
      setBuscado(true)
    } catch {
      setError('Erro ao buscar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const statusCfg = {
    confirmado: { label: 'Confirmado', cls: 'bg-blade-500/10 border-blade-500/30 text-blade-400' },
    finalizado: { label: 'Finalizado', cls: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' },
    cancelado:  { label: 'Cancelado',  cls: 'bg-red-500/10 border-red-500/30 text-red-400' },
  }

  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="bg-ink-800 border-b border-ink-700 px-6 py-4">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl tracking-widest">{barbearia?.nome || 'Barbearia'}</h1>
            <p className="text-ink-400 text-xs">Meus agendamentos</p>
          </div>
          <button onClick={onClose} className="text-ink-400 text-sm hover:text-white transition-colors">← Voltar</button>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-6 py-8">
        <p className="text-ink-400 text-sm mb-6">
          Informe o WhatsApp que você usou ao agendar para ver seus horários.
        </p>

        <form onSubmit={buscar} className="flex flex-col gap-4 mb-8">
          <div>
            <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">Seu WhatsApp</label>
            <input
              type="tel"
              className="input"
              placeholder="(11) 99999-9999"
              value={tel}
              autoFocus
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                let masked = digits
                if (digits.length > 2)  masked = `(${digits.slice(0,2)}) ${digits.slice(2)}`
                if (digits.length > 7)  masked = `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
                if (digits.length > 10) masked = `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7,11)}`
                setTel(masked)
              }}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || tel.replace(/\D/g, '').length < 10}
          >
            {loading
              ? <span className="flex items-center justify-center gap-2"><Spinner /> Buscando...</span>
              : 'Ver meus agendamentos'}
          </button>
        </form>

        {buscado && (
          agendamentos.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-ink-400 text-sm">Nenhum agendamento encontrado para este número.</p>
              <p className="text-ink-500 text-xs mt-2">Verifique se o número está correto.</p>
            </div>
          ) : (
            <div>
              <p className="text-ink-400 text-xs mb-4 uppercase tracking-wider">{agendamentos.length} agendamento(s) encontrado(s)</p>
              <div className="flex flex-col gap-3">
                {agendamentos.map(a => {
                  const st = statusCfg[a.status] || statusCfg.confirmado
                  const data = new Date(a.data)
                  const futuro = data > new Date() && a.status === 'confirmado'
                  return (
                    <div key={a.id} className={`card ${futuro ? 'border-blade-500/20' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-white font-semibold">{a.servico}</p>
                          <p className="text-ink-400 text-sm mt-1">
                            {data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, s => s.toUpperCase())}
                          </p>
                          <p className="text-ink-400 text-sm">
                            às {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-blade-400 font-mono font-bold text-sm">{formatarMoeda(a.preco)}</p>
                          <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${st.cls}`}>
                            {st.label}
                          </span>
                        </div>
                      </div>
                      {futuro && (
                        <p className="text-ink-500 text-xs mt-3 pt-3 border-t border-ink-700">
                          Para cancelar, entre em contato com a barbearia.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ─── Admin section ────────────────────────────────────────────────────────────
function AdminSection({ user, bid, nomeBarbearia, onLogout, onClose }) {
  return user ? (
    <AdminPanel user={user} bid={bid} nomeBarbearia={nomeBarbearia} onLogout={onLogout} onClose={onClose} />
  ) : (
    <AdminLogin nomeBarbearia={nomeBarbearia} onClose={onClose} />
  )
}

function AdminLogin({ nomeBarbearia, onClose }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) { setError('Preencha email e senha.'); return }
    setError(''); setLoading(true)
    try {
      await login(email, password)
    } catch {
      setError('Email ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blade-500/10 border border-blade-500/20 mb-4">
            <ScissorsIcon />
          </div>
          <h1 className="font-display text-4xl tracking-widest text-white">{nomeBarbearia}</h1>
          <p className="text-ink-400 text-sm mt-1">Área administrativa</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">Email</label>
            <input type="email" className="input" placeholder="admin@email.com" value={email} autoFocus onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">Senha</label>
            <input type="password" className="input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <span className="flex items-center justify-center gap-2"><Spinner /> Entrando...</span> : 'Entrar'}
          </button>
          <button type="button" onClick={onClose} className="text-ink-500 text-sm text-center hover:text-ink-300 transition-colors py-1">← Voltar ao site</button>
        </form>
      </div>
    </div>
  )
}

const STATUS_CFG = {
  confirmado: { label: 'Confirmado', bg: 'bg-blade-500/10', border: 'border-blade-500/30', text: 'text-blade-400' },
  finalizado: { label: 'Finalizado', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  cancelado:  { label: 'Cancelado',  bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400' },
}

function AdminPanel({ user, bid, nomeBarbearia, onLogout, onClose }) {
  const [agendamentos, setAgendamentos] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [filtro,       setFiltro]       = useState('todos')
  const [busca,        setBusca]        = useState('')

  async function fetchData() {
    try {
      setError('')
      const data = await getAgendamentos(bid)
      setAgendamentos(data)
    } catch {
      setError('Erro ao carregar agendamentos. Verifique sua conexão.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const lista = useMemo(() => {
    let r = [...agendamentos]
    if (filtro !== 'todos') r = r.filter(a => a.status === filtro)
    if (busca.trim()) {
      const q = busca.toLowerCase()
      r = r.filter(a => a.nome.toLowerCase().includes(q) || a.servico.toLowerCase().includes(q))
    }
    return r
  }, [agendamentos, filtro, busca])

  const stats = useMemo(() => {
    const agora = new Date()
    const ini = new Date(agora); ini.setHours(0, 0, 0, 0)
    const fim = new Date(agora); fim.setHours(23, 59, 59, 999)
    let hoje = 0, confirmados = 0, receitaHoje = 0
    for (const a of agendamentos) {
      const d = new Date(a.data)
      if (a.status === 'confirmado') confirmados++
      if (d >= ini && d <= fim) { hoje++; if (a.status === 'finalizado') receitaHoje += Number(a.preco) }
    }
    return { hoje, confirmados, receitaHoje }
  }, [agendamentos])

  async function handleStatus(id, status, label) {
    if (!window.confirm(`Confirma: ${label} este agendamento?`)) return
    try {
      await atualizarStatus(id, status)
      await fetchData()
    } catch {
      setError(`Erro ao ${label.toLowerCase()} agendamento.`)
    }
  }

  async function handleRemover(id, nome) {
    if (!window.confirm(`Remover o agendamento de ${nome}? Esta ação não pode ser desfeita.`)) return
    try {
      await removerAgendamento(id)
      await fetchData()
    } catch {
      setError('Erro ao remover agendamento.')
    }
  }

  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="bg-ink-800 border-b border-ink-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl tracking-widest text-white">{nomeBarbearia}</h1>
            <p className="text-ink-400 text-xs">Área administrativa · {user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-ink-400 text-sm hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-ink-700 hover:border-ink-600">
              Site público
            </button>
            <button onClick={onLogout} className="text-ink-400 text-sm hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-ink-700 hover:border-ink-600">
              Sair
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4" role="alert">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card text-center">
            <p className="text-2xl font-bold text-white">{stats.hoje}</p>
            <p className="text-ink-400 text-xs uppercase tracking-wider mt-1">Hoje</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-blade-400">{stats.confirmados}</p>
            <p className="text-ink-400 text-xs uppercase tracking-wider mt-1">Confirmados</p>
          </div>
          <div className="card text-center">
            <p className="text-lg font-bold text-yellow-400">{formatarMoeda(stats.receitaHoje)}</p>
            <p className="text-ink-400 text-xs uppercase tracking-wider mt-1">Receita hoje</p>
          </div>
        </div>

        <div className="relative mb-4">
          <input
            type="text"
            className="input pl-10"
            placeholder="Buscar por nome ou serviço..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'confirmado', label: 'Confirmados' },
            { id: 'finalizado', label: 'Finalizados' },
            { id: 'cancelado',  label: 'Cancelados' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap
                ${filtro === f.id ? 'bg-blade-500/10 border-blade-500/30 text-blade-400' : 'bg-ink-800 border-ink-700 text-ink-400 hover:border-ink-600'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-ink-500 gap-3">
            <Spinner /> Carregando agendamentos...
          </div>
        ) : lista.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-ink-400 text-sm">Nenhum agendamento encontrado</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {lista.map(a => (
              <AdminCard
                key={a.id}
                agendamento={a}
                nomeBarbearia={nomeBarbearia}
                onStatus={handleStatus}
                onRemover={handleRemover}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AdminCard({ agendamento, nomeBarbearia, onStatus, onRemover }) {
  const [open, setOpen] = useState(false)
  const st   = STATUS_CFG[agendamento.status] || STATUS_CFG.confirmado
  const data = new Date(agendamento.data)

  return (
    <div className="card p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-ink-700/30 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-blade-500/10 border border-blade-500/20 flex items-center justify-center shrink-0">
          <span className="text-blade-400 font-bold text-sm">{agendamento.nome[0].toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{agendamento.nome}</p>
          <p className="text-ink-400 text-xs mt-0.5">
            {agendamento.servico} · {data.toLocaleDateString('pt-BR')} às {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-blade-400 font-mono font-bold text-sm">{formatarMoeda(agendamento.preco)}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${st.bg} ${st.border} ${st.text}`}>
            {st.label}
          </span>
        </div>
        <span className={`text-ink-500 text-lg transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
      </button>

      {open && (
        <div className="border-t border-ink-700 px-4 py-3 flex flex-wrap gap-2">
          {agendamento.status === 'confirmado' && (
            <>
              <button
                onClick={() => onStatus(agendamento.id, 'finalizado', 'Finalizar')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
              >
                Finalizar
              </button>
              <button
                onClick={() => onStatus(agendamento.id, 'cancelado', 'Cancelar')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Cancelar
              </button>
            </>
          )}
          {agendamento.status === 'cancelado' && (
            <button
              onClick={() => onStatus(agendamento.id, 'confirmado', 'Reativar')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blade-500/10 border border-blade-500/30 text-blade-400 hover:bg-blade-500/20 transition-colors"
            >
              Reativar
            </button>
          )}
          {agendamento.whatsapp && (
            <a
              href={`https://wa.me/55${agendamento.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, ${agendamento.nome}! Seu agendamento na *${nomeBarbearia}* está confirmado para ${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Te esperamos!`)}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blade-500/8 border border-blade-500/20 text-blade-400 hover:bg-blade-500/20 transition-colors"
            >
              WhatsApp
            </a>
          )}
          <button
            onClick={() => onRemover(agendamento.id, agendamento.nome)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/8 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors ml-auto"
          >
            Remover
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Success screen ───────────────────────────────────────────────────────────
function SuccessScreen({ resultado, nomeBarbearia, whatsappBarbearia, onNovo, onMeusHorarios }) {
  const data = new Date(resultado.data)
  const dataFmt = data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, s => s.toUpperCase())
  const horaFmt = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const waMsg   = encodeURIComponent(
    `Olá, *${nomeBarbearia}*! Confirmei meu agendamento online:\n\n` +
    `*${resultado.nome}* — ${resultado.servico}\n${dataFmt} às ${horaFmt}`
  )

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <div className="h-1 bg-gradient-to-r from-transparent via-blade-500 to-transparent" />
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blade-500/10 border-2 border-blade-500/30 mb-4">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00e87a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="font-display text-5xl text-white tracking-wide">Confirmado!</h2>
            <p className="text-blade-400 text-sm mt-1">Seu agendamento está garantido</p>
          </div>
          <div className="card mb-6 flex flex-col gap-3">
            <Row label="Cliente"  value={resultado.nome} />
            <Row label="Serviço"  value={resultado.servico} />
            <Row label="Data"     value={dataFmt} />
            <Row label="Horário"  value={horaFmt} />
            <div className="pt-3 border-t border-ink-700 flex items-center justify-between">
              <span className="text-ink-400 text-sm font-medium">Total</span>
              <span className="text-blade-400 font-mono font-bold text-lg">{formatarMoeda(resultado.preco)}</span>
            </div>
          </div>
          <div className="bg-ink-800 border border-ink-700 rounded-xl px-4 py-3 mb-4 text-center">
            <p className="text-ink-400 text-xs">Apareça no horário marcado. Em caso de imprevisto, avise com antecedência.</p>
          </div>
          {whatsappBarbearia && (
            <a
              href={`https://wa.me/55${String(whatsappBarbearia).replace(/\D/g,'')}?text=${waMsg}`}
              target="_blank" rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-green-600/30 bg-green-600/10 text-green-400 text-sm font-medium mb-3 active:scale-95 transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Enviar confirmação no WhatsApp
            </a>
          )}
          <button onClick={onNovo} className="btn-primary mb-3">Fazer outro agendamento</button>
          {resultado.whatsapp && (
            <button
              onClick={onMeusHorarios}
              className="w-full py-3 rounded-xl border border-ink-700 text-ink-400 text-sm font-medium hover:border-ink-600 hover:text-white transition-colors"
            >
              Ver meus agendamentos
            </button>
          )}
        </div>
      </div>
      <p className="text-center text-ink-600 text-xs pb-6 space-x-2">
        <span>{nomeBarbearia} © {new Date().getFullYear()}</span>
        <span>·</span>
        <a href="mailto:contato.bernardopd@gmail.com" className="hover:text-ink-400 transition-colors">by BPD</a>
      </p>
    </div>
  )
}

// ─── Shared components ────────────────────────────────────────────────────────
function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink-400 text-xs uppercase tracking-wider shrink-0">{label}</span>
      <span className="text-white font-medium text-sm text-right">{value}</span>
    </div>
  )
}

function ScissorsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00e87a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
