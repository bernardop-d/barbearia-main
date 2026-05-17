import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])

function mapStatus(stripeStatus: string): string {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') return 'active'
  if (stripeStatus === 'past_due' || stripeStatus === 'unpaid')  return 'past_due'
  return 'canceled'
}

Deno.serve(async (req) => {
  const sig  = req.headers.get('stripe-signature') ?? ''
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET')!)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return new Response('Webhook Error', { status: 400 })
  }

  if (!EVENTS.has(event.type)) return new Response('ok')

  const sub = event.data.object as Stripe.Subscription

  const { error } = await supabase.from('barbearias').update({
    stripe_subscription_id: sub.id,
    subscription_status:    mapStatus(sub.status),
    subscription_ends_at:   new Date(sub.current_period_end * 1000).toISOString(),
  }).eq('stripe_customer_id', sub.customer as string)

  if (error) console.error('DB update error:', error)

  return new Response('ok')
})
