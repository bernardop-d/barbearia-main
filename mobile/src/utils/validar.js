export function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

export function validarAgendamento(form, hora) {
  const nome = (form.nome || '').trim()
  if (!nome) return 'Informe seu nome.'
  if (nome.length < 2) return 'Nome muito curto.'
  if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nome)) return 'Nome inválido (só letras).'
  if (!form.data) return 'Escolha a data.'
  if (form.data < hojeISO()) return 'Data inválida.'
  if (hora === null || hora === undefined) return 'Escolha um horário.'
  const wa = (form.whatsapp || '').replace(/\D/g, '')
  if (wa) {
    if (wa.length < 10 || wa.length > 11) return 'WhatsApp inválido.'
    if (parseInt(wa.slice(0, 2)) < 11) return 'DDD inválido.'
  }
  return null
}
