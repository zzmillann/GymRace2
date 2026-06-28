'use client';

import { useAppStore } from '@/store/useHabitStore';

export type Lang = 'es' | 'en';

// Diccionario ES/EN. Para añadir idiomas/textos, amplía estas entradas.
const DICT: Record<string, { es: string; en: string }> = {
  // Navegación
  'nav.habits': { es: 'Hábitos', en: 'Habits' },
  'nav.gym': { es: 'Gimnasio', en: 'Gym' },
  'nav.library': { es: 'Librería', en: 'Library' },
  'nav.social': { es: 'Social', en: 'Social' },

  // Home
  'home.hi': { es: 'Hola', en: 'Hi' },
  'home.noHabits': { es: 'No tienes hábitos todavía', en: "You don't have any habits yet" },

  // Común
  'common.save': { es: 'Guardar', en: 'Save' },
  'common.cancel': { es: 'Cancelar', en: 'Cancel' },
  'common.back': { es: 'Volver', en: 'Back' },
  'common.soon': { es: 'Disponible próximamente', en: 'Coming soon' },

  // Auth
  'auth.subtitle': { es: 'Elite Productivity & Strength', en: 'Elite Productivity & Strength' },
  'auth.username': { es: 'Nombre de usuario', en: 'Username' },
  'auth.password': { es: 'Mínimo 6 caracteres', en: 'At least 6 characters' },
  'auth.email': { es: 'Email (ej. alex@gym.com)', en: 'Email (e.g. alex@gym.com)' },
  'auth.name': { es: '¿Cómo te llamas?', en: "What's your name?" },
  'auth.login': { es: 'Entrar', en: 'Log in' },
  'auth.signup': { es: 'Empezar Carrera', en: 'Start the Race' },
  'auth.loading': { es: 'Entrenando...', en: 'Training...' },
  'auth.toSignup': { es: '¿Nuevo aquí? Regístrate', en: 'New here? Sign up' },
  'auth.toLogin': { es: 'Ya tengo cuenta', en: 'I already have an account' },
  'auth.forgot': { es: '¿Olvidaste tu contraseña?', en: 'Forgot your password?' },
  'auth.resetTitle': { es: 'Restablecer contraseña', en: 'Reset password' },
  'auth.resetHelp': { es: 'Escribe tu usuario o email y te enviaremos un enlace para crear una nueva contraseña.', en: "Enter your username or email and we'll send you a link to set a new password." },
  'auth.resetField': { es: 'Usuario o email', en: 'Username or email' },
  'auth.resetSend': { es: 'Enviar enlace', en: 'Send link' },
  'auth.resetSending': { es: 'Enviando...', en: 'Sending...' },
  'auth.resetBack': { es: '← Volver a iniciar sesión', en: '← Back to login' },

  // Paywall
  'pw.unlock': { es: 'Desbloquea todo tu potencial', en: 'Unlock your full potential' },
  'pw.applePay': { es: 'Pay', en: 'Pay' },
  'pw.bizum': { es: 'Pagar con', en: 'Pay with' },
  'pw.card': { es: 'Pagar con tarjeta', en: 'Pay by card' },
  'pw.processing': { es: 'Procesando…', en: 'Processing…' },
  'pw.legal': { es: 'Pago seguro. Cancela cuando quieras.', en: 'Secure payment. Cancel anytime.' },
  'pw.successTitle': { es: '¡Ya eres Pro!', en: "You're Pro now!" },
  'pw.successBody': { es: 'Actividades ilimitadas desbloqueadas.', en: 'Unlimited activities unlocked.' },
  'pw.feat.unlimited': { es: 'Actividades ilimitadas', en: 'Unlimited activities' },
  'pw.feat.stats': { es: 'Estadísticas avanzadas', en: 'Advanced stats' },
  'pw.feat.cloud': { es: 'Copia en la nube', en: 'Cloud backup' },
  'pw.feat.themes': { es: 'Temas y personalización', en: 'Themes & customization' },
  'pw.feat.noads': { es: 'Sin anuncios, para siempre', en: 'No ads, ever' },

  // Ajustes
  'set.title': { es: 'Ajustes', en: 'Settings' },
  'set.activities': { es: 'actividades', en: 'activities' },
  'set.freePlan': { es: 'Plan Gratis', en: 'Free plan' },
  'set.limitReached': { es: 'Has alcanzado el límite gratuito.', en: "You've reached the free limit." },
  'set.goPro': { es: 'Hazte', en: 'Go' },
  'set.proPitch': { es: 'Desbloquea actividades ilimitadas y mucho más', en: 'Unlock unlimited activities and much more' },
  'set.seePlans': { es: 'Ver planes Pro', en: 'See Pro plans' },
  'set.unlimited': { es: 'Actividades ilimitadas', en: 'Unlimited activities' },
  'set.manage': { es: 'Gestionar', en: 'Manage' },
  'plan.free': { es: 'Gratis', en: 'Free' },
  'plan.weekly': { es: 'Pro · Semanal', en: 'Pro · Weekly' },
  'plan.monthly': { es: 'Pro · Mensual', en: 'Pro · Monthly' },
  'plan.quarterly': { es: 'Pro · Trimestral', en: 'Pro · Quarterly' },

  'set.sec.account': { es: 'Cuenta', en: 'Account' },
  'set.sec.notifs': { es: 'Notificaciones', en: 'Notifications' },
  'set.sec.appearance': { es: 'Apariencia', en: 'Appearance' },
  'set.sec.units': { es: 'Unidades y preferencias', en: 'Units & preferences' },
  'set.sec.privacy': { es: 'Privacidad', en: 'Privacy' },
  'set.sec.data': { es: 'Datos y copias', en: 'Data & backups' },
  'set.sec.support': { es: 'Soporte y acerca de', en: 'Support & about' },
  'set.sec.danger': { es: 'Zona peligrosa', en: 'Danger zone' },

  'set.editProfile': { es: 'Editar perfil', en: 'Edit profile' },
  'set.changePass': { es: 'Cambiar contraseña', en: 'Change password' },
  'set.inviteCode': { es: 'Código de invitación', en: 'Invite code' },
  'set.pushNotifs': { es: 'Notificaciones push', en: 'Push notifications' },
  'set.dailyReminder': { es: 'Recordatorio diario', en: 'Daily reminder' },
  'set.dailyReminderSub': { es: 'Te avisa si te quedan actividades sin marcar', en: 'Reminds you if you have activities left to check off' },
  'set.reminderTime': { es: 'Hora del aviso', en: 'Reminder time' },
  'set.streakAlerts': { es: 'Alertas de racha en peligro', en: 'Streak-at-risk alerts' },
  'set.weeklySummary': { es: 'Resumen semanal', en: 'Weekly summary' },
  'set.socialNotifs': { es: 'Actividad social', en: 'Social activity' },
  'set.socialNotifsSub': { es: 'Solicitudes e invitaciones', en: 'Requests and invitations' },
  'set.theme': { es: 'Tema', en: 'Theme' },
  'set.accent': { es: 'Color de acento', en: 'Accent color' },
  'set.language': { es: 'Idioma', en: 'Language' },
  'set.weightUnit': { es: 'Unidad de peso', en: 'Weight unit' },
  'set.weekStart': { es: 'Inicio de semana', en: 'Week starts on' },
  'set.dateFormat': { es: 'Formato de fecha', en: 'Date format' },
  'set.haptics': { es: 'Vibración háptica', en: 'Haptic feedback' },
  'set.sound': { es: 'Efectos de sonido', en: 'Sound effects' },
  'set.publicProfile': { es: 'Perfil público', en: 'Public profile' },
  'set.leaderboard': { es: 'Aparecer en el ranking', en: 'Show on leaderboard' },
  'set.shareProgress': { es: 'Compartir progreso con amigos', en: 'Share progress with friends' },
  'set.whoInvites': { es: 'Quién puede invitarme', en: 'Who can invite me' },
  'set.cloudSync': { es: 'Sincronización en la nube', en: 'Cloud sync' },
  'set.autoBackup': { es: 'Copia de seguridad automática', en: 'Automatic backup' },
  'set.export': { es: 'Exportar mis datos', en: 'Export my data' },
  'set.clearCache': { es: 'Limpiar caché local', en: 'Clear local cache' },
  'set.help': { es: 'Centro de ayuda', en: 'Help center' },
  'set.terms': { es: 'Términos de servicio', en: 'Terms of service' },
  'set.privacy': { es: 'Política de privacidad', en: 'Privacy policy' },
  'set.rate': { es: 'Valora GymRace', en: 'Rate GymRace' },
  'set.version': { es: 'Versión', en: 'Version' },
  'set.logout': { es: 'Cerrar sesión', en: 'Log out' },
  'set.deleteAccount': { es: 'Eliminar cuenta', en: 'Delete account' },

  // Opciones (selects)
  'opt.dark': { es: 'Oscuro', en: 'Dark' },
  'opt.light': { es: 'Claro', en: 'Light' },
  'opt.system': { es: 'Sistema', en: 'System' },
  'opt.emerald': { es: 'Esmeralda', en: 'Emerald' },
  'opt.indigo': { es: 'Índigo', en: 'Indigo' },
  'opt.rose': { es: 'Rosa', en: 'Rose' },
  'opt.amber': { es: 'Ámbar', en: 'Amber' },
  'opt.sky': { es: 'Azul', en: 'Blue' },
  'opt.es': { es: 'Español', en: 'Spanish' },
  'opt.en': { es: 'English', en: 'English' },
  'opt.kg': { es: 'Kilogramos', en: 'Kilograms' },
  'opt.lb': { es: 'Libras', en: 'Pounds' },
  'opt.monday': { es: 'Lunes', en: 'Monday' },
  'opt.sunday': { es: 'Domingo', en: 'Sunday' },
  'opt.everyone': { es: 'Todos', en: 'Everyone' },
  'opt.friends': { es: 'Solo amigos', en: 'Friends only' },
  'opt.none': { es: 'Nadie', en: 'Nobody' },
};

export function translate(key: string, lang: Lang): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang] || entry.es;
}

/** Hook reactivo: cambia al instante cuando el usuario cambia el idioma en Ajustes. */
export function useT() {
  const lang = (useAppStore((s) => s.settings.language) as Lang) || 'es';
  return (key: string) => translate(key, lang);
}
