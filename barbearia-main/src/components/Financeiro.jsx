// src/components/Financeiro.jsx
import { useState, useEffect, useMemo } from 'react'
import { getVendas, getDespesas, criarDespesa } from '../services/supabase'
import { formatarMoeda } from '../utils/formatters'
import { Spinner } from './Icons'

// ─── Gráfico mensal ──────────────────────────────────────────────────────────
function GraficoMensal({ agendamentos }) {
  const [vendasChart, setVendasChart]   = useState([])
  const [despesasChart, setDespesasChart] = useState([])

  useEffect(() => {
    const seisM = new Date(); seisM.setMonth(seisM.getMonth() - 5); seisM.setDate(1)
    const de = seisM.toISOString().slice(0, 10) + 'T00:00:00'
    Promise.all([getVendas(de, null), getDespesas(de, null)])
      .then(([v, d]) => { setVendasChart(v); setDespesasChart(d) })
      .catch(() => {})
  }, [])

  const meses = useMemo(() => {
    const lista = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      lista.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') })
    }
    return lista
  }, [])

  const dados = useMemo(() => {
    return meses.map(({ key, label }) => {
      const receita = agendamentos
        .filter(a => a.status === 'finalizado' && a.data.slice(0, 7) === key)
        .reduce((s, a) => s + Number(a.preco), 0)
      const vendas = vendasChart
        .filter(v => v.data.slice(0, 7) === key)
        .reduce((s, v) => s + Number(v.total), 0)
      const despesas = despesasChart
        .filter(d => d.data.slice(0, 7) === key)
        .reduce((s, d) => s + Number(d.valor), 0)
      return { label, receita: receita + vendas, despesas, lucro: receita + vendas - despesas }
    })
  }, [meses, agendamentos, vendasChart, despesasChart])

  const maxVal = Math.max(...dados.map(d => Math.max(d.receita, d.despesas)), 1)

  return (
    <div className="card">
      <p className="text-xs text-ink-400 uppercase tracking-wider mb-4">Últimos 6 meses</p>
      <div className="flex items-end gap-1.5 h-28">
        {dados.map(d => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full flex gap-0.5 items-end" style={{ height: 80 }}>
              <div
                className="flex-1 bg-blade-500/60 rounded-t-sm transition-all"
                style={{ height: `${Math.max(4, (d.receita / maxVal) * 80)}px` }}
                title={`Receita: ${formatarMoeda(d.receita)}`}
              />
              <div
                className="flex-1 bg-red-500/50 rounded-t-sm transition-all"
                style={{ height: `${Math.max(4, (d.despesas / maxVal) * 80)}px` }}
                title={`Despesas: ${formatarMoeda(d.despesas)}`}
              />
            </div>
            <span className="text-[9px] text-ink-500 uppercase">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3">
        <span className="flex items-center gap-1 text-[10px] text-ink-400"><span className="w-2 h-2 rounded-sm bg-blade-500/60 inline-block" />Receita</span>
        <span className="flex items-center gap-1 text-[10px] text-ink-400"><span className="w-2 h-2 rounded-sm bg-red-500/50 inline-block" />Despesas</span>
      </div>
    </div>
  )
}

const TZ = 'America/Sao_Paulo'

function toISO(d) {
  return d.toLocaleDateString('sv-SE', { timeZone: TZ })
}

function periodoRange(periodo) {
  const hoje = new Date()
  if (periodo === 'hoje') {
    const s = toISO(hoje)
    return { de: s + 'T00:00:00', ate: s + 'T23:59:59' }
  }
  if (periodo === 'semana') {
    const ini = new Date(hoje)
    ini.setDate(hoje.getDate() - 6)
    return { de: toISO(ini) + 'T00:00:00', ate: toISO(hoje) + 'T23:59:59' }
  }
  if (periodo === 'mes') {
    const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    return { de: toISO(ini) + 'T00:00:00', ate: toISO(hoje) + 'T23:59:59' }
  }
  return { de: null, ate: null }
}

const PERIODOS = [
  { id: 'hoje',  label: 'Hoje' },
  { id: 'semana',label: '7 dias' },
  { id: 'mes',   label: 'Este mês' },
  { id: 'tudo',  label: 'Tudo' },
]

const CATEGORIAS = ['geral', 'aluguel', 'produto', 'equipamento', 'marketing', 'pessoal']

export default function Financeiro({ agendamentos }) {
  const [periodo,       setPeriodo]       = useState('mes')
  const [vendas,        setVendas]        = useState([])
  const [despesas,      setDespesas]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [formDespesa,   setFormDespesa]   = useState(null)

  useEffect(() => {
    setLoading(true)
    const { de, ate } = periodoRange(periodo)
    Promise.all([getVendas(de, ate), getDespesas(de, ate)])
      .then(([v, d]) => { setVendas(v); setDespesas(d) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [periodo])

  const agFiltrados = useMemo(() => {
    if (!agendamentos) return []
    const { de, ate } = periodoRange(periodo)
    return agendamentos.filter(a => {
      if (a.status !== 'finalizado') return false
      if (periodo === 'tudo') return true
      return (!de || a.data >= de) && (!ate || a.data <= ate)
    })
  }, [agendamentos, periodo])

  const receitaHorarios = useMemo(() => agFiltrados.reduce((s, a) => s + Number(a.preco), 0), [agFiltrados])
  const receitaVendas   = useMemo(() => vendas.reduce((s, v) => s + Number(v.total), 0), [vendas])
  const totalDespesas   = useMemo(() => despesas.reduce((s, d) => s + Number(d.valor), 0), [despesas])
  const totalReceita    = receitaHorarios + receitaVendas
  const lucro           = totalReceita - totalDespesas

  async function salvarDespesa(form) {
    await criarDespesa({
      descricao: form.descricao.trim(),
      valor:     parseFloat(form.valor),
      categoria: form.categoria,
    })
    setFormDespesa(null)
    const { de, ate } = periodoRange(periodo)
    setDespesas(await getDespesas(de, ate))
  }

  return (
    <div className="flex flex-col gap-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl text-white tracking-wide">Finanças</h2>
          <p className="text-ink-400 text-sm mt-1">Resumo financeiro</p>
        </div>
        <button
          onClick={() => setFormDespesa({ descricao: '', valor: '', categoria: 'geral' })}
          className="btn-primary text-sm px-4 py-2.5 max-w-fit"
        >
          + Despesa
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {PERIODOS.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriodo(p.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-medium border transition-all duration-200 active:scale-95
              ${periodo === p.id
                ? 'bg-blade-500/20 border-blade-500/50 text-blade-400'
                : 'bg-ink-700/40 border-ink-600 text-ink-400'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {formDespesa && (
        <NovaDespesaForm
          form={formDespesa}
          onChange={setFormDespesa}
          onSalvar={() => salvarDespesa(formDespesa)}
          onCancelar={() => setFormDespesa(null)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Spinner size={24} /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="card flex flex-col gap-1 py-5">
              <span className="text-xl">💈</span>
              <span className="font-display text-xl text-blade-400 tracking-wide leading-tight">
                {formatarMoeda(receitaHorarios)}
              </span>
              <span className="text-ink-400 text-xs">Receita horários</span>
            </div>
            <div className="card flex flex-col gap-1 py-5">
              <span className="text-xl">📦</span>
              <span className="font-display text-xl text-blade-400 tracking-wide leading-tight">
                {formatarMoeda(receitaVendas)}
              </span>
              <span className="text-ink-400 text-xs">Receita vendas</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="card flex flex-col gap-1 py-4">
              <span className="font-display text-lg text-white leading-tight">{formatarMoeda(totalReceita)}</span>
              <span className="text-ink-400 text-xs">Total receita</span>
            </div>
            <div className="card flex flex-col gap-1 py-4">
              <span className="font-display text-lg text-red-400 leading-tight">{formatarMoeda(totalDespesas)}</span>
              <span className="text-ink-400 text-xs">Despesas</span>
            </div>
            <div className="card flex flex-col gap-1 py-4">
              <span className={`font-display text-lg leading-tight ${lucro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatarMoeda(lucro)}
              </span>
              <span className="text-ink-400 text-xs">Lucro</span>
            </div>
          </div>

          {despesas.length > 0 && (
            <div>
              <h3 className="font-display text-xl text-white tracking-wide mb-3">Despesas</h3>
              <div className="flex flex-col gap-2">
                {despesas.map(d => (
                  <div key={d.id} className="card flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{d.descricao}</p>
                      <p className="text-ink-400 text-xs mt-0.5 capitalize">
                        {d.categoria} · {new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR', { timeZone: TZ })}
                      </p>
                    </div>
                    <p className="text-red-400 font-mono text-sm font-medium shrink-0">
                      -{formatarMoeda(d.valor)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {vendas.length > 0 && (
            <div>
              <h3 className="font-display text-xl text-white tracking-wide mb-3">Vendas de produtos</h3>
              <div className="flex flex-col gap-2">
                {vendas.map(v => (
                  <div key={v.id} className="card flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{v.produto_nome}</p>
                      <p className="text-ink-400 text-xs mt-0.5">
                        {v.quantidade} × {formatarMoeda(v.preco_unitario)}
                      </p>
                    </div>
                    <p className="text-blade-400 font-mono text-sm font-medium shrink-0">
                      {formatarMoeda(v.total)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <GraficoMensal agendamentos={agendamentos} />

          {agFiltrados.length > 0 && (
            <div>
              <h3 className="font-display text-xl text-white tracking-wide mb-3">
                Agendamentos finalizados ({agFiltrados.length})
              </h3>
              <div className="flex flex-col gap-2">
                {agFiltrados.slice(0, 20).map(a => (
                  <div key={a.id} className="card flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{a.nome}</p>
                      <p className="text-ink-400 text-xs mt-0.5">{a.servico}</p>
                    </div>
                    <p className="text-blade-400 font-mono text-sm font-medium shrink-0">
                      {formatarMoeda(a.preco)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function NovaDespesaForm({ form, onChange, onSalvar, onCancelar }) {
  const [loading, setLoading] = useState(false)
  const set = (key, val) => onChange(p => ({ ...p, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.descricao.trim() || !form.valor) return
    setLoading(true)
    try { await onSalvar() } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-3">
      <p className="text-white font-medium text-sm">Nova despesa</p>
      <input
        className="input"
        placeholder="Descrição *"
        value={form.descricao}
        onChange={e => set('descricao', e.target.value)}
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          className="input"
          type="number"
          placeholder="Valor R$ *"
          value={form.valor}
          onChange={e => set('valor', e.target.value)}
          min="0.01"
          step="0.01"
          required
        />
        <select className="input" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
          {CATEGORIAS.map(c => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancelar}
          className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-ink-700/40 border border-ink-600 text-ink-400 active:scale-95"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-blade-500/20 border border-blade-500/40 text-blade-400 active:scale-95 disabled:opacity-40"
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
