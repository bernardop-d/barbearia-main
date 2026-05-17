// src/components/Clientes.jsx
import { useState, useMemo } from 'react'
import { formatarMoeda, formatarDataCurta } from '../utils/formatters'
import { SearchIcon } from './Icons'

export default function Clientes({ agendamentos }) {
  const [busca,     setBusca]     = useState('')
  const [selecionado, setSelecionado] = useState(null)

  const clientes = useMemo(() => {
    const mapa = {}
    for (const a of agendamentos) {
      if (a.status === 'cancelado') continue
      const chave = (a.whatsapp || '') + '|' + a.nome
      if (!mapa[chave]) {
        mapa[chave] = { nome: a.nome, whatsapp: a.whatsapp, visitas: 0, gasto: 0, ultimo: a.data, historico: [] }
      }
      const c = mapa[chave]
      c.visitas++
      if (a.status === 'finalizado') c.gasto += Number(a.preco)
      if (a.data > c.ultimo) c.ultimo = a.data
      c.historico.push(a)
    }
    return Object.values(mapa).sort((a, b) => b.ultimo.localeCompare(a.ultimo))
  }, [agendamentos])

  const filtrados = useMemo(() => {
    if (!busca.trim()) return clientes
    const q = busca.toLowerCase()
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(q) || (c.whatsapp || '').includes(q)
    )
  }, [clientes, busca])

  if (selecionado) {
    return <HistoricoCliente cliente={selecionado} onVoltar={() => setSelecionado(null)} />
  }

  return (
    <div className="flex flex-col gap-5 animate-slide-up">
      <div>
        <h2 className="font-display text-3xl text-white tracking-wide">Clientes</h2>
        <p className="text-ink-400 text-sm mt-1">{clientes.length} cliente(s)</p>
      </div>

      <div className="relative">
        <SearchIcon />
        <input
          className="input pl-10"
          placeholder="Buscar por nome ou WhatsApp..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">👤</div>
          <p className="text-ink-400 text-sm">Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtrados.map(c => (
            <button
              key={c.nome + c.whatsapp}
              onClick={() => setSelecionado(c)}
              className="card text-left w-full hover:border-blade-500/30 transition-colors active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-ink-700 rounded-2xl flex items-center justify-center font-display text-xl text-blade-400 shrink-0">
                  {c.nome[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{c.nome}</p>
                  <p className="text-ink-400 text-xs mt-0.5">
                    {c.whatsapp ? `(${c.whatsapp.slice(0,2)}) ${c.whatsapp.slice(2,7)}-${c.whatsapp.slice(7)}` : 'Sem WhatsApp'}
                    {' · '}último: {formatarDataCurta(c.ultimo)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-blade-400 font-mono text-sm font-medium">{c.visitas}×</p>
                  <p className="text-ink-400 text-xs">{formatarMoeda(c.gasto)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function HistoricoCliente({ cliente, onVoltar }) {
  const historico = [...cliente.historico].sort((a, b) => b.data.localeCompare(a.data))

  const STATUS = {
    confirmado: { label: 'Confirmado', cls: 'text-blade-400' },
    finalizado: { label: 'Finalizado', cls: 'text-yellow-400' },
    cancelado:  { label: 'Cancelado',  cls: 'text-red-400' },
  }

  return (
    <div className="flex flex-col gap-5 animate-slide-up">
      <div>
        <button
          onClick={onVoltar}
          className="text-ink-400 text-sm hover:text-white transition-colors mb-3 flex items-center gap-1"
        >
          ← Voltar
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-ink-700 rounded-2xl flex items-center justify-center font-display text-2xl text-blade-400">
            {cliente.nome[0].toUpperCase()}
          </div>
          <div>
            <h2 className="font-display text-2xl text-white tracking-wide">{cliente.nome}</h2>
            <p className="text-ink-400 text-xs">
              {cliente.whatsapp
                ? `+55 (${cliente.whatsapp.slice(0,2)}) ${cliente.whatsapp.slice(2,7)}-${cliente.whatsapp.slice(7)}`
                : 'Sem WhatsApp'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card py-4 flex flex-col gap-1">
          <span className="font-display text-xl text-white">{cliente.visitas}</span>
          <span className="text-ink-400 text-xs">Visitas</span>
        </div>
        <div className="card py-4 flex flex-col gap-1">
          <span className="font-display text-xl text-blade-400">{formatarMoeda(cliente.gasto)}</span>
          <span className="text-ink-400 text-xs">Total gasto</span>
        </div>
        <div className="card py-4 flex flex-col gap-1">
          <span className="font-display text-xl text-white">{formatarDataCurta(cliente.ultimo)}</span>
          <span className="text-ink-400 text-xs">Último</span>
        </div>
      </div>

      {cliente.whatsapp && (
        <a
          href={`https://wa.me/55${cliente.whatsapp}?text=${encodeURIComponent(`Olá, ${cliente.nome}! Tudo bem?`)}`}
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-green-600/30 bg-green-600/10 text-green-400 text-sm font-medium active:scale-95 transition-all"
        >
          Chamar no WhatsApp
        </a>
      )}

      <div>
        <h3 className="font-display text-xl text-white tracking-wide mb-3">Histórico</h3>
        <div className="flex flex-col gap-2">
          {historico.map(a => {
            const st = STATUS[a.status] || STATUS.confirmado
            return (
              <div key={a.id} className="card flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{a.servico}</p>
                  <p className="text-ink-400 text-xs mt-0.5">{formatarDataCurta(a.data)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-blade-400 font-mono text-sm">{formatarMoeda(a.preco)}</p>
                  <p className={`text-xs mt-0.5 ${st.cls}`}>{st.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
