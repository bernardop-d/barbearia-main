// src/pages/GodPanel.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export default function GodPanel() {
  const { logout } = useAuth()
  const [barbearias, setBarbearias] = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase
      .from('barbearias')
      .select('id, nome, slug, owner_email, ativo, vencimento, created_at')
      .order('created_at', { ascending: false })
    setBarbearias(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const pendentes = barbearias.filter(b => !b.ativo && !b.vencimento)
  const ativas    = barbearias.filter(b => b.ativo && (!b.vencimento || new Date(b.vencimento) >= new Date()))
  const vencidas  = barbearias.filter(b => b.vencimento && new Date(b.vencimento) < new Date())
  const total     = barbearias.length

  return (
    <div className="min-h-screen bg-ink text-white">
      <header className="sticky top-0 z-40 bg-ink-900/95 backdrop-blur-md border-b border-ink-800">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded">GOD</span>
            <span className="font-display text-xl text-gradient tracking-widest">Your Barber</span>
          </div>
          <button onClick={logout} className="text-ink-400 hover:text-white text-sm transition-colors">Sair</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <Stat label="Total"     value={total} />
          <Stat label="Ativas"    value={ativas.length}    color="text-blade-400" />
          <Stat label="Vencidas"  value={vencidas.length}  color="text-yellow-400" />
          <Stat label="Pendentes" value={pendentes.length} color="text-orange-400" />
        </div>

        {/* Pendentes — aprovação necessária */}
        {pendentes.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>⏳</span> Aguardando aprovação ({pendentes.length})
            </h2>
            <div className="flex flex-col gap-3">
              {pendentes.map(b => (
                <PendenteCard key={b.id} barbearia={b} onUpdate={fetchAll} />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-ink-300 uppercase tracking-wider">Todas as contas</h2>
          <button
            onClick={() => setModal(true)}
            className="px-4 py-2 rounded-xl bg-blade-500 text-ink-900 text-sm font-bold hover:bg-blade-400 active:scale-95 transition-all"
          >
            + Nova conta
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-20 text-ink-500">Carregando...</div>
        ) : (
          <div className="flex flex-col gap-3">
            {barbearias.filter(b => b.ativo || b.vencimento).map(b => (
              <BarbeariaCard key={b.id} barbearia={b} onUpdate={fetchAll} />
            ))}
          </div>
        )}
      </main>

      {modal && <NovaContaModal onClose={() => setModal(false)} onCreated={fetchAll} />}
    </div>
  )
}

function Stat({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-ink-800 border border-ink-700 rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-ink-500 text-xs uppercase tracking-wider mt-1">{label}</p>
    </div>
  )
}

function PendenteCard({ barbearia: b, onUpdate }) {
  const [vencimento, setVencimento] = useState('')
  const [saving,     setSaving]     = useState(false)

  async function handleAprovar() {
    setSaving(true)
    await supabase.from('barbearias').update({
      ativo: true,
      vencimento: vencimento || null,
    }).eq('id', b.id)
    setSaving(false)
    onUpdate()
  }

  return (
    <div className="bg-orange-500/5 border border-orange-500/30 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{b.nome}</p>
          <p className="text-ink-400 text-xs mt-0.5">{b.owner_email}</p>
          <p className="text-ink-500 text-xs">/{b.slug}</p>
        </div>
        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 text-orange-400 shrink-0">pendente</span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-1.5">
          {[['1d', 1], ['7d', 7], ['30d', 30]].map(([label, days]) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                const d = new Date()
                d.setDate(d.getDate() + days)
                setVencimento(d.toLocaleDateString('sv-SE'))
              }}
              className={`flex-1 py-1 rounded-lg text-xs font-medium border transition-all active:scale-95
                ${vencimento === new Date(new Date().setDate(new Date().getDate() + days)).toLocaleDateString('sv-SE')
                  ? 'bg-blade-500/20 border-blade-500/40 text-blade-400'
                  : 'bg-ink-900 border-ink-700 text-ink-400 hover:border-ink-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={vencimento}
            onChange={e => setVencimento(e.target.value)}
            placeholder="Vencimento (opcional)"
            className="flex-1 bg-ink-900 border border-ink-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blade-500/50"
          />
          <button
            onClick={handleAprovar}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg bg-blade-500 text-ink-900 text-xs font-bold hover:bg-blade-400 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? '...' : 'Aprovar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BarbeariaCard({ barbearia: b, onUpdate }) {
  const [ativo,      setAtivo]      = useState(b.ativo)
  const [vencimento, setVencimento] = useState(b.vencimento || '')
  const [saving,     setSaving]     = useState(false)

  const vencido = b.vencimento && new Date(b.vencimento) < new Date()

  async function handleToggleAtivo() {
    const novo = !ativo
    setAtivo(novo)
    await supabase.from('barbearias').update({ ativo: novo }).eq('id', b.id)
    onUpdate()
  }

  async function handleVencimento(e) {
    const val = e.target.value
    setVencimento(val)
    setSaving(true)
    await supabase.from('barbearias').update({ vencimento: val || null }).eq('id', b.id)
    setSaving(false)
    onUpdate()
  }

  const bookingUrl = `https://bernardop-d.github.io/barbearia-main/booking/?b=${b.slug}`

  return (
    <div className={`bg-ink-800 border rounded-xl p-4 transition-all ${!ativo ? 'border-red-500/30 opacity-60' : vencido ? 'border-yellow-500/30' : 'border-ink-700'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-white truncate">{b.nome}</p>
            {vencido && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">vencida</span>}
            {!ativo && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400">desativada</span>}
          </div>
          <p className="text-ink-400 text-xs mt-0.5">{b.owner_email}</p>
          <a href={bookingUrl} target="_blank" rel="noreferrer" className="text-blade-500/60 text-xs hover:text-blade-400 transition-colors">/{b.slug}</a>
        </div>

        {/* Toggle ativo */}
        <button
          onClick={handleToggleAtivo}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${ativo ? 'bg-blade-500' : 'bg-ink-600'}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${ativo ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Vencimento */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          {[['1d', 1], ['7d', 7], ['30d', 30]].map(([label, days]) => (
            <button
              key={label}
              type="button"
              onClick={async () => {
                const d = new Date()
                d.setDate(d.getDate() + days)
                const val = d.toLocaleDateString('sv-SE')
                setVencimento(val)
                setSaving(true)
                await supabase.from('barbearias').update({ vencimento: val }).eq('id', b.id)
                setSaving(false)
                onUpdate()
              }}
              className="flex-1 py-1 rounded-lg text-xs font-medium border bg-ink-900 border-ink-700 text-ink-400 hover:border-ink-500 transition-all active:scale-95"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-ink-500 text-xs uppercase tracking-wider whitespace-nowrap">Venc.</label>
          <input
            type="date"
            value={vencimento}
            onChange={handleVencimento}
            className="flex-1 bg-ink-900 border border-ink-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-blade-500/50 min-w-0"
          />
          {saving && <span className="text-ink-500 text-xs">...</span>}
        </div>
      </div>
    </div>
  )
}

function NovaContaModal({ onClose, onCreated }) {
  const [form, setForm]   = useState({ nome: '', slug: '', email: '', password: '', vencimento: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function slugify(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function set(k, v) {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      if (k === 'nome') next.slug = slugify(v)
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome || !form.slug || !form.email || !form.password) {
      setError('Preencha todos os campos obrigatórios.'); return
    }
    setError(''); setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/criar-conta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(form),
      })
      const json = await resp.json()
      if (!resp.ok) { setError(json.error || 'Erro ao criar conta.'); return }
      onCreated()
      onClose()
    } catch (e) {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-ink-800 border border-ink-700 rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white">Nova conta</h3>
          <button onClick={onClose} className="text-ink-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label="Nome da barbearia *" value={form.nome} onChange={v => set('nome', v)} placeholder="Barbearia do João" />
          <Field label="Slug (URL) *" value={form.slug} onChange={v => set('slug', slugify(v))} placeholder="barbearia-do-joao" />
          <Field label="Email do dono *" type="email" value={form.email} onChange={v => set('email', v)} placeholder="dono@email.com" />
          <Field label="Senha inicial *" type="password" value={form.password} onChange={v => set('password', v)} placeholder="mínimo 6 caracteres" />
          <div>
            <label className="block text-xs text-ink-400 mb-1">Vencimento</label>
            <div className="flex gap-1.5 mb-2">
              {[['1d','1 dia',1],['7d','7 dias',7],['30d','30 dias',30]].map(([key, label, days]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    const d = new Date()
                    d.setDate(d.getDate() + days)
                    set('vencimento', d.toLocaleDateString('sv-SE'))
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all
                    ${form.vencimento === new Date(new Date().setDate(new Date().getDate() + days)).toLocaleDateString('sv-SE')
                      ? 'bg-blade-500/20 border-blade-500/40 text-blade-400'
                      : 'bg-ink-900 border-ink-700 text-ink-400 hover:border-ink-500'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={form.vencimento}
              onChange={e => set('vencimento', e.target.value)}
              className="w-full bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blade-500/50"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-ink-600 text-ink-400 text-sm">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-blade-500 text-ink-900 text-sm font-bold disabled:opacity-50">
              {loading ? 'Criando...' : 'Criar conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs text-ink-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-ink-900 border border-ink-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blade-500/50 placeholder:text-ink-600"
      />
    </div>
  )
}
