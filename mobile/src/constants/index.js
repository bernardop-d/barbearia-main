export const SERVICOS = [
  { id: 'corte',       label: 'Corte Normal',   preco: 35,  icon: 'cut-outline',        desc: 'Corte tradicional' },
  { id: 'combo',       label: 'Cabelo + Barba', preco: 55,  icon: 'color-wand-outline', desc: 'Corte + barba completa' },
  { id: 'platinado',   label: 'Platinado',      preco: 60,  icon: 'flash-outline',      desc: 'Descoloração' },
  { id: 'tinta',       label: 'Tinta Preta',    preco: 15,  icon: 'brush-outline',      desc: 'Adicional de tinta' },
  { id: 'mensal',      label: 'Plano Mensal',   preco: 80,  icon: 'calendar-outline',   desc: 'Corte mensal' },
  { id: 'mensaltinta', label: 'Mensal + Tinta', preco: 100, icon: 'star-outline',       desc: 'Corte mensal + tinta' },
  { id: 'outros',      label: 'Outros',         preco: 0,   icon: 'add-circle-outline', desc: 'Outro serviço' },
]

export const STATUS_LABEL = {
  confirmado: { label: 'Confirmado', color: '#4ade80',  bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)' },
  finalizado: { label: 'Finalizado', color: '#fbbf24',  bg: 'rgba(217,119,6,0.15)',  border: 'rgba(217,119,6,0.4)' },
  cancelado:  { label: 'Cancelado',  color: '#f87171',  bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)' },
  pendente:   { label: 'Pendente',   color: '#94a3b8',  bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.4)' },
}

export const STATUS_OPTS = ['confirmado', 'finalizado', 'cancelado']

export const HORARIOS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
