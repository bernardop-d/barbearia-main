// src/utils/formatters.js
// Instâncias cacheadas de Intl para evitar recriação a cada render

const fmtMoeda     = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
const fmtHora      = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const fmtDataLonga = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const fmtMes       = new Intl.DateTimeFormat('pt-BR', { month: 'short' })

export const formatarMoeda = (valor) =>
  fmtMoeda.format(Number(valor))

export const formatarDataCurta = (data) =>
  fmtDataCurta.format(new Date(data))

export const formatarHora = (data) =>
  fmtHora.format(new Date(data))

export const formatarDataLonga = (data) => {
  const str = fmtDataLonga.format(new Date(data))
  return str.replace(/^./, (s) => s.toUpperCase())
}

export const formatarMes = (data) =>
  fmtMes.format(new Date(data))
