'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useHabitStore';

const SEEN_KEY = 'gymrace-seen-social';

/**
 * Sondea solicitudes de amistad e invitaciones a retos y lanza una notificación
 * del sistema cuando llega algo nuevo ("X te quiere agregar", "X te ha invitado").
 * Requiere permiso de notificaciones (se concede desde el recordatorio diario)
 * y el toggle "Actividad social" activado en Ajustes.
 */
export function SocialNotifier() {
  const userId = useAppStore((s) => s.userId);
  const socialNotifs = useAppStore((s) => s.settings.socialNotifs);
  const pendingRequests = useAppStore((s) => s.pendingRequests);
  const habitInvitations = useAppStore((s) => s.habitInvitations);
  const refreshSocial = useAppStore((s) => s.refreshSocial);

  // Sondeo periódico mientras la app está abierta
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(() => { refreshSocial(); }, 40_000);
    return () => clearInterval(id);
  }, [userId, refreshSocial]);

  // Notifica lo nuevo (no visto previamente)
  useEffect(() => {
    if (!userId || !socialNotifs) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    let seen: string[] = [];
    try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch {}
    const seenSet = new Set(seen);

    pendingRequests
      .filter((r) => !seenSet.has('fr_' + r.id))
      .forEach((r) => {
        try {
          new Notification('👋 Nueva solicitud de amistad', {
            body: `${r.sender_name} te quiere agregar como amigo`,
            icon: '/icon.svg', tag: 'fr_' + r.id,
          });
        } catch {}
      });

    habitInvitations
      .filter((i) => !seenSet.has('inv_' + i.id))
      .forEach((i) => {
        try {
          new Notification('🔥 Invitación a un reto', {
            body: `${i.sender_name} te ha invitado a "${i.habit_title}"`,
            icon: '/icon.svg', tag: 'inv_' + i.id,
          });
        } catch {}
      });

    const allIds = [
      ...pendingRequests.map((r) => 'fr_' + r.id),
      ...habitInvitations.map((i) => 'inv_' + i.id),
    ];
    localStorage.setItem(SEEN_KEY, JSON.stringify(allIds));
  }, [pendingRequests, habitInvitations, userId, socialNotifs]);

  return null;
}
