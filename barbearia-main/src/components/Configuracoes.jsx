// src/components/Configuracoes.jsx
import { useState, useEffect, useCallback } from 'react'
import {
  getBarbeariaAtual,
  getServicosAdmin, criarServico, atualizarServico, removerServico,
  getConfigAdmin, setConfigAdmin,
  getDiasBloqueados, bloquearDia, desbloquearDia,
  abrirPortal, criarCheckout,
} from '../services/supabase'
import { formatarMoeda } from '../utils/formatters'
import { Spinner } from './Icons'
import { hojeISO } from '../utils/formatters'

const ABAS = [
  { id: 'barbearia',  label: 'Barbearia' },
  { id: 'assinatura', label: 'Assinatura' },
  { id: 'servicos',   label: 'Serviços' },
  { id: 'horarios',   label: 'Horários' },
  { id: 'bloqueio',   label: 'Dias bloqueados' },
]

export default function Configuracoes() {
  const [aba,       setAba]       = useState('barbearia')
  const [barbearia, setBarbearia] = useState(null)

  useEffect(() => {
    getBarbeariaAtual().then(setBarbearia)
  }, [])

  const bid = barbearia?.id ?? null

  return (
    <div className="flex flex-col gap-5 animate-slide-up">
      <div>
        <h2 className="font-display text-3xl text-white tracking-wide">Configurações</h2>
        {barbearia && <p className="text-ink-400 text-sm mt-1">{barbearia.nome}</p>}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {ABAS.map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-medium border transition-all duration-200 active:scale-95
              ${aba === a.id
                ? 'bg-blade-500/20 border-blade-500/50 text-blade-400'
                : 'bg-ink-700/40 border-ink-600 text-ink-400'}`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'barbearia'  && <TabBarbearia  bid={bid} />}
      {aba === 'assinatura' && <TabAssinatura barbearia={barbearia} />}
      {aba === 'servicos'   && <TabServicos   bid={bid} />}
      {aba === 'horarios'   && <TabHorarios   bid={bid} />}
      {aba === 'bloqueio'   && <TabBloqueio />}
    </div>
  )
}

// ─── Tab: Barbearia ────────────────────────────────────────────────────────

function TabBarbearia({ bid }) {
  const [whatsapp, setWhatsapp] = useState('')
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState('')

  useEffect(() => {
    getConfigAdmin('whatsapp', bid).then(v => {
      if (v) setWhatsapp(v)
      setLoading(false)
    })
  }, [bid])

  async function handleSalvar(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await setConfigAdmin('whatsapp', whatsapp.replace(/\D/g, ''), bid)
      setToast('WhatsApp salvo! Clientes verão o botão de contato ao agendar.')
    } catch {
      setToast('Erro ao salvar.')
    } finally {
      setSaving(false)
      setTimeout(() => setToast(''), 3000)
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Spinner size={24} /></div>

  return (
    <form onSubmit={handleSalvar} className="flex flex-col gap-4">
      {toast && (
        <div className="bg-blade-500/10 border border-blade-500/30 rounded-xl px-4 py-2 text-blade-400 text-sm text-center">
          {toast}
        </div>
      )}

      <div className="card flex flex-col gap-4">
        <div>
          <label className="block text-xs text-ink-400 font-medium mb-1 uppercase tracking-wider">
            WhatsApp da barbearia
          </label>
          <p className="text-ink-500 text-xs mb-2">
            Aparece como botão de confirmação no agendamento do cliente
          </p>
          <input
            type="tel"
            className="input"
            placeholder="(11) 99999-9999"
            value={whatsapp}
            maxLength={15}
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
              let masked = digits
              if (digits.length > 2)  masked = `(${digits.slice(0,2)}) ${digits.slice(2)}`
              if (digits.length > 7)  masked = `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
              if (digits.length > 10) masked = `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7,11)}`
              setWhatsapp(masked)
            }}
          />
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}

// ─── Tab: Assinatura ───────────────────────────────────────────────────────

