// src/components/Agenda.jsx
import { useState, useMemo, useCallback, useEffect, memo } from 'react'
import { atualizarStatus, atualizarAgendamento, removerAgendamento } from '../services/supabase'
import { SearchIcon, ChevronIcon, WhatsAppIcon } from './Icons'
import { formatarMoeda, formatarDataCurta, formatarHora, formatarDataLonga } from '../utils/formatters'
import { STATUS_LABEL } from '../constants'
import AgendamentoForm from './AgendamentoForm'

const FILTROS = [
  { id: 'todos',      label: 'Todos' },
  { id: 'confirmado', label: 'Confirmados' },
  { id: 'finalizado', label: 'Finalizados' },
  { id: 'cancelado',  label: 'Cancelados' },
]

const PAGE_SIZE = 20

export default function Agenda({ agendamentos, onRefresh, nomeBarbearia = 'Your Barber' }) {
  const [filtro,      setFiltro]      = useState('todos')
  const [editando,    setEditando]    = useState(null)
  const [removendoId, setRemovendoId] = useState(null)
  const [busca,       setBusca]       = useState('')
  const [pagina,      setPagina]      = useState(1)

  useEffect(() => { setPagina(1) }, [filtro, busca])

  const lista = useMemo(() => {
    let resultado = [...agendamentos]
    if (filtro !== 'todos') resultado = resultado.filter(a => a.status === filtro)
    if (busca.trim()) {
      const query = busca.toLowerCase()
      resultado = resultado.filter(a =>
        a.nome.toLowerCase().includes(query) || a.servico.toLowerCase().includes(query)
      )
    }
    return resultado.sort((a, b) => new Date(b.data) - new Date(a.data))
  }, [agendamentos, filtro, busca])

  const listaVis = useMemo(() => lista.slice(0, pagina * PAGE_SIZE), [lista, pagina])
  const temMais = lista.length > listaVis.length

  const handleStatus = useCallback(async (id, novoStatus) => {
    try {
      await atualizarStatus(id, novoStatus)
      await onRefresh()
    } catch (err) {
      console.error(err)
    }
  }, [onRefresh])

  const handleRemover = useCallback(async (id) => {
    if (removendoId === id) {
      try {
        await removerAgendamento(id)
        await onRefresh()
      } catch (err) {
        console.error(err)
      } finally {
        setRemovendoId(null)
      }
    } else {
      setRemovendoId(id)
      setTimeout(() => setRemovendoId(prev => prev === id ? null : prev), 3000)
    }
  }, [removendoId, onRefresh])

  const handlePago = useCallback(async (id, pago) => {
    try {
      await atualizarAgendamento(id, { pago })
      await onRefresh()
    } catch (err) {
      console.error(err)
    }
  }, [onRefresh])

  const handleWhatsApp = useCallback((agendamento) => {
    const dataFmt = formatarDataLonga(agendamento.data)
    const horaFmt = formatarHora(agendamento.data)
    const msg = encodeURIComponent(
      `Olá, ${agendamento.nome}!\n\n` +
      `Seu agendamento na *${nomeBarbearia}* está confirmado.\n\n` +
      `*Serviço:* ${agendamento.servico}\n` +
      `*Data:* ${dataFmt}\n` +
      `*Horário:* ${horaFmt}\n` +
      `*Valor:* ${formatarMoeda(agendamento.preco)}\n\n` +
      `Te esperamos! Qualquer dúvida é só chamar.`
    )
    const numero = agendamento.whatsapp?.replace(/\D/g, '')
    const url = numero
      ? `https://wa.me/55${numero}?text=${msg}`
      : `https://wa.me/?text=${msg}`
    window.open(url, '_blank')
  }, [])

  if (editando) {
    return (
      <AgendamentoForm
        editando={editando}
        onSuccess={async () => { setEditando(null); await onRefresh() }}
        onCancel={() => setEditando(null)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5 animate-slide-up">
      <div>
        <h2 className="font-display text-3xl text-white tracking-wide">Agenda</h2>
        <p className="text-ink-400 text-sm mt-1">{agendamentos.length} agendamento(s) no total</p>
      </div>

      <div className="relative">
        <SearchIcon />
        <input
          className="input pl-10"
          placeholder="Buscar por nome ou serviço..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {FILTROS.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-medium border transition-all duration-200 active:scale-95
              ${filtro === f.id
                ? 'bg-blade-500/20 border-blade-500/50 text-blade-400'
                : 'bg-ink-700/40 border-ink-600 text-ink-400 hover:border-ink-500'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🗓️</div>
          <p className="text-ink-400 text-sm">Nenhum agendamento encontrado</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {listaVis.map(agendamento => (
            <AgendamentoCard
              key={agendamento.id}
              agendamento={agendamento}
              removendo={removendoId === agendamento.id}
              onStatus={handleStatus}
              onPago={handlePago}
              onEditar={setEditando}
              onRemover={handleRemover}
              onWhatsApp={handleWhatsApp}
              nomeBarbearia={nomeBarbearia}
            />
          ))}
          {temMais && (
            <button
              onClick={() => setPagina(p => p + 1)}
              className="w-full py-3 rounded-2xl text-sm font-medium bg-ink-700/40 border border-ink-600 text-ink-400 hover:text-ink-300 hover:border-ink-500 transition-all active:scale-95"
            >
              Mostrar mais ({lista.length - listaVis.length} restantes)
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function dentroDeUmaHora(dataStr) {
  const agora = new Date()
  const data  = new Date(dataStr)
  const diff  = data - agora
  return diff > 0 && diff <= 60 * 60 * 1000
}

const AgendamentoCard = memo(function AgendamentoCard({ agendamento, removendo, onStatus, onPago, onEditar, onRemover, onWhatsApp, nomeBarbearia = 'Your Barber' }) {
  const [expanded, setExpanded] = useState(false)
  const statusInfo = STATUS_LABEL[agendamento.status] || STATUS_LABEL.pendente
  const alertar    = agendamento.status === 'confirmado' && dentroDeUmaHora(agendamento.data)

  function handleAvisar(e) {
    e.stopPropagation()
    const horaFmt = formatarHora(agendamento.data)
    const numero  = agendamento.whatsapp?.replace(/\D/g, '')
    const msg     = encodeURIComponent(
      `Olá, ${agendamento.nome}! Passando para lembrar que seu horário na *${nomeBarbearia}* é hoje às *${horaFmt}*. Até logo!`
    )
    const url = numero
      ? `https://wa.me/55${numero}?text=${msg}`
      : `https://wa.me/?text=${msg}`
    window.open(url, '_blank')
  }

  return (
    <div className={`card transition-all duration-300 ${removendo ? 'border-red-500/50 bg-red-500/5' : alertar ? 'border-orange-500/40' : ''}`}>
      {alertar && (
        <button
          onClick={handleAvisar}
          className="w-full mb-3 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium bg-orange-500/10 border border-orange-500/30 text-orange-400 animate-pulse active:scale-95 transition-all"
        >
          <span>⏰</span> Falta menos de 1h — avisar cliente
        </button>
      )}
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => setExpanded(prev => !prev)}
      >
        <div className="flex-shrink-0 w-11 h-11 bg-ink-700 rounded-2xl flex items-center justify-center font-display text-xl text-blade-400 select-none">
          {agendamento.nome[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{agendamento.nome}</p>
          <p className="text-ink-400 text-xs mt-0.5">
            {agendamento.servico} · {formatarDataCurta(agendamento.data)} às {formatarHora(agendamento.data)}
          </p>
        </div>

        <div className="text-right">
          <p className="text-blade-400 font-mono text-sm font-medium">
            {formatarMoeda(agendamento.preco)}
          </p>
          <span className={`${statusInfo.cls} mt-1`}>{statusInfo.label}</span>
        </div>

        <span className={`text-ink-600 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
          <ChevronIcon />
        </span>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-ink-700/60 flex flex-col gap-3 animate-slide-down">
          {/* Status — só mostra ação relevante */}
          <div className="flex gap-2">
            {agendamento.status === 'confirmado' && (<>
              <button
                onClick={() => onStatus(agendamento.id, 'finalizado')}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-gold-600/10 border border-gold-600/30 text-gold-400 active:scale-95 transition-all"
              >
                Finalizar
              </button>
              <button
                onClick={() => onStatus(agendamento.id, 'cancelado')}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-ink-700/40 border border-ink-600 text-ink-400 active:scale-95 transition-all"
              >
                Cancelar
              </button>
            </>)}
            {agendamento.status === 'cancelado' && (
              <button
                onClick={() => onStatus(agendamento.id, 'confirmado')}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-blade-500/10 border border-blade-500/30 text-blade-400 active:scale-95 transition-all"
              >
                Reativar
              </button>
            )}
          </div>

          {/* Pagamento */}
          <button
            onClick={() => onPago(agendamento.id, !agendamento.pago)}
            className={`w-full py-2.5 rounded-xl text-xs font-medium border transition-all duration-200 active:scale-95
              ${agendamento.pago
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-ink-700/40 border-ink-600 text-ink-400'
              }`}
          >
            {agendamento.pago ? 'Pago — desfazer' : 'Marcar como pago'}
          </button>

          {/* Ações */}
          <div className="flex gap-2">
            <button
              onClick={() => onWhatsApp(agendamento)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium bg-green-600/10 border border-green-600/30 text-green-400 active:scale-95 transition-all"
            >
              <WhatsAppIcon /> WhatsApp
            </button>
            <button
              onClick={() => onEditar(agendamento)}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-ink-700/40 border border-ink-600 text-ink-300 active:scale-95 transition-all"
            >
              Editar
            </button>
            <button
              onClick={() => onRemover(agendamento.id)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-medium active:scale-95 transition-all
                ${removendo
                  ? 'bg-red-500/20 border-red-500/60 text-red-400 animate-pulse'
                  : 'bg-ink-700/40 border border-ink-600 text-ink-400'
                }`}
            >
              {removendo ? 'Confirmar?' : 'Remover'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
})
