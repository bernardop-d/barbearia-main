// src/components/Dashboard.jsx
import { useMemo, memo } from 'react'
import { formatarMoeda, formatarDataLonga, formatarHora, formatarMes } from '../utils/formatters'

const TZ = 'America/Sao_Paulo'

function GraficoReceita({ agendamentos }) {
  const dados = useMemo(() => {
    const hoje = new Date()
    const hojeStr = hoje.toLocaleDateString('sv-SE', { timeZone: TZ })
    const dias = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(hoje)
      d.setDate(hoje.getDate() - (13 - i))
      return d.toLocaleDateString('sv-SE', { timeZone: TZ })
    })
    const rev = {}
    for (const a of agendamentos) {
      if (a.status !== 'finalizado') continue
      const dia = new Date(a.data).toLocaleDateString('sv-SE', { timeZone: TZ })
      rev[dia] = (rev[dia] || 0) + Number(a.preco)
    }
    return dias.map(d => ({ dia: d, val: rev[d] || 0, isHoje: d === hojeStr }))
  }, [agendamentos])

  const max = Math.max(...dados.map(d => d.val), 1)
  if (dados.every(d => d.val === 0)) return null

  return (
    <div>
      <h3 className="font-display text-xl text-white tracking-wide mb-3">Receita — 14 dias</h3>
      <div className="card p-4">
        <div className="flex items-end gap-0.5 h-20">
          {dados.map((d, i) => (
            <div
              key={i}
              title={`${d.dia}: ${formatarMoeda(d.val)}`}
              className="flex-1 rounded-sm"
              style={{
                height: `${Math.max((d.val / max) * 80, d.val > 0 ? 3 : 0)}px`,
                backgroundColor: d.isHoje
                  ? '#00e87a'
                  : d.val > 0
                    ? 'rgba(0,232,122,0.3)'
                    : 'rgba(255,255,255,0.04)',
              }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-ink-600 text-[9px]">14 dias atrás</span>
          <span className="text-blade-400 text-[9px]">hoje</span>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ agendamentos, onNovoAgendamento, barbearia }) {
  // Single-pass: calcula todas as stats em um único loop
  const stats = useMemo(() => {
    const agora      = new Date()
    const inicioDia  = new Date(agora); inicioDia.setHours(0, 0, 0, 0)
    const fimDia     = new Date(agora); fimDia.setHours(23, 59, 59, 999)
    const inicioMes  = new Date(agora.getFullYear(), agora.getMonth(), 1)

    let faturamentoTotal = 0
    let faturamentoMes   = 0
    let confirmados      = 0
    let finalizados      = 0
    let hoje             = 0

    for (const agendamento of agendamentos) {
      const data  = new Date(agendamento.data)
      const preco = Number(agendamento.preco)

      if (agendamento.status === 'finalizado') {
        faturamentoTotal += preco
        if (data >= inicioMes) faturamentoMes += preco
        finalizados++
      } else if (agendamento.status === 'confirmado') {
        confirmados++
      }

      if (data >= inicioDia && data <= fimDia) hoje++
    }

    return { faturamentoTotal, faturamentoMes, confirmados, finalizados, hoje }
  }, [agendamentos])

  // Próximos agendamentos confirmados a partir de agora
  const proximos = useMemo(() =>
    agendamentos
      .filter(a => a.status === 'confirmado' && new Date(a.data) >= new Date())
      .slice(0, 3),
    [agendamentos]
  )

  const isNewAccount = agendamentos.length === 0
  const bookingUrl = barbearia?.slug
    ? `${window.location.origin}${import.meta.env.BASE_URL}booking/?b=${barbearia.slug}`
    : null

  function copiarLink() {
    navigator.clipboard?.writeText(bookingUrl)
  }

  return (
    <div className="flex flex-col gap-5 animate-slide-up">
      {/* Saudação */}
      <div>
        <h2 className="font-display text-3xl text-white tracking-wide">
          Olá, Barbeiro! ✂️
        </h2>
        <p className="text-ink-400 text-sm mt-1">{formatarDataLonga(new Date())}</p>
      </div>

      {/* Onboarding — só aparece quando a conta é nova */}
      {isNewAccount && (
        <div className="bg-blade-500/5 border border-blade-500/20 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-blade-400 text-sm font-semibold">Primeiros passos</p>
          <Step n={1} texto="Configure seus serviços em Configurações → Serviços" />
          <Step n={2} texto="Adicione seu WhatsApp em Configurações → Barbearia" />
          <Step n={3} texto="Copie seu link abaixo e mande pro cliente agendar" />
        </div>
      )}

      {/* Link de agendamento */}
      {bookingUrl && (
        <div className="bg-ink-800 border border-ink-700 rounded-2xl p-4">
          <p className="text-xs text-ink-400 uppercase tracking-wider mb-2">Seu link de agendamento</p>
          <p className="text-blade-400 font-mono text-xs break-all mb-3">{bookingUrl}</p>
          <button
            onClick={copiarLink}
            className="w-full py-2.5 rounded-xl bg-blade-500 text-ink-900 text-sm font-bold active:scale-95 transition-all"
          >
            Copiar link
          </button>
        </div>
      )}

      {/* Cards principais */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Faturamento total" value={formatarMoeda(stats.faturamentoTotal)} icon="💰" accent="blade" big />
        <StatCard label="Este mês"           value={formatarMoeda(stats.faturamentoMes)}   icon="📆" accent="gold"  big />
      </div>

      {/* Cards secundários */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Hoje"        value={stats.hoje}        icon="⏰" />
        <StatCard label="Confirmados" value={stats.confirmados} icon="✅" />
        <StatCard label="Finalizados" value={stats.finalizados} icon="🏆" />
      </div>

      <GraficoReceita agendamentos={agendamentos} />

      {/* Próximos agendamentos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-xl text-white tracking-wide">Próximos</h3>
          <span className="text-ink-500 text-xs">{proximos.length} agendamentos</span>
        </div>

        {proximos.length === 0 ? (
          <div className="card text-center py-10">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-ink-400 text-sm">Nenhum agendamento futuro</p>
            <button
              className="btn-primary mt-4 max-w-48 mx-auto text-sm py-2.5"
              onClick={onNovoAgendamento}
            >
              Criar agendamento
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {proximos.map(agendamento => (
              <ProximoCard key={agendamento.id} agendamento={agendamento} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, accent, big }) {
  const accentClass = accent === 'blade' ? 'text-blade-400' : accent === 'gold' ? 'text-gold-400' : 'text-white'

  return (
    <div className={`card flex flex-col gap-1 ${big ? 'py-5' : 'py-4'}`}>
      <span className="text-xl">{icon}</span>
      <span className={`font-display ${big ? 'text-xl' : 'text-2xl'} ${accentClass} tracking-wide leading-tight`}>
        {value}
      </span>
      <span className="text-ink-400 text-xs">{label}</span>
    </div>
  )
}

const ProximoCard = memo(function ProximoCard({ agendamento }) {
  const data = new Date(agendamento.data)
  return (
    <div className="card flex items-center gap-4">
      <div className="flex-shrink-0 w-12 h-12 bg-blade-500/10 border border-blade-500/20 rounded-2xl flex flex-col items-center justify-center">
        <span className="text-blade-400 font-mono font-medium text-sm leading-tight">
          {String(data.getDate()).padStart(2, '0')}
        </span>
        <span className="text-blade-600 text-xs uppercase">
          {formatarMes(data)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm truncate">{agendamento.nome}</p>
        <p className="text-ink-400 text-xs mt-0.5">
          {agendamento.servico} · {formatarHora(data)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-blade-400 font-mono text-sm font-medium">
          {formatarMoeda(agendamento.preco)}
        </p>
        <span className="badge-confirmado text-[10px] mt-1">confirmado</span>
      </div>
    </div>
  )
})

function Step({ n, texto }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-5 h-5 rounded-full bg-blade-500/20 border border-blade-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-blade-400 text-[10px] font-bold">{n}</span>
      </div>
      <p className="text-ink-300 text-sm">{texto}</p>
    </div>
  )
}
