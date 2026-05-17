import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const { id } = await req.json()
    if (!id) return new Response(JSON.stringify({ error: 'id obrigatório' }), { status: 400, headers: cors })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: ag, error: fetchErr } = await supabase
      .from('agendamentos')
      .select('id, status, data')
      .eq('id', id)
      .single()

    if (fetchErr || !ag) return new Response(JSON.stringify({ error: 'Agendamento não encontrado' }), { status: 404, headers: cors })
    if (ag.status !== 'confirmado') return new Response(JSON.stringify({ error: 'Agendamento já foi ' + ag.status }), { status: 400, headers: cors })
    if (new Date(ag.data) <= new Date()) return new Response(JSON.stringify({ error: 'Não é possível cancelar agendamento passado' }), { status: 400, headers: cors })

    await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', id)

    return new Response(JSON.stringify({ ok: true }), { headers: cors })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors })
  }
})
