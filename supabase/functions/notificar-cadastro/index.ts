import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

const GOD_EMAIL = 'contato.bernardopd@gmail.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user } } = await callerClient.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: cors })

    const { nome, email, slug } = await req.json()

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Your Barber <onboarding@resend.dev>',
        to: [GOD_EMAIL],
        subject: `⏳ Nova barbearia aguardando aprovação: ${nome}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#00e87a">Nova conta criada</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#888">Barbearia</td><td style="font-weight:bold">${nome}</td></tr>
              <tr><td style="padding:8px 0;color:#888">Email</td><td>${email}</td></tr>
              <tr><td style="padding:8px 0;color:#888">Slug</td><td>/${slug}</td></tr>
            </table>
            <a href="https://bernardop-d.github.io/barbearia-main/" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#00e87a;color:#0a0a0a;text-decoration:none;border-radius:8px;font-weight:bold">
              Abrir God Panel →
            </a>
          </div>
        `,
      }),
    })

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors })
  }
})
