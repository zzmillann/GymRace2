// Notificaciones push en el navegador: service worker + suscripción guardada en
// Supabase. El servidor (api/push-cron) es quien manda los avisos, así que
// llegan aunque la app esté cerrada.
import { supabase } from '@/lib/supabase';
import { b64urlToBytes, bytesToB64url } from '@/lib/webpush';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const PUSH_OK_KEY = 'gr_push_ok';

export type PushResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'ios-install' | 'denied' | 'no-key' | 'error'; message: string };

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);

/** true si este dispositivo ya recibe push del servidor (los avisos locales sobran). */
export function pushActive(): boolean {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  try { return localStorage.getItem(PUSH_OK_KEY) === '1'; } catch { return false; }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

const sameKey = (a: ArrayBuffer | null | undefined, b: Uint8Array) =>
  !!a && bytesToB64url(new Uint8Array(a)) === bytesToB64url(b);

/**
 * Activa el push en este dispositivo. Con `ask` pide permiso (llamar desde un
 * toque del usuario: en iPhone es obligatorio); sin él solo renueva la
 * suscripción si el permiso ya estaba concedido.
 */
export async function enablePush({ ask = true } = {}): Promise<PushResult> {
  if (isIOS() && !isStandalone()) {
    return { ok: false, reason: 'ios-install', message: 'En iPhone, añade GymRace a la pantalla de inicio (Compartir → Añadir a inicio) y ábrela desde ahí para recibir avisos.' };
  }
  if (!pushSupported()) return { ok: false, reason: 'unsupported', message: 'Tu navegador no soporta notificaciones push' };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'no-key', message: 'Falta configurar las claves de notificaciones' };

  let perm = Notification.permission;
  if (perm === 'default' && ask) perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, reason: 'denied', message: 'Permiso de notificaciones denegado' };

  try {
    const reg = await registerServiceWorker();
    if (!reg) throw new Error('sin service worker');
    const appKey = b64urlToBytes(VAPID_PUBLIC_KEY);

    let sub = await reg.pushManager.getSubscription();
    // Si cambiaron las claves VAPID, la suscripción vieja ya no sirve
    if (sub && !sameKey(sub.options?.applicationServerKey, appKey)) {
      await sub.unsubscribe().catch(() => {});
      sub = null;
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });

    const json = sub.toJSON();
    const { error } = await supabase.rpc('save_push_subscription', {
      p_endpoint: sub.endpoint,
      p_p256dh: json.keys?.p256dh,
      p_auth: json.keys?.auth,
    });
    if (error) throw error;
    try { localStorage.setItem(PUSH_OK_KEY, '1'); } catch { /* noop */ }
    return { ok: true };
  } catch (e: any) {
    try { localStorage.removeItem(PUSH_OK_KEY); } catch { /* noop */ }
    return { ok: false, reason: 'error', message: 'No se pudieron activar las notificaciones' + (e?.message ? `: ${e.message}` : '') };
  }
}

/** Deja de recibir push en este dispositivo (y lo borra del servidor). */
export async function disablePush(): Promise<void> {
  try { localStorage.removeItem(PUSH_OK_KEY); } catch { /* noop */ }
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      await sub.unsubscribe();
    }
  } catch { /* noop */ }
}

/** Al cerrar sesión: este dispositivo deja de recibir los avisos de esa cuenta. */
export async function forgetPushForThisDevice(): Promise<void> {
  try { localStorage.removeItem(PUSH_OK_KEY); } catch { /* noop */ }
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  } catch { /* noop */ }
}

export interface NotificationPrefs {
  dailyReminder: boolean;
  reminderTime: string;
  habitReminders: Record<string, string>;
  socialNotifs: boolean;
}

/** Copia en Supabase lo que el servidor necesita para saber cuándo avisar. */
export async function syncNotificationPrefs(userId: string, p: NotificationPrefs): Promise<void> {
  let timezone = 'Europe/Madrid';
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone; } catch { /* noop */ }
  await supabase.from('notification_prefs').upsert({
    user_id: userId,
    timezone,
    daily_reminder: p.dailyReminder,
    reminder_time: p.reminderTime,
    habit_reminders: p.habitReminders,
    social_notifs: p.socialNotifs,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}
