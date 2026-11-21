import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendPush, vapidFromEnv, type PushMessage } from '@/lib/webpush';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Si el cron se salta un minuto, un recordatorio aún sale dentro de este margen
const CATCH_UP_MIN = 20;

/** Fecha 'yyyy-MM-dd' y hora 'HH:mm' ahora mismo en la zona horaria del usuario. */
function localNow(timeZone: string): { date: string; hm: string } {
  const fmt = (tz: string) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).formatToParts(new Date()).map((x) => [x.type, x.value]),
    );
    return { date: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}` };
  };
  try { return fmt(timeZone); } catch { return fmt('Europe/Madrid'); }
}

const toMin = (hm: string) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
const isDue = (target: string | null | undefined, nowHm: string) => {
  if (!target || !/^\d{1,2}:\d{2}$/.test(target)) return false;
  const diff = toMin(nowHm) - toMin(target);
  return diff >= 0 && diff <= CATCH_UP_MIN;
};

/**
 * Cron (cada minuto, ver worker.ts): manda las notificaciones push.
 *  1. Recordatorio diario y recordatorios por hábito, a la hora local de cada uno,
 *     solo si ese hábito sigue sin marcar hoy.
 *  2. Solicitudes de amistad e invitaciones a retos nuevas.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') || '';
    const key = req.nextUrl.searchParams.get('key') || '';
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const db = supabaseAdmin;
  const vapid = vapidFromEnv();
  if (!db) return NextResponse.json({ error: 'no_service_role' }, { status: 503 });
  if (!vapid) return NextResponse.json({ error: 'no_vapid_keys' }, { status: 503 });

  const { data: subs, error: subsErr } = await db.from('push_subscriptions').select('endpoint, user_id, p256dh, auth');
  if (subsErr) return NextResponse.json({ error: subsErr.message }, { status: 500 });
  if (!subs?.length) return NextResponse.json({ ok: true, subscriptions: 0, sent: 0 });

  const subsByUser = new Map<string, typeof subs>();
  for (const s of subs) subsByUser.set(s.user_id, [...(subsByUser.get(s.user_id) || []), s]);
  const userIds = Array.from(subsByUser.keys());

  const outbox: { userId: string; msg: PushMessage }[] = [];

  const { data: prefsRows } = await db
    .from('notification_prefs')
    .select('user_id, timezone, daily_reminder, reminder_time, habit_reminders, social_notifs, last_sent')
    .in('user_id', userIds);
  const prefsByUser = new Map((prefsRows || []).map((p) => [p.user_id as string, p]));

  // ---------- 1. Recordatorios ----------
  type Due = { userId: string; date: string; daily: boolean; habitIds: string[]; lastSent: Record<string, string> };
  const due: Due[] = [];
  for (const p of prefsRows || []) {
    const { date, hm } = localNow(p.timezone || 'Europe/Madrid');
    const lastSent: Record<string, string> = p.last_sent || {};
    const daily = !!p.daily_reminder && lastSent.daily !== date && isDue(p.reminder_time, hm);
    const habitIds = Object.entries((p.habit_reminders || {}) as Record<string, string>)
      .filter(([id, time]) => lastSent[id] !== date && isDue(time, hm))
      .map(([id]) => id);
    if (daily || habitIds.length) due.push({ userId: p.user_id, date, daily, habitIds, lastSent });
  }

  if (due.length) {
    // Hábitos de esos usuarios, con lo que lleva marcado cada uno
    const { data: parts } = await db
      .from('habit_participants')
      .select('habit_id, user_id, history, habits(title, user_id, history)')
      .in('user_id', due.map((d) => d.userId));

    for (const d of due) {
      const mine = (parts || []).filter((x: any) => x.user_id === d.userId && x.habits);
      const doneToday = (x: any) =>
        !!x.history?.[d.date] || (x.habits.user_id === d.userId && !!x.habits.history?.[d.date]);

      if (d.daily) {
        const pending = mine.filter((x: any) => !doneToday(x));
        if (pending.length) {
          outbox.push({
            userId: d.userId,
            msg: {
              title: '🔥 GymRace — ¡No rompas tu racha!',
              body: pending.length === 1
                ? `Te queda "${(pending[0] as any).habits.title}" por marcar hoy.`
                : `Tienes ${pending.length} actividades sin marcar hoy. ¡Vamos!`,
              tag: 'gymrace-daily-reminder',
              url: '/',
            },
          });
        }
        d.lastSent.daily = d.date;
      }

      for (const habitId of d.habitIds) {
        const h: any = mine.find((x: any) => x.habit_id === habitId);
        if (h && !doneToday(h)) {
          outbox.push({
            userId: d.userId,
            msg: { title: '⏰ Recordatorio', body: `Es hora de "${h.habits.title}". ¡No lo dejes!`, tag: 'gymrace-habit-' + habitId, url: `/habit/${habitId}` },
          });
        }
        d.lastSent[habitId] = d.date;
      }

      // Se apunta antes de enviar: mejor perder un aviso que mandarlo dos veces
      await db.from('notification_prefs').update({ last_sent: d.lastSent }).eq('user_id', d.userId);
    }
  }

  // ---------- 2. Avisos sociales ----------
  const wantsSocial = (uid: string) => subsByUser.has(uid) && prefsByUser.get(uid)?.social_notifs !== false;
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString(); // nada de avisos de hace días

  const { data: newReqs } = await db
    .from('friendships')
    .select('id, friend_id, profiles!friendships_user_id_fkey(user_name)')
    .eq('status', 'pending').eq('push_sent', false).gte('created_at', since)
    .in('friend_id', userIds);
  if (newReqs?.length) {
    await db.from('friendships').update({ push_sent: true }).in('id', newReqs.map((r) => r.id));
    for (const r of newReqs as any[]) {
      if (!wantsSocial(r.friend_id)) continue;
      outbox.push({
        userId: r.friend_id,
        msg: { title: '👋 Nueva solicitud de amistad', body: `${r.profiles?.user_name || 'Alguien'} te quiere agregar como amigo`, tag: 'fr_' + r.id, url: '/' },
      });
    }
  }

  const { data: newInv } = await db
    .from('habit_invitations')
    .select('id, receiver_id, habits(title), profiles!habit_invitations_sender_id_fkey(user_name)')
    .eq('status', 'pending').eq('push_sent', false).gte('created_at', since)
    .in('receiver_id', userIds);
  if (newInv?.length) {
    await db.from('habit_invitations').update({ push_sent: true }).in('id', newInv.map((i) => i.id));
    for (const i of newInv as any[]) {
      if (!wantsSocial(i.receiver_id)) continue;
      outbox.push({
        userId: i.receiver_id,
        msg: { title: '🔥 Invitación a un reto', body: `${i.profiles?.user_name || 'Alguien'} te ha invitado a "${i.habits?.title || 'un reto'}"`, tag: 'inv_' + i.id, url: '/' },
      });
    }
  }

  // ---------- 3. Envío ----------
  let sent = 0;
  const gone: string[] = [];
  const failed: number[] = [];
  await Promise.all(outbox.flatMap(({ userId, msg }) =>
    (subsByUser.get(userId) || []).map(async (s) => {
      try {
        const status = await sendPush(s, msg, vapid);
        if (status === 404 || status === 410) gone.push(s.endpoint);
        else if (status >= 200 && status < 300) sent++;
        else failed.push(status);
      } catch {
        failed.push(0);
      }
    }),
  ));
  // Suscripciones caducadas (desinstaló la app, quitó el permiso…)
  if (gone.length) await db.from('push_subscriptions').delete().in('endpoint', gone);

  return NextResponse.json({ ok: true, subscriptions: subs.length, queued: outbox.length, sent, removed: gone.length, failed });
}
