import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    // Verifica se quem chamou é god
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: godCheck } = await callerClient.rpc('is_god')
    if (!godCheck) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 403, headers: cors })

    const { email, password, nome, slug, vencimento } = await req.json()
    if (!email || !password || !nome || !slug) {
      return new Response(JSON.stringify({ error: 'email, password, nome e slug são obrigatórios' }), { status: 400, headers: cors })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Cria usuário no auth
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authErr) return new Response(JSON.stringify({ error: authErr.message }), { status: 400, headers: cors })

    // Cria a barbearia
    const row: Record<string, unknown> = {
      owner_id:    authData.user.id,
      owner_email: email,
      nome,
      slug,
      ativo:       true,
    }
    if (vencimento) row.vencimento = vencimento

    const { data: barb, error: barbErr } = await admin
      .from('barbearias')
      .insert([row])
      .select()
      .single()

    if (barbErr) {
      // Rollback: remove o usuário criado
      await admin.auth.admin.deleteUser(authData.user.id)
      return new Response(JSON.stringify({ error: barbErr.message }), { status: 400, headers: cors })
    }

    return new Response(JSON.stringify({ user: authData.user, barbearia: barb }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors })
  }
})
