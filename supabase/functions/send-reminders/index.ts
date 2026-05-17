// Enviar lembretes de push notification para agendamentos em ~1h
// Chamar via pg_cron: select cron.schedule('lembretes', '*/15 * * * *', 'select net.http_post(...)')
// Ou manualmente pelo dashboard Supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webPush from 'npm:web-push'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  const vapidPublic  = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidEmail   = Deno.env.get('VAPID_EMAIL') || 'mailto:admin@yourbarber.com.br'

  if (!vapidPublic || !vapidPrivate) {
    return new Response(JSON.stringify({ error: 'VAPID keys não configuradas' }), { status: 500, headers: cors })
  }

  webPush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Busca lembretes pendentes para os próximos 15 minutos
  const agora = new Date()
  const limite = new Date(agora.getTime() + 15 * 60 * 1000)

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('enviado', false)
    .lte('lembrete_em', limite.toISOString())

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ enviados: 0 }), { headers: cors })
  }

  let enviados = 0
  for (const sub of subs) {
    try {
      await webPush.sendNotification(sub.subscription, JSON.stringify({
        title: 'Lembrete de agendamento',
        body: 'Seu horário está chegando em 1 hora!',
        url: '/booking/',
      }))
      await supabase.from('push_subscriptions').update({ enviado: true }).eq('id', sub.id)
      enviados++
    } catch (e) {
      console.error('Erro ao enviar push:', e)
      // Subscription expirada — remove
      if ((e as any)?.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return new Response(JSON.stringify({ enviados }), { headers: cors })
})
