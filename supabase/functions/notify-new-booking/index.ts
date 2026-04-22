import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const agendamento = payload.record

    if (!agendamento) return new Response('ok')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')

    if (!tokens?.length) return new Response('ok')

    const hora = new Date(agendamento.data).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })

    const messages = tokens.map(({ token }: { token: string }) => ({
      to: token,
      title: '📅 Novo agendamento!',
      body: `${agendamento.nome} — ${agendamento.servico} às ${hora}`,
      sound: 'default',
      priority: 'high',
      data: { agendamentoId: agendamento.id },
    }))

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(messages),
    })

    return new Response('ok')
  } catch (e) {
    console.error(e)
    return new Response('error', { status: 500 })
  }
})
