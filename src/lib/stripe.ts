import Stripe from 'stripe';

// Cliente de Stripe (solo servidor). Devuelve null si no hay clave configurada,
// para que el Paywall pueda caer a modo demo sin romper.
const key = process.env.STRIPE_SECRET_KEY;

// httpClient de fetch: es el que funciona en Cloudflare Workers (y también en Node).
export const stripe = key ? new Stripe(key, { httpClient: Stripe.createFetchHttpClient() }) : null;
