'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useHabitStore';
import { enablePush, registerServiceWorker, syncNotificationPrefs } from '@/lib/push';

/**
 * Mantiene al día el push de este dispositivo:
 *  - instala el service worker (lo que recibe los avisos con la app cerrada);
 *  - si el permiso ya está concedido, renueva la suscripción en Supabase;
 *  - copia en Supabase las horas de los recordatorios para que el servidor
 *    sepa cuándo avisar.
 */
export function PushSync() {
  const userId = useAppStore((s) => s.userId);
  const pushEnabled = useAppStore((s) => s.settings.pushEnabled);
  const dailyReminder = useAppStore((s) => s.settings.dailyReminder);
  const reminderTime = useAppStore((s) => s.settings.reminderTime);
  const socialNotifs = useAppStore((s) => s.settings.socialNotifs);
  const habitReminders = useAppStore((s) => s.habitReminders);

  useEffect(() => { registerServiceWorker(); }, []);

  useEffect(() => {
    if (!userId || !pushEnabled) return;
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
    enablePush({ ask: false });
  }, [userId, pushEnabled]);

  useEffect(() => {
    if (!userId) return;
    // Pequeña espera: al mover la hora con el selector no mandamos una escritura por cada cambio
    const t = setTimeout(() => {
      syncNotificationPrefs(userId, {
        dailyReminder: pushEnabled && dailyReminder,
        reminderTime,
        habitReminders: pushEnabled ? habitReminders : {},
        socialNotifs: pushEnabled && socialNotifs,
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [userId, pushEnabled, dailyReminder, reminderTime, socialNotifs, habitReminders]);

  return null;
}
