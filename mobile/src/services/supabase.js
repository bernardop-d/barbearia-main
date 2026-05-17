import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://phhvzajbomoyedbwebgl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaHZ6YWpib21veWVkYndlYmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzMwMDAsImV4cCI6MjA4OTQ0OTAwMH0.ZW72jJcFcgiDnH76ZdqWt-bFcDNNM1eYbr344h6yvpA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// ─── Barbearia ────────────────────────────────────────────────────────────────
export async function getBarbearia(userId) {
  const { data } = await supabase.from('barbearias').select('*').eq('owner_id', userId).maybeSingle()
  return data ?? null
}

export async function criarBarbearia(userId, nome, slug) {
  const { data, error } = await supabase
    .from('barbearias').insert([{ owner_id: userId, nome, slug }]).select().single()
  if (error) throw error
  return data
}

export async function atualizarBarbearia(id, campos) {
  const { data, error } = await supabase
    .from('barbearias').update(campos).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function getBarbeariaPorSlug(slug) {
  const { data } = await supabase.from('barbearias').select('*').eq('slug', slug).maybeSingle()
  return data ?? null
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signup(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function logout() {
  await supabase.auth.signOut()
}

// ─── Admin (authed) ────────────────────────────────────────────────────────
export async function getAgendamentos() {
  const { data, error } = await supabase
    .from('agendamentos')
    .select('*')
    .order('data', { ascending: true })
  if (error) throw error
  return data
}

export async function criarAgendamento(agendamento) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const { data, error } = await supabase
    .from('agendamentos')
    .insert([{ ...agendamento, user_id: user.id }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarStatus(id, status) {
  const { data, error } = await supabase
    .from('agendamentos')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarAgendamento(id, campos) {
  const { data, error } = await supabase
    .from('agendamentos')
    .update(campos)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removerAgendamento(id) {
  const { error } = await supabase.from('agendamentos').delete().eq('id', id)
  if (error) throw error
}

// ─── Public booking ─────────────────────────────────────────────────────────
const PRECOS_VALIDOS = {
  'Corte Normal': 35, 'Cabelo + Barba': 55, 'Platinado': 60,
  'Tinta Preta': 15, 'Plano Mensal': 80, 'Mensal + Tinta': 100,
}

export async function criarAgendamentoPublico(agendamento) {
  let preco = PRECOS_VALIDOS[agendamento.servico]
  if (!preco) {
    const { data: svc } = await supabase
      .from('servicos').select('preco').eq('label', agendamento.servico).eq('ativo', true).maybeSingle()
    if (svc) preco = svc.preco
  }
  if (!preco) throw new Error('Serviço inválido.')
  if (new Date(agendamento.data) < new Date()) throw new Error('Data inválida.')

  // checar duplicidade por whatsapp no mesmo dia
  if (agendamento.whatsapp) {
    const inicio = new Date(agendamento.data.slice(0, 10) + 'T00:00:00').toISOString()
    const fim    = new Date(agendamento.data.slice(0, 10) + 'T23:59:59').toISOString()
    const { data: existente } = await supabase
      .from('agendamentos')
      .select('id')
      .eq('whatsapp', agendamento.whatsapp)
      .eq('status', 'confirmado')
      .gte('data', inicio)
      .lte('data', fim)
      .maybeSingle()
    if (existente) throw new Error('Você já tem um agendamento nesse dia.')
  }

  const { data, error } = await supabase
    .from('agendamentos')
    .insert([{
      nome:     agendamento.nome,
      servico:  agendamento.servico,
      preco,
      data:     agendamento.data,
      whatsapp: agendamento.whatsapp,
      user_id:  null,
      status:   'confirmado',
    }])
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('Horário indisponível. Escolha outro.')
    throw error
  }
  return data
}

export async function buscarHorariosOcupados(data, barbearia_id = null) {
  const inicio = new Date(data + 'T00:00:00').toISOString()
  const fim    = new Date(data + 'T23:59:59').toISOString()
  const params = { p_inicio: inicio, p_fim: fim }
  if (barbearia_id) params.p_barbearia_id = barbearia_id
  const { data: rows, error } = await supabase.rpc('horarios_ocupados', params)
  if (error) throw error
  return (rows || []).map(r => new Date(r.hora).getHours())
}

export async function buscarDiasBloqueados() {
  const { data, error } = await supabase
    .from('dias_bloqueados')
    .select('data, motivo')
  if (error) return []
  return (data || []).map(r => r.data)
}

export async function bloquearDia(data, motivo = '') {
  const { error } = await supabase
    .from('dias_bloqueados')
    .insert([{ data, motivo }])
  if (error) throw error
}

export async function desbloquearDia(data) {
  const { error } = await supabase
    .from('dias_bloqueados')
    .delete()
    .eq('data', data)
  if (error) throw error
}

// ─── Config ──────────────────────────────────────────────────────────────────
export async function buscarConfig(key, barbearia_id = null) {
  let q = supabase.from('config').select('value').eq('key', key)
  if (barbearia_id) q = q.eq('barbearia_id', barbearia_id)
  const { data } = await q.maybeSingle()
  return data?.value ?? null
}

export async function salvarConfig(key, value, barbearia_id = null) {
  const row = barbearia_id ? { key, value, barbearia_id } : { key, value }
  const { error } = await supabase
    .from('config')
    .upsert(row, { onConflict: 'key,barbearia_id' })
  if (error) throw error
}

// ─── Serviços customizados ────────────────────────────────────────────────────
export async function getServicosCustom(barbearia_id = null) {
  let q = supabase.from('servicos').select('*').eq('ativo', true).order('created_at', { ascending: true })
  if (barbearia_id) q = q.eq('barbearia_id', barbearia_id)
  const { data, error } = await q
  if (error) return []
  return data || []
}

export async function criarServico(servico) {
  const { data, error } = await supabase
    .from('servicos')
    .insert([servico])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removerServico(id) {
  const { error } = await supabase.from('servicos').update({ ativo: false }).eq('id', id)
  if (error) throw error
}

// ─── Produtos / Estoque ───────────────────────────────────────────────────────
export async function getProdutos(tipo = null) {
  let q = supabase.from('produtos').select('*').eq('ativo', true).order('nome')
  if (tipo) q = q.eq('tipo', tipo)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function criarProduto(produto) {
  const { data, error } = await supabase.from('produtos').insert([produto]).select().single()
  if (error) throw error
  return data
}

export async function atualizarProduto(id, dados) {
  const { data, error } = await supabase.from('produtos').update(dados).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function removerProduto(id) {
  const { error } = await supabase.from('produtos').update({ ativo: false }).eq('id', id)
  if (error) throw error
}

export async function ajustarEstoque(id, delta) {
  const { error } = await supabase.rpc('ajustar_estoque', { p_id: id, p_delta: delta })
  if (error) throw error
}

// ─── Vendas ───────────────────────────────────────────────────────────────────
export async function getVendas(limite = 50) {
  const { data, error } = await supabase
    .from('vendas').select('*').order('data', { ascending: false }).limit(limite)
  if (error) throw error
  return data || []
}

export async function registrarVenda(venda) {
  const { data, error } = await supabase
    .from('vendas')
    .insert([{ ...venda, data: new Date().toISOString() }])
    .select().single()
  if (error) throw error
  if (venda.produto_id) await ajustarEstoque(venda.produto_id, -venda.quantidade)
  return data
}

// ─── Despesas ─────────────────────────────────────────────────────────────────
export async function getDespesas(limite = 100) {
  const { data, error } = await supabase
    .from('despesas').select('*').order('data', { ascending: false }).limit(limite)
  if (error) throw error
  return data || []
}

export async function criarDespesa(despesa) {
  const { data, error } = await supabase.from('despesas').insert([despesa]).select().single()
  if (error) throw error
  return data
}

export async function removerDespesa(id) {
  const { error } = await supabase.from('despesas').delete().eq('id', id)
  if (error) throw error
}
