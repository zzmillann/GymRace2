import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { PLAN_CONFIG, type PlanId } from '@/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!stripe) {
    // Sin claves de Stripe → el Paywall caerá a modo demo.
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  try {
    const { plan, userId } = await req.json();
    const cfg = PLAN_CONFIG[plan as PlanId];
    if (!cfg) return NextResponse.json({ error: 'invalid_plan' }, { status: 400 });

    const origin = req.headers.get('origin') || req.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Omitimos payment_method_types a propósito: Stripe muestra automáticamente
      // los métodos activados en tu Dashboard (tarjeta, Apple Pay/Google Pay, Bizum).
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: cfg.amount,
          product_data: { name: cfg.name },
        },
      }],
      client_reference_id: userId || undefined,
      metadata: { userId: userId || '', plan },
      success_url: `${origin}/?pro=success`,
      cancel_url: `${origin}/?pro=cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'checkout_error' }, { status: 500 });
  }
}
