import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function logout() {
  await supabase.auth.signOut()
}

// ─── Barbearia ────────────────────────────────────────────────────────────────
export async function getBarbeariaPorSlug(slug) {
  const { data } = await supabase.from('barbearias').select('*').eq('slug', slug).maybeSingle()
  return data ?? null
}

// ─── Admin ────────────────────────────────────────────────────────────────────
export async function getAgendamentos(barbearia_id = null) {
  let q = supabase
    .from('agendamentos')
    .select('*')
    .order('data', { ascending: false })
    .limit(300)
  if (barbearia_id) q = q.eq('barbearia_id', barbearia_id)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function buscarMeusAgendamentos(whatsapp, barbearia_id = null) {
  let q = supabase
    .from('agendamentos')
    .select('id, nome, servico, data, preco, status')
    .eq('whatsapp', whatsapp)
    .order('data', { ascending: false })
    .limit(20)
  if (barbearia_id) q = q.eq('barbearia_id', barbearia_id)
  const { data, error } = await q
  if (error) return []
  return data || []
}

export async function getServicosCustom(barbearia_id = null) {
  let q = supabase
    .from('servicos')
    .select('id, label, desc, preco')
    .eq('ativo', true)
    .order('created_at', { ascending: true })
  if (barbearia_id) q = q.eq('barbearia_id', barbearia_id)
  const { data, error } = await q
  if (error) return []
  return data || []
}

export async function atualizarStatus(id, status) {
  const { data, error } = await supabase
    .from('agendamentos').update({ status }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function removerAgendamento(id) {
  const { error } = await supabase.from('agendamentos').delete().eq('id', id)
  if (error) throw error
}

// ─── Config ───────────────────────────────────────────────────────────────────
export async function buscarConfig(key, barbearia_id = null) {
  let q = supabase.from('config').select('value').eq('key', key)
  if (barbearia_id) q = q.eq('barbearia_id', barbearia_id)
  const { data } = await q.maybeSingle()
  return data?.value ?? null
}

// ─── Public booking ───────────────────────────────────────────────────────────
export async function criarAgendamentoPublico(agendamento) {
  const bid = agendamento.barbearia_id

  // Validar serviço — tenta tabela servicos filtrada pela barbearia
  let preco = null
  if (bid) {
    const { data: svc } = await supabase
      .from('servicos').select('preco').eq('label', agendamento.servico)
      .eq('ativo', true).eq('barbearia_id', bid).maybeSingle()
    if (svc) preco = svc.preco
  }
  // fallback: tabela de preços base
  const PRECOS_BASE = {
    'Corte Normal': 35, 'Cabelo + Barba': 55, 'Platinado': 60,
    'Tinta Preta': 15, 'Plano Mensal': 80, 'Mensal + Tinta': 100,
  }
  if (!preco) preco = PRECOS_BASE[agendamento.servico]
  if (!preco) throw new Error('Serviço inválido.')

  if (new Date(agendamento.data) < new Date()) throw new Error('Data inválida.')

  if (agendamento.whatsapp) {
    const dia    = agendamento.data.slice(0, 10)
    const inicio = new Date(dia + 'T00:00:00').toISOString()
    const fim    = new Date(dia + 'T23:59:59').toISOString()
    let dupQ = supabase.from('agendamentos').select('id')
      .eq('whatsapp', agendamento.whatsapp).eq('status', 'confirmado')
      .gte('data', inicio).lte('data', fim)
    if (bid) dupQ = dupQ.eq('barbearia_id', bid)
    const { data: existente } = await dupQ.maybeSingle()
    if (existente) throw new Error('Você já tem um agendamento nesse dia.')
  }

  const row = {
    nome:          agendamento.nome,
    servico:       agendamento.servico,
    preco,
    data:          agendamento.data,
    whatsapp:      agendamento.whatsapp,
    user_id:       null,
    status:        'confirmado',
    barbearia_id:  bid ?? null,
    barbeiro_id:   agendamento.barbeiro_id ?? null,
    barbeiro_nome: agendamento.barbeiro_nome ?? null,
  }

  const { error } = await supabase.from('agendamentos').insert([row])

  if (error) {
    if (error.code === '23505') throw new Error('Horário indisponível. Escolha outro.')
    throw error
  }
  return { ...row, id: crypto.randomUUID(), status: 'confirmado' }
}

export async function buscarDiasBloqueados(barbearia_id = null) {
  let q = supabase.from('dias_bloqueados').select('data')
  if (barbearia_id) q = q.eq('barbearia_id', barbearia_id)
  const { data, error } = await q
  if (error) return []
  return (data || []).map(r => r.data)
}

export async function buscarHorariosOcupados(data, barbearia_id = null, barbeiro_id = null) {
  const inicio = new Date(data + 'T00:00:00').toISOString()
  const fim    = new Date(data + 'T23:59:59').toISOString()
  const params = { p_inicio: inicio, p_fim: fim }
  if (barbearia_id) params.p_barbearia_id = barbearia_id
  if (barbeiro_id)  params.p_barbeiro_id  = barbeiro_id
  const { data: rows, error } = await supabase.rpc('horarios_ocupados', params)
  if (error) throw error
  return (rows || []).map(r => {
    const d = new Date(r.hora)
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  })
}

export async function buscarBarbeiros(barbearia_id) {
  if (!barbearia_id) return []
  const { data } = await supabase
    .from('barbeiros')
    .select('id, nome')
    .eq('barbearia_id', barbearia_id)
    .eq('ativo', true)
    .order('created_at', { ascending: true })
  return data || []
}

export async function cancelarAgendamento(id) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const resp = await fetch(`${supabaseUrl}/functions/v1/cancelar-agendamento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (!resp.ok) {
    const { error } = await resp.json().catch(() => ({}))
    throw new Error(error || 'Erro ao cancelar')
  }
  return true
}

export async function salvarPushSubscription(agendamento_id, barbearia_id, subscription, lembrete_em) {
  await supabase.from('push_subscriptions').insert([{
    agendamento_id,
    barbearia_id,
    subscription,
    lembrete_em,
  }])
}
