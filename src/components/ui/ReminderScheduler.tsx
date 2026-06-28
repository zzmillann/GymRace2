'use client';

import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '@/store/useHabitStore';

const LS_KEY = 'gymrace-last-reminder';          // aviso global (por día)
const LS_HABIT_KEY = 'gymrace-habit-reminders';  // avisos por hábito (por día)

/**
 * Notificaciones locales:
 *  - Recordatorio global diario (settings.reminderTime) si quedan hábitos sin marcar.
 *  - Recordatorio por hábito a su hora (habitReminders[habitId]) si no está hecho.
 * Funciona con la app abierta o instalada como PWA.
 */
export function ReminderScheduler() {
  const { settings, habits, userId, habitReminders } = useAppStore();
  const lastCheck = useRef<string>('');

  useEffect(() => {
    if (!userId) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const notify = (title: string, body: string, tag: string) => {
      try { new Notification(title, { body, icon: '/icon.svg', badge: '/icon.svg', tag }); } catch { /* noop */ }
    };

    const check = (allowCatchUp: boolean) => {
      if (Notification.permission !== 'granted') return;
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const nowHM = format(now, 'HH:mm');

      // ---- Recordatorio global ----
      if (settings.dailyReminder && localStorage.getItem(LS_KEY) !== today) {
        const target = settings.reminderTime;
        if (nowHM === target || (allowCatchUp && nowHM > target)) {
          const pending = habits.filter((h) => !h.history[today]);
          if (pending.length > 0) {
            localStorage.setItem(LS_KEY, today);
            notify(
              '🔥 GymRace — ¡No rompas tu racha!',
              pending.length === 1
                ? `Te queda "${pending[0].title}" por marcar hoy.`
                : `Tienes ${pending.length} actividades sin marcar hoy. ¡Vamos!`,
              'gymrace-daily-reminder',
            );
          }
        }
      }

      // ---- Recordatorios por hábito ----
      let seen: Record<string, string> = {};
      try { seen = JSON.parse(localStorage.getItem(LS_HABIT_KEY) || '{}'); } catch { seen = {}; }
      let changed = false;
      for (const h of habits) {
        const time = habitReminders[h.id];
        if (!time) continue;
        if (h.history[today]) continue;       // ya completado hoy
        if (seen[h.id] === today) continue;   // ya avisado hoy
        if (nowHM === time || (allowCatchUp && nowHM > time)) {
          notify('⏰ Recordatorio', `Es hora de "${h.title}". ¡No lo dejes!`, 'gymrace-habit-' + h.id);
          seen[h.id] = today;
          changed = true;
        }
      }
      if (changed) localStorage.setItem(LS_HABIT_KEY, JSON.stringify(seen));
    };

    check(true);
    const id = setInterval(() => {
      const stamp = format(new Date(), 'HH:mm');
      if (stamp === lastCheck.current) return;
      lastCheck.current = stamp;
      check(false);
    }, 30_000);

    return () => clearInterval(id);
  }, [settings.dailyReminder, settings.reminderTime, habits, userId, habitReminders]);

  return null;
}
