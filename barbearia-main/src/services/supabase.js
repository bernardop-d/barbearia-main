// src/services/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL  || 'https://SEU_PROJETO.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'SUA_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)

// ─────────────────────────────────────────────────────────────────────────────
// SQL para criar a tabela no Supabase (rodar no SQL Editor):
//
// create table agendamentos (
//   id         uuid primary key default gen_random_uuid(),
//   user_id    uuid references auth.users(id) default auth.uid() not null,
//   nome       text not null,
//   servico    text not null,
//   preco      numeric not null,
//   data       timestamptz not null,
//   status     text not null default 'confirmado',
//   whatsapp   text,
//   created_at timestamptz default now()
// );
//
// -- Habilitar RLS
// alter table agendamentos enable row level security;
//
// -- Política: cada usuário só vê e manipula seus próprios registros
// create policy "usuarios_proprios_dados" on agendamentos
//   for all
//   using (auth.uid() = user_id)
//   with check (auth.uid() = user_id);
// ─────────────────────────────────────────────────────────────────────────────

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
  if (!user) throw new Error('Usuário não autenticado')

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
  const { error } = await supabase
    .from('agendamentos')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function getNomeBarbearia() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('barbearias')
    .select('nome')
    .eq('owner_id', user.id)
    .maybeSingle()
  return data?.nome ?? null
}

// ─── Dias bloqueados ────────────────────────────────────────────────────────
export async function getDiasBloqueados() {
  const { data, error } = await supabase
    .from('dias_bloqueados')
    .select('*')
    .order('data', { ascending: true })
  if (error) throw error
  return data || []
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

// ─── Stripe ─────────────────────────────────────────────────────────────────
export async function criarCheckout(priceId) {
  const { data: { session } } = await supabase.auth.getSession()
  const base = window.location.href.replace(/[^/]*$/, '').replace(/\/?$/, '/')
  const resp = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      price_id:    priceId,
      success_url: `${base}?assinatura=ok`,
      cancel_url:  `${base}upgrade`,
    }),
  })
  if (!resp.ok) throw new Error('Erro ao iniciar checkout')
  const { url } = await resp.json()
  return url
}

export async function abrirPortal() {
  const { data: { session } } = await supabase.auth.getSession()
  const base = window.location.href.replace(/[^/]*$/, '').replace(/\/?$/, '/')
  const resp = await fetch(`${supabaseUrl}/functions/v1/create-portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ return_url: base }),
  })
  if (!resp.ok) throw new Error('Erro ao abrir portal')
  const { url } = await resp.json()
  return url
}

// ─── Barbearia atual ────────────────────────────────────────────────────────
export async function verificarSlug(slug) {
  const { data } = await supabase.from('barbearias').select('id').eq('slug', slug).maybeSingle()
  return !data
}

export async function criarBarbeariaAtual(nome, slug) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const { data, error } = await supabase
    .from('barbearias')
    .insert([{ nome, slug, owner_id: user.id, ativo: false }])
    .select().single()
  if (error) throw error

  // Notifica o admin (fire and forget)
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) return
    fetch(`${supabaseUrl}/functions/v1/notificar-cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ nome, email: user.email, slug }),
    }).catch(() => {})
  })

  return data
}

