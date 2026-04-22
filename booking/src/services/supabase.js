import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

const PRECOS_VALIDOS = {
  'Corte Normal': 35, 'Cabelo + Barba': 55, 'Platinado': 60,
  'Tinta Preta': 15, 'Plano Mensal': 80, 'Mensal + Tinta': 100,
}

export async function criarAgendamentoPublico(agendamento) {
  const preco = PRECOS_VALIDOS[agendamento.servico]
  if (!preco) throw new Error('Serviço inválido.')

  if (new Date(agendamento.data) < new Date()) throw new Error('Data inválida.')

  if (agendamento.whatsapp) {
    const dia    = agendamento.data.slice(0, 10)
    const inicio = new Date(dia + 'T00:00:00').toISOString()
    const fim    = new Date(dia + 'T23:59:59').toISOString()
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

export async function buscarDiasBloqueados() {
  const { data, error } = await supabase
    .from('dias_bloqueados')
    .select('data')
  if (error) return []
  return (data || []).map(r => r.data)
}

export async function buscarHorariosOcupados(data) {
  const inicio = new Date(data + 'T00:00:00').toISOString()
  const fim    = new Date(data + 'T23:59:59').toISOString()
  const { data: rows, error } = await supabase
    .rpc('horarios_ocupados', { p_inicio: inicio, p_fim: fim })
  if (error) throw error
  return (rows || []).map(r => new Date(r.hora).getHours())
}
