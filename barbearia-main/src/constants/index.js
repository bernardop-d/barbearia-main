// src/constants/index.js

export const STATUS_LABEL = {
  confirmado: { cls: 'badge-confirmado', label: 'Confirmado' },
  finalizado: { cls: 'badge-finalizado', label: 'Finalizado' },
  cancelado:  { cls: 'badge-cancelado',  label: 'Cancelado'  },
  pendente:   { cls: 'badge-pendente',   label: 'Pendente'   },
}

export const STATUS_OPTS = ['confirmado', 'finalizado', 'cancelado']

export const SERVICOS = [
  { id: 'corte',       label: 'Corte Normal',   preco: 35,  emoji: '✂️' },
  { id: 'combo',       label: 'Cabelo + Barba', preco: 55,  emoji: '💈' },
  { id: 'platinado',   label: 'Platinado',      preco: 60,  emoji: '⚡' },
  { id: 'tinta',       label: 'Tinta Preta',    preco: 15,  emoji: '🖤' },
  { id: 'mensal',      label: 'Plano Mensal',   preco: 80,  emoji: '📅' },
  { id: 'mensaltinta', label: 'Mensal + Tinta', preco: 100, emoji: '💎' },
  { id: 'outros',      label: 'Outros',         preco: 0,   emoji: '➕' },
]
