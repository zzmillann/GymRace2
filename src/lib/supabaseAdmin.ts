import { createClient } from '@supabase/supabase-js';

// Cliente de Supabase con service_role (SOLO servidor: nunca lo importes en cliente).
// Lo usa el webhook de Stripe para marcar al usuario como Pro saltándose las RLS.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = url && serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;