const STATUS_LABEL = {
  trial:    { label: 'Período de teste', cls: 'text-blade-400' },
  active:   { label: 'Ativa',            cls: 'text-emerald-400' },
  past_due: { label: 'Pagamento pendente', cls: 'text-orange-400' },
  canceled: { label: 'Cancelada',        cls: 'text-red-400' },
}

function TabAssinatura({ barbearia }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const status = barbearia?.subscription_status || 'trial'
  const info   = STATUS_LABEL[status] || STATUS_LABEL.trial

  const diasTrial = barbearia?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(barbearia.trial_ends_at) - new Date()) / 86400000))
    : null

  const proxRenovacao = barbearia?.subscription_ends_at
    ? new Date(barbearia.subscription_ends_at).toLocaleDateString('pt-BR')
    : null

  async function handlePortal() {
    setLoading(true)
    setError('')
    try {
      const url = await abrirPortal()
      window.location.href = url
    } catch {
      setError('Erro ao abrir portal. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade(priceId) {
    setLoading(true)
    setError('')
    try {
      const url = await criarCheckout(priceId)
      window.location.href = url
    } catch {
      setError('Erro ao iniciar checkout. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-ink-400 text-xs uppercase tracking-wider">Status</p>
          <p className={`font-semibold text-sm ${info.cls}`}>{info.label}</p>
        </div>

        {status === 'trial' && diasTrial !== null && (
          <div className="flex items-center justify-between">
            <p className="text-ink-400 text-xs uppercase tracking-wider">Dias restantes</p>
            <p className={`font-semibold text-sm ${diasTrial <= 3 ? 'text-orange-400' : 'text-white'}`}>
              {diasTrial} {diasTrial === 1 ? 'dia' : 'dias'}
            </p>
          </div>
        )}

        {proxRenovacao && (
          <div className="flex items-center justify-between">
            <p className="text-ink-400 text-xs uppercase tracking-wider">
              {status === 'active' ? 'Próxima cobrança' : 'Encerra em'}
            </p>
            <p className="text-white text-sm">{proxRenovacao}</p>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {status === 'active' && barbearia?.stripe_customer_id && (
        <button onClick={handlePortal} disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? 'Abrindo...' : 'Gerenciar assinatura'}
        </button>
      )}

      {(status === 'trial' || status === 'past_due' || status === 'canceled') && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleUpgrade(import.meta.env.VITE_STRIPE_PRICE_ANUAL)}
            disabled={loading}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? 'Redirecionando...' : 'Assinar Anual — R$490/ano'}
          </button>
          <button
            onClick={() => handleUpgrade(import.meta.env.VITE_STRIPE_PRICE_MENSAL)}
            disabled={loading}
            className="w-full py-3 rounded-xl border border-ink-600 text-ink-300 text-sm font-medium hover:border-ink-500 transition-all disabled:opacity-50"
          >
            Assinar Mensal — R$49/mês
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Serviços ─────────────────────────────────────────────────────────

function TabServicos({ bid }) {
  const [servicos, setServicos] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [formNovo, setFormNovo] = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [toast,    setToast]    = useState('')

  const carregar = useCallback(async () => {
    try {
      setServicos(await getServicosAdmin(bid))
    } catch {}
    finally { setLoading(false) }
  }, [bid])

  useEffect(() => { carregar() }, [carregar])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  async function handleToggleAtivo(s) {
    try {
      await atualizarServico(s.id, { ativo: !s.ativo })
      await carregar()
      showToast(s.ativo ? 'Serviço desativado.' : 'Serviço ativado.')
    } catch { showToast('Erro ao atualizar.') }
  }

  async function handleRemover(id) {
    try {
      await removerServico(id)
      await carregar()
      showToast('Serviço removido.')
    } catch { showToast('Erro ao remover.') }
  }

  async function handleSalvarNovo(dados) {
    await criarServico({ ...dados, barbearia_id: bid })
    setFormNovo(false)
    await carregar()
    showToast('Serviço criado!')
  }

  async function handleSalvarEdit(id, dados) {
    await atualizarServico(id, dados)
    setEditId(null)
    await carregar()
    showToast('Serviço atualizado!')
  }

  return (
    <div className="flex flex-col gap-4">
      {toast && (
        <div className="bg-blade-500/10 border border-blade-500/30 rounded-xl px-4 py-2 text-blade-400 text-sm text-center">
          {toast}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={() => setFormNovo(true)} className="btn-primary text-sm px-4 py-2.5 max-w-fit">
          + Serviço
        </button>
      </div>

      {formNovo && (
        <ServicoForm
          onSalvar={handleSalvarNovo}
          onCancelar={() => setFormNovo(false)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size={24} /></div>
      ) : servicos.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-ink-400 text-sm">Nenhum serviço cadastrado</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {servicos.map(s => (
            editId === s.id ? (
              <ServicoForm
                key={s.id}
                inicial={s}
                onSalvar={(dados) => handleSalvarEdit(s.id, dados)}
                onCancelar={() => setEditId(null)}
              />
            ) : (
              <div key={s.id} className={`card flex flex-col gap-2 ${!s.ativo ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{s.label}</p>
                    {s.desc && <p className="text-ink-400 text-xs mt-0.5 truncate">{s.desc}</p>}
                  </div>
                  <p className="text-blade-400 font-mono text-sm font-medium shrink-0">
                    {formatarMoeda(s.preco)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleAtivo(s)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all active:scale-95
                      ${s.ativo
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-ink-700/40 border-ink-600 text-ink-400'}`}
                  >
                    {s.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                  <button
                    onClick={() => setEditId(s.id)}
                    className="flex-1 py-2 rounded-xl text-xs font-medium bg-ink-700/40 border border-ink-600 text-ink-300 active:scale-95 transition-all"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleRemover(s.id)}
                    className="flex-1 py-2 rounded-xl text-xs font-medium bg-red-500/10 border border-red-500/30 text-red-400 active:scale-95 transition-all"
                  >
                    Remover
                  </button>
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}

function ServicoForm({ inicial, onSalvar, onCancelar }) {
  const [form,    setForm]    = useState({
    label: inicial?.label || '',
    desc:  inicial?.desc  || '',
    preco: inicial?.preco || '',
    ativo: inicial?.ativo ?? true,
  })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.label.trim()) return
    setLoading(true)
    try {
      await onSalvar({
        label: form.label.trim(),
        desc:  form.desc.trim(),
        preco: parseFloat(form.preco) || 0,
        ativo: form.ativo,
      })
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-3">
      <p className="text-white font-medium text-sm">{inicial ? 'Editar serviço' : 'Novo serviço'}</p>
      <input
        className="input"
        placeholder="Nome do serviço *"
        value={form.label}
        onChange={e => set('label', e.target.value)}
        required
      />
      <input
        className="input"
        placeholder="Descrição (opcional)"
        value={form.desc}
        onChange={e => set('desc', e.target.value)}
      />
      <input
        className="input"
        type="number"
        placeholder="Preço R$ *"
        value={form.preco}
        onChange={e => set('preco', e.target.value)}
        min="0"
        step="0.01"
        required
      />
      <div className="flex gap-2">
        <button type="button" onClick={onCancelar} className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-ink-700/40 border border-ink-600 text-ink-400 active:scale-95">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-blade-500/20 border border-blade-500/40 text-blade-400 active:scale-95 disabled:opacity-40">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

// ─── Tab: Horários ─────────────────────────────────────────────────────────

const HORAS = Array.from({ length: 24 }, (_, i) => i)
const INTERVALOS = [30, 60]

function TabHorarios({ bid }) {
  const [cfg,     setCfg]     = useState({ inicio: 6, fim: 17, intervalo: 60 })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState('')

  useEffect(() => {
    getConfigAdmin('horarios', bid).then(v => {
      if (v) setCfg(v)
      setLoading(false)
    })
  }, [bid])

  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }))

  async function handleSalvar(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await setConfigAdmin('horarios', cfg, bid)
      setToast('Horários salvos! Clientes verão os novos slots ao agendar.')
    } catch {
      setToast('Erro ao salvar.')
    } finally {
      setSaving(false)
      setTimeout(() => setToast(''), 3000)
    }
  }

  const previewSlots = (() => {
    const slots = []
    for (let m = cfg.inicio * 60; m <= cfg.fim * 60; m += cfg.intervalo) {
      const h = Math.floor(m / 60)
      const min = m % 60
      slots.push(`${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`)
    }
    return slots
  })()

  if (loading) return <div className="flex justify-center py-8"><Spinner size={24} /></div>

  return (
    <form onSubmit={handleSalvar} className="flex flex-col gap-4">
      {toast && (
        <div className="bg-blade-500/10 border border-blade-500/30 rounded-xl px-4 py-2 text-blade-400 text-sm text-center">
          {toast}
        </div>
      )}

      <div className="card flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">Abertura</label>
            <select className="input" value={cfg.inicio} onChange={e => set('inicio', Number(e.target.value))}>
              {HORAS.map(h => (
                <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">Fechamento</label>
            <select className="input" value={cfg.fim} onChange={e => set('fim', Number(e.target.value))}>
              {HORAS.map(h => (
                <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">Intervalo entre slots</label>
          <div className="flex gap-2">
            {INTERVALOS.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => set('intervalo', v)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all active:scale-95
                  ${cfg.intervalo === v
                    ? 'bg-blade-500/20 border-blade-500/50 text-blade-400'
                    : 'bg-ink-700/40 border-ink-600 text-ink-400'}`}
              >
                {v} min
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <p className="text-xs text-ink-400 uppercase tracking-wider mb-2">Pré-visualização ({previewSlots.length} slots)</p>
        <div className="flex flex-wrap gap-1.5">
          {previewSlots.map(s => (
            <span key={s} className="px-2 py-1 rounded-lg bg-ink-700 text-ink-300 text-xs font-mono">{s}</span>
          ))}
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar horários'}
      </button>
    </form>
  )
}

// ─── Tab: Dias Bloqueados ──────────────────────────────────────────────────

function formatarData(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo',
  }).replace(/^./, s => s.toUpperCase())
}

function TabBloqueio() {
  const [dias,    setDias]    = useState([])
  const [data,    setData]    = useState('')
  const [motivo,  setMotivo]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function fetchDias() { setDias(await getDiasBloqueados()) }
  useEffect(() => { fetchDias() }, [])

  async function handleBloquear(e) {
    e.preventDefault()
    if (!data) { setError('Escolha uma data.'); return }
    if (data < hojeISO()) { setError('Não pode bloquear data passada.'); return }
    setError(''); setLoading(true)
    try {
      await bloquearDia(data, motivo.trim())
      setData(''); setMotivo('')
      await fetchDias()
    } catch (err) {
      setError(err.message.includes('duplicate') ? 'Essa data já está bloqueada.' : 'Erro ao bloquear.')
    } finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={handleBloquear} className="card flex flex-col gap-4">
        <div>
          <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">Data</label>
          <input
            type="date"
            className="input"
            min={hojeISO()}
            value={data}
            onChange={e => setData(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-ink-400 font-medium mb-2 uppercase tracking-wider">
            Motivo <span className="normal-case font-normal text-ink-500">(opcional)</span>
          </label>
          <input
            className="input"
            placeholder="Ex: Feriado, Férias..."
            value={motivo}
            maxLength={100}
            onChange={e => setMotivo(e.target.value)}
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Bloqueando...' : '🔒 Bloquear data'}
        </button>
      </form>

      <div>
        <h3 className="text-white font-semibold mb-3">Datas bloqueadas ({dias.length})</h3>
        {dias.length === 0 ? (
          <p className="text-ink-500 text-sm">Nenhuma data bloqueada.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {dias.map(d => (
              <div key={d.id} className="flex items-center justify-between bg-ink-800 border border-ink-700 rounded-2xl px-4 py-3">
                <div>
                  <p className="text-white text-sm font-medium">{formatarData(d.data)}</p>
                  {d.motivo && <p className="text-ink-400 text-xs mt-0.5">{d.motivo}</p>}
                </div>
                <button
                  onClick={async () => { await desbloquearDia(d.data); await fetchDias() }}
                  className="text-red-400 text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors"
                >
                  Desbloquear
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
