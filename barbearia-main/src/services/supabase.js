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