export async function deletarConta(barbeariaId) {
  const { data: { session } } = await supabase.auth.getSession()
  const resp = await fetch(`${supabaseUrl}/functions/v1/deletar-conta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
    body: JSON.stringify({ barbearia_id: barbeariaId }),
  })
  if (!resp.ok) {
    const json = await resp.json()
    throw new Error(json.error || 'Erro ao deletar conta')
  }
}

export async function getBarbeariaAtual() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('barbearias')
    .select('id, nome, slug, ativo, vencimento, subscription_status, trial_ends_at, subscription_ends_at, stripe_customer_id')
    .eq('owner_id', user.id)
    .maybeSingle()
  return data ?? null
}

// ─── Serviços (admin) ────────────────────────────────────────────────────────
export async function getServicosAdmin(barbearia_id = null) {
  let q = supabase.from('servicos').select('*').order('created_at', { ascending: true })
  if (barbearia_id) q = q.eq('barbearia_id', barbearia_id)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function criarServico(servico) {
  const { data, error } = await supabase.from('servicos').insert([servico]).select().single()
  if (error) throw error
  return data
}

export async function atualizarServico(id, campos) {
  const { data, error } = await supabase.from('servicos').update(campos).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function removerServico(id) {
  const { error } = await supabase.from('servicos').delete().eq('id', id)
  if (error) throw error
}

// ─── Config (admin) ──────────────────────────────────────────────────────────
export async function getConfigAdmin(key, barbearia_id = null) {
  let q = supabase.from('config').select('value').eq('key', key)
  if (barbearia_id) q = q.eq('barbearia_id', barbearia_id)
  const { data } = await q.maybeSingle()
  return data?.value ?? null
}

export async function setConfigAdmin(key, value, barbearia_id = null) {
  const row = barbearia_id ? { key, value, barbearia_id } : { key, value }
  const { error } = await supabase
    .from('config')
    .upsert(row, { onConflict: barbearia_id ? 'key,barbearia_id' : 'key' })
  if (error) throw error
}

// ─── Produtos ───────────────────────────────────────────────────────────────
export async function getProdutos() {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('ativo', true)
    .order('nome')
  if (error) throw error
  return data || []
}

export async function criarProduto(produto) {
  const { data, error } = await supabase
    .from('produtos')
    .insert([produto])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarProduto(id, campos) {
  const { data, error } = await supabase
    .from('produtos')
    .update(campos)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function ajustarEstoqueDb(id, delta) {
  const { error } = await supabase.rpc('ajustar_estoque', { p_id: id, p_delta: delta })
  if (error) throw error
}

// ─── Vendas ─────────────────────────────────────────────────────────────────
export async function getVendas(de = null, ate = null) {
  let q = supabase
    .from('vendas')
    .select('*')
    .order('data', { ascending: false })
    .limit(200)
  if (de)  q = q.gte('data', de)
  if (ate) q = q.lte('data', ate)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function criarVenda(venda) {
  const { data, error } = await supabase
    .from('vendas')
    .insert([venda])
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Barbeiros ──────────────────────────────────────────────────────────────
export async function getBarbeiros(barbearia_id = null) {
  let q = supabase.from('barbeiros').select('*').order('created_at', { ascending: true })
  if (barbearia_id) q = q.eq('barbearia_id', barbearia_id)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function criarBarbeiro(barbeiro) {
  const { data, error } = await supabase.from('barbeiros').insert([barbeiro]).select().single()
  if (error) throw error
  return data
}

export async function atualizarBarbeiro(id, campos) {
  const { data, error } = await supabase.from('barbeiros').update(campos).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function removerBarbeiro(id) {
  const { error } = await supabase.from('barbeiros').delete().eq('id', id)
  if (error) throw error
}

// ─── Despesas ────────────────────────────────────────────────────────────────
export async function getDespesas(de = null, ate = null) {
  let q = supabase
    .from('despesas')
    .select('*')
    .order('data', { ascending: false })
    .limit(200)
  if (de)  q = q.gte('data', de)
  if (ate) q = q.lte('data', ate)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function criarDespesa(despesa) {
  const { data, error } = await supabase
    .from('despesas')
    .insert([despesa])
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Push admin (notificações pro barbeiro) ──────────────────────────────────
export async function salvarBarbeiroPush(barbearia_id, subscription) {
  const { error } = await supabase
    .from('barbeiro_push_subscriptions')
    .insert([{ barbearia_id, subscription }])
  if (error) throw error
}

export async function removerBarbeiroPush(endpoint) {
  const { error } = await supabase
    .from('barbeiro_push_subscriptions')
    .delete()
    .filter('subscription->>endpoint', 'eq', endpoint)
  if (error) throw error
}
