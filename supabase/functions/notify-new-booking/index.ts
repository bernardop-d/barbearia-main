import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webPush from 'npm:web-push'

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const agendamento = payload.record
    if (!agendamento) return new Response('ok')

    const vapidPublic  = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidEmail   = Deno.env.get('VAPID_EMAIL') || 'mailto:admin@yourbarber.com.br'
    if (!vapidPublic || !vapidPrivate) return new Response('ok')

    webPush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: subs } = await supabase
      .from('barbeiro_push_subscriptions')
      .select('id, subscription')
      .eq('barbearia_id', agendamento.barbearia_id)

    if (!subs?.length) return new Response('ok')

    const hora = new Date(agendamento.data).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    })

    for (const sub of subs) {
      try {
        await webPush.sendNotification(sub.subscription, JSON.stringify({
          title: '📅 Novo agendamento!',
          body:  `${agendamento.nome} — ${agendamento.servico} às ${hora}`,
          url:   '/',
        }))
      } catch (e: any) {
        if (e?.statusCode === 410) {
          await supabase.from('barbeiro_push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }

    return new Response('ok')
  } catch (e) {
    console.error(e)
    return new Response('error', { status: 500 })
  }
})
