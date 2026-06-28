'use client';

import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useAppStore } from '@/store/useHabitStore';

const LS_KEY = 'gymrace-last-reminder'; // guarda la fecha del último aviso para no repetir

/**
 * Lanza una notificación local diaria a la hora elegida (settings.reminderTime)
 * si quedan hábitos sin marcar ese día. Funciona mientras la app esté abierta
 * (o en segundo plano en una PWA instalada). Para push real con la app cerrada
 * haría falta un service worker + servidor de push.
 */
export function ReminderScheduler() {
  const { settings, habits, userId } = useAppStore();
  const lastCheck = useRef<string>('');

  useEffect(() => {
    if (!userId) return;
    if (!settings.dailyReminder) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const fireIfNeeded = (allowCatchUp: boolean) => {
      if (Notification.permission !== 'granted') return;

      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const nowHM = format(now, 'HH:mm');

      // ¿Ya hemos avisado hoy?
      if (localStorage.getItem(LS_KEY) === today) return;

      // Solo en la franja correcta: a la hora exacta, o "catch-up" si la app
      // se abre más tarde de la hora fijada y aún no se ha avisado.
      const target = settings.reminderTime;
      const onTime = nowHM === target;
      const late = allowCatchUp && nowHM > target;
      if (!onTime && !late) return;

      // ¿Quedan actividades sin marcar hoy?
      const pending = habits.filter((h) => !h.history[today]);
      if (pending.length === 0) return;

      localStorage.setItem(LS_KEY, today);

      const title = '🔥 GymRace — ¡No rompas tu racha!';
      const body =
        pending.length === 1
          ? `Te queda "${pending[0].title}" por marcar hoy.`
          : `Tienes ${pending.length} actividades sin marcar hoy. ¡Vamos!`;

      try {
        new Notification(title, {
          body,
          icon: '/icons/apple-touch-icon.png',
          badge: '/icons/apple-touch-icon.png',
          tag: 'gymrace-daily-reminder',
        });
      } catch {
        /* algunos navegadores requieren service worker; lo ignoramos en silencio */
      }
    };

    // Comprobación al abrir (catch-up) y luego cada 30 s.
    fireIfNeeded(true);
    const id = setInterval(() => {
      const stamp = format(new Date(), 'HH:mm');
      if (stamp === lastCheck.current) return;
      lastCheck.current = stamp;
      fireIfNeeded(false);
    }, 30_000);

    return () => clearInterval(id);
  }, [settings.dailyReminder, settings.reminderTime, habits, userId]);

  return null;
}
