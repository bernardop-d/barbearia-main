import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: godCheck } = await callerClient.rpc('is_god')
    let isGod = !!godCheck
    if (!isGod) {
      const { data: { user } } = await callerClient.auth.getUser()
      isGod = user?.email === 'contato.bernardopd@gmail.com'
    }
    if (!isGod) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 403, headers: cors })

    const { barbearia_id } = await req.json()
    if (!barbearia_id) return new Response(JSON.stringify({ error: 'barbearia_id obrigatório' }), { status: 400, headers: cors })

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: barb } = await admin.from('barbearias').select('owner_id').eq('id', barbearia_id).single()
    if (!barb) return new Response(JSON.stringify({ error: 'Barbearia não encontrada' }), { status: 404, headers: cors })

    // Deleta dados relacionados
    await admin.from('agendamentos').delete().or(`barbearia_id.eq.${barbearia_id},user_id.eq.${barb.owner_id}`)
    await admin.from('servicos').delete().eq('barbearia_id', barbearia_id)
    await admin.from('config').delete().eq('barbearia_id', barbearia_id)
    await admin.from('barbeiros').delete().eq('barbearia_id', barbearia_id)
    await admin.from('barbeiro_push_subscriptions').delete().eq('barbearia_id', barbearia_id)
    await admin.from('dias_bloqueados').delete().eq('barbearia_id', barbearia_id)
    await admin.from('produtos').delete().eq('barbearia_id', barbearia_id)
    await admin.from('vendas').delete().eq('barbearia_id', barbearia_id)
    await admin.from('despesas').delete().eq('barbearia_id', barbearia_id)
    await admin.from('barbearias').delete().eq('id', barbearia_id)
    await admin.auth.admin.deleteUser(barb.owner_id)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors })
  }
})
