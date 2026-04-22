export const COLORS = {
  bg: '#0D0D0D',
  card: '#161616',
  cardAlt: '#1A1A1A',
  border: '#222222',
  borderLight: '#2A2A2A',

  green: '#22c55e',
  greenLight: '#4ade80',
  greenBg: 'rgba(34,197,94,0.10)',
  greenBorder: 'rgba(34,197,94,0.30)',

  gold: '#d97706',
  goldLight: '#fbbf24',
  goldBg: 'rgba(217,119,6,0.10)',
  goldBorder: 'rgba(217,119,6,0.30)',

  white: '#FFFFFF',
  textMuted: '#666666',
  textDim: '#444444',

  error: '#ef4444',
  errorBg: 'rgba(239,68,68,0.10)',
  errorBorder: 'rgba(239,68,68,0.30)',

  orange: '#f97316',
  orangeBg: 'rgba(249,115,22,0.10)',
  orangeBorder: 'rgba(249,115,22,0.30)',

  emerald: '#10b981',
  emeraldBg: 'rgba(16,185,129,0.10)',
  emeraldBorder: 'rgba(16,185,129,0.30)',
}

export const CARD = {
  backgroundColor: COLORS.card,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: COLORS.border,
  padding: 16,
}

export const INPUT = {
  backgroundColor: COLORS.cardAlt,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: COLORS.border,
  paddingHorizontal: 16,
  paddingVertical: 13,
  color: COLORS.white,
  fontSize: 15,
}

export const BTN_PRIMARY = {
  backgroundColor: COLORS.green,
  borderRadius: 14,
  paddingVertical: 14,
  alignItems: 'center',
  justifyContent: 'center',
}

export const BTN_GHOST = {
  backgroundColor: 'transparent',
  borderRadius: 14,
  borderWidth: 1,
  borderColor: COLORS.borderLight,
  paddingVertical: 14,
  alignItems: 'center',
  justifyContent: 'center',
}

export const LABEL = {
  color: COLORS.textMuted,
  fontSize: 11,
  fontWeight: '600',
  letterSpacing: 1,
  textTransform: 'uppercase',
  marginBottom: 8,
}
