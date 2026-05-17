// src/utils/formatters.js
const TZ = 'America/Sao_Paulo'

const fmtMoeda     = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: TZ })
const fmtHora      = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
const fmtDataLonga = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })
const fmtMes       = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: TZ })

export const hojeISO = () =>
  new Date().toLocaleDateString('sv-SE', { timeZone: TZ })

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
