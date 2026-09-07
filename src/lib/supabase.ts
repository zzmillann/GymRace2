import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

/**
 * Sesión persistente: se guarda en localStorage y el token se renueva solo
 * antes de caducar, así que no hay que volver a iniciar sesión cada vez.
 * Sin esto, al cerrar la pestaña se perdía la sesión.
 *
 * Cuánto dura realmente lo decide el proyecto de Supabase
 * (Authentication → Sessions). Con el refresh automático, la sesión se
 * mantiene mientras se abra la app de vez en cuando.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'gymrace-auth',
    flowType: 'pkce',
  },
});
