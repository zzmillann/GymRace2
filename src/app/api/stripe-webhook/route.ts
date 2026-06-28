import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { PLAN_CONFIG, type PlanId } from '@/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await req.text(); // cuerpo CRUDO, necesario para verificar la firma

  let event: any;
  try {
    event = secret && sig
      ? stripe.webhooks.constructEvent(body, sig, secret)
      : JSON.parse(body);
  } catch (e: any) {
    return NextResponse.json({ error: `Firma inválida: ${e?.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    const userId = s.client_reference_id || s.metadata?.userId;
    const plan = (s.metadata?.plan as PlanId) || 'monthly';

    if (userId && supabaseAdmin) {
      const days = PLAN_CONFIG[plan]?.days || 30;
      const proUntil = new Date(Date.now() + days * 86400000).toISOString();
      await supabaseAdmin
        .from('profiles')
        .update({ is_pro: true, subscription_plan: plan, pro_until: proUntil })
        .eq('id', userId);
    }
  }

  return NextResponse.json({ received: true });
}
