'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft24Regular } from '@fluentui/react-icons';
import { useAppStore, FREE_ACTIVITY_LIMIT } from '@/store/useHabitStore';

const APP_VERSION = '1.0.0';

const PLAN_LABEL: Record<string, string> = {
  free: 'Gratis',
  weekly: 'Pro · Semanal',
  monthly: 'Pro · Mensual',
  quarterly: 'Pro · Trimestral',
};

export default function SettingsPage() {
  const router = useRouter();
  const {
    settings, updateSettings, isPro, subscriptionPlan, getActivityCount, openPaywall,
    cancelPro, signOut, userName, userAvatar, userCode,
    habits, exercises, books,
  } = useAppStore();

  const [toast, setToast] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const showToast = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2200); };

  const usage = getActivityCount();
  const usagePct = Math.min(100, (usage / FREE_ACTIVITY_LIMIT) * 100);

  // --- Acciones ---
  const toggleDailyReminder = async () => {
    if (settings.dailyReminder) { updateSettings({ dailyReminder: false }); return; }
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('Tu navegador no soporta notificaciones'); return;
    }
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    if (perm === 'granted') {
      updateSettings({ dailyReminder: true, pushEnabled: true });
      showToast('Recordatorio diario activado ✅');
      try { new Notification('GymRace', { body: 'Te avisaremos cada día si te quedan actividades 💪' }); } catch {}
    } else {
      showToast('Permiso de notificaciones denegado');
    }
  };

  const proToggle = (key: keyof typeof settings) => {
    if (!isPro) { openPaywall('Esta función es exclusiva de GymRace Pro.'); return; }
    updateSettings({ [key]: !settings[key] } as any);
  };

  const exportData = () => {
    if (!isPro) { openPaywall('La exportación de datos es una función Pro.'); return; }
    const blob = new Blob([JSON.stringify({ habits, exercises, books, settings }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'gymrace-export.json'; a.click();
    URL.revokeObjectURL(url);
    showToast('Datos exportados');
  };

  const clearCache = () => {
    try { localStorage.removeItem('gymrace-last-reminder'); } catch {}
    showToast('Caché local limpiada');
  };

  // Evita mismatch de hidratación con el estado persistido de Zustand
  if (!mounted) {
    return <div className="min-h-screen bg-app" />;
  }

  return (
    <div className="min-h-screen bg-app p-6 pt-12 pb-24">
      <header className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-surface border border-line/5 rounded-2xl flex items-center justify-center text-content active:scale-95 transition-all"
        >
          <ArrowLeft24Regular />
        </button>
        <h1 className="text-3xl font-black tracking-tighter text-content uppercase italic">Ajustes</h1>
      </header>

      {/* ───────── SUSCRIPCIÓN ───────── */}
      {isPro ? (
        <div className="relative overflow-hidden rounded-[32px] p-6 mb-8 bg-gradient-to-br from-accent to-accent shadow-[0_10px_40px_rgba(16,185,129,0.3)]">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 blur-3xl rounded-full" />
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">👑</span>
            <p className="text-content font-black uppercase tracking-tighter text-lg italic">GymRace Pro</p>
          </div>
          <p className="text-content/80 text-xs font-bold mb-5">{PLAN_LABEL[subscriptionPlan]} · Actividades ilimitadas</p>
          <div className="flex gap-3">
            <button onClick={() => showToast('Gestiona tu plan desde la App Store')} className="flex-1 bg-white/20 backdrop-blur text-content py-3 rounded-2xl font-black uppercase tracking-widest text-[10px]">Gestionar</button>
            <button onClick={() => { cancelPro(); showToast('Suscripción cancelada'); }} className="px-5 bg-black/20 text-content py-3 rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancelar</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => openPaywall()}
          className="w-full text-left relative overflow-hidden rounded-[32px] p-6 mb-8 bg-gradient-to-br from-neutral-800 to-neutral-900 border border-line/10 active:scale-[0.99] transition-transform"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/20 blur-3xl rounded-full" />
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">✨</span>
            <p className="text-content font-black uppercase tracking-tighter text-lg italic">Hazte <span className="text-accent">Pro</span></p>
          </div>
          <p className="text-muted text-xs font-bold mb-4">Desbloquea actividades ilimitadas y mucho más</p>

          {/* Barra de uso del plan gratis */}
          <div className="bg-black/40 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-muted uppercase tracking-widest">Plan Gratis</span>
              <span className="text-[10px] font-black text-content">{usage} / {FREE_ACTIVITY_LIMIT} actividades</span>
            </div>
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${usagePct}%` }}
                className={`h-full rounded-full ${usage >= FREE_ACTIVITY_LIMIT ? 'bg-rose-500' : 'bg-accent'}`}
              />
            </div>
            {usage >= FREE_ACTIVITY_LIMIT && (
              <p className="text-rose-400 text-[10px] font-bold mt-2">Has alcanzado el límite gratuito.</p>
            )}
          </div>
          <div className="flex items-center justify-center gap-1 mt-4 text-accent font-black uppercase tracking-widest text-[11px]">
            Ver planes Pro →
          </div>
        </button>
      )}

      {/* ───────── CUENTA ───────── */}
      <Section title="Cuenta">
        <NavRow icon="🧑" label="Editar perfil" sub={userName} onClick={() => router.push('/')}>
          <div className="w-8 h-8 rounded-lg bg-surface-2 overflow-hidden flex items-center justify-center text-sm">
            {userAvatar?.startsWith('http') ? <img src={userAvatar} className="w-full h-full object-cover" /> : userAvatar}
          </div>
        </NavRow>
        <NavRow icon="🔑" label="Cambiar contraseña" onClick={() => showToast('Disponible próximamente')} />
        <NavRow icon="🎟️" label="Código de invitación" sub={userCode} onClick={() => { navigator.clipboard?.writeText(userCode); showToast('Código copiado'); }} />
      </Section>

      {/* ───────── NOTIFICACIONES ───────── */}
      <Section title="Notificaciones">
        <ToggleRow icon="🔔" label="Notificaciones push" checked={settings.pushEnabled} onChange={() => updateSettings({ pushEnabled: !settings.pushEnabled })} />
        <ToggleRow icon="⏰" label="Recordatorio diario" sub="Te avisa si te quedan actividades sin marcar" checked={settings.dailyReminder} onChange={toggleDailyReminder} />
        {settings.dailyReminder && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-line/5">
            <div className="flex items-center gap-3">
              <span className="text-lg">🕐</span>
              <span className="text-content font-bold text-sm">Hora del aviso</span>
            </div>
            <input
              type="time" value={settings.reminderTime}
              onChange={(e) => updateSettings({ reminderTime: e.target.value })}
              className="bg-surface-2 border border-line/5 rounded-xl px-3 py-2 text-content font-black outline-none"
            />
          </div>
        )}
        <ToggleRow icon="🔥" label="Alertas de racha en peligro" checked={settings.streakAlerts} onChange={() => updateSettings({ streakAlerts: !settings.streakAlerts })} />
        <ToggleRow icon="🗓️" label="Resumen semanal" checked={settings.weeklySummary} onChange={() => updateSettings({ weeklySummary: !settings.weeklySummary })} />
        <ToggleRow icon="👥" label="Actividad social" sub="Solicitudes e invitaciones" checked={settings.socialNotifs} onChange={() => updateSettings({ socialNotifs: !settings.socialNotifs })} />
      </Section>

      {/* ───────── APARIENCIA ───────── */}
      <Section title="Apariencia">
        <SelectRow icon="🌙" label="Tema" value={settings.theme} pro={!isPro}
          options={[{ v: 'dark', l: 'Oscuro' }, { v: 'light', l: 'Claro' }, { v: 'system', l: 'Sistema' }]}
          onChange={(v) => updateSettings({ theme: v as any })} onLocked={() => openPaywall('Los temas son una función Pro.')} />
        <SelectRow icon="🎨" label="Color de acento" value={settings.accentColor} pro={!isPro}
          options={[{ v: 'emerald', l: 'Esmeralda' }, { v: 'indigo', l: 'Índigo' }, { v: 'rose', l: 'Rosa' }, { v: 'amber', l: 'Ámbar' }, { v: 'sky', l: 'Azul' }]}
          onChange={(v) => updateSettings({ accentColor: v })} onLocked={() => openPaywall('La personalización de color es Pro.')} />
        <SelectRow icon="🌐" label="Idioma" value={settings.language}
          options={[{ v: 'es', l: 'Español' }, { v: 'en', l: 'English' }]}
          onChange={(v) => updateSettings({ language: v as any })} />
      </Section>

      {/* ───────── UNIDADES Y PREFERENCIAS ───────── */}
      <Section title="Unidades y preferencias">
        <SelectRow icon="⚖️" label="Unidad de peso" value={settings.weightUnit}
          options={[{ v: 'kg', l: 'Kilogramos' }, { v: 'lb', l: 'Libras' }]}
          onChange={(v) => updateSettings({ weightUnit: v as any })} />
        <SelectRow icon="📅" label="Inicio de semana" value={settings.weekStart}
          options={[{ v: 'monday', l: 'Lunes' }, { v: 'sunday', l: 'Domingo' }]}
          onChange={(v) => updateSettings({ weekStart: v as any })} />
        <SelectRow icon="🗓️" label="Formato de fecha" value={settings.dateFormat}
          options={[{ v: 'dmy', l: 'DD/MM/AAAA' }, { v: 'mdy', l: 'MM/DD/AAAA' }]}
          onChange={(v) => updateSettings({ dateFormat: v as any })} />
        <ToggleRow icon="📳" label="Vibración háptica" checked={settings.hapticFeedback} onChange={() => updateSettings({ hapticFeedback: !settings.hapticFeedback })} />
        <ToggleRow icon="🔊" label="Efectos de sonido" checked={settings.soundEffects} onChange={() => updateSettings({ soundEffects: !settings.soundEffects })} />
      </Section>

      {/* ───────── PRIVACIDAD ───────── */}
      <Section title="Privacidad">
        <ToggleRow icon="👁️" label="Perfil público" checked={settings.publicProfile} onChange={() => updateSettings({ publicProfile: !settings.publicProfile })} />
        <ToggleRow icon="🏆" label="Aparecer en el ranking" checked={settings.showInLeaderboard} onChange={() => updateSettings({ showInLeaderboard: !settings.showInLeaderboard })} />
        <ToggleRow icon="📤" label="Compartir progreso con amigos" checked={settings.shareProgress} onChange={() => updateSettings({ shareProgress: !settings.shareProgress })} />
        <SelectRow icon="➕" label="Quién puede invitarme" value={settings.allowInvites}
          options={[{ v: 'everyone', l: 'Todos' }, { v: 'friends', l: 'Solo amigos' }, { v: 'none', l: 'Nadie' }]}
          onChange={(v) => updateSettings({ allowInvites: v as any })} />
      </Section>

      {/* ───────── DATOS ───────── */}
      <Section title="Datos y copias">
        <ToggleRow icon="☁️" label="Sincronización en la nube" pro={!isPro} checked={settings.cloudSync} onChange={() => proToggle('cloudSync')} />
        <ToggleRow icon="💾" label="Copia de seguridad automática" pro={!isPro} checked={settings.autoBackup} onChange={() => proToggle('autoBackup')} />
        <NavRow icon="⬇️" label="Exportar mis datos" pro={!isPro} onClick={exportData} />
        <NavRow icon="🗑️" label="Limpiar caché local" onClick={clearCache} />
      </Section>

      {/* ───────── SOPORTE ───────── */}
      <Section title="Soporte y acerca de">
        <NavRow icon="❓" label="Centro de ayuda" onClick={() => showToast('Abriendo ayuda…')} />
        <NavRow icon="📄" label="Términos de servicio" onClick={() => showToast('Abriendo términos…')} />
        <NavRow icon="🛡️" label="Política de privacidad" onClick={() => showToast('Abriendo privacidad…')} />
        <NavRow icon="⭐" label="Valora GymRace" onClick={() => showToast('¡Gracias por tu apoyo! ⭐')} />
        <div className="flex items-center justify-between px-5 py-4 border-t border-line/5">
          <span className="text-muted font-bold text-sm">Versión</span>
          <span className="text-muted font-black text-sm">{APP_VERSION}</span>
        </div>
      </Section>

      {/* ───────── ZONA PELIGROSA ───────── */}
      <Section title="Zona peligrosa">
        <button onClick={async () => { await signOut(); router.push('/'); }} className="w-full flex items-center gap-3 px-5 py-4 text-rose-400 font-black active:bg-white/5 transition-colors">
          <span className="text-lg">🚪</span> Cerrar sesión
        </button>
        <button onClick={() => showToast('Contacta con soporte para eliminar tu cuenta')} className="w-full flex items-center gap-3 px-5 py-4 text-rose-500 font-black border-t border-line/5 active:bg-white/5 transition-colors">
          <span className="text-lg">⚠️</span> Eliminar cuenta
        </button>
      </Section>

      <p className="text-center text-[9px] text-muted font-extralight uppercase tracking-[0.4em] italic mt-8">
        Developed by Alejandro Millán
      </p>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl z-[200] text-center"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── COMPONENTES ───────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h2 className="text-[10px] font-black text-muted uppercase tracking-[0.25em] mb-3 ml-2">{title}</h2>
      <div className="bg-surface border border-line/5 rounded-[28px] overflow-hidden">{children}</div>
    </div>
  );
}

function ProBadge() {
  return (
    <span className="flex items-center gap-0.5 text-[8px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
      🔒 Pro
    </span>
  );
}

function ToggleRow({
  icon, label, sub, checked, onChange, pro,
}: { icon: string; label: string; sub?: string; checked: boolean; onChange: () => void; pro?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-line/5 last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-lg flex-shrink-0">{icon}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-content font-bold text-sm">{label}</span>
            {pro && <ProBadge />}
          </div>
          {sub && <p className="text-muted text-[11px] font-medium leading-tight">{sub}</p>}
        </div>
      </div>
      <button
        onClick={onChange}
        className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors ${checked ? 'bg-accent' : 'bg-surface-2'}`}
      >
        <motion.span layout className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function NavRow({
  icon, label, sub, onClick, pro, children,
}: { icon: string; label: string; sub?: string; onClick: () => void; pro?: boolean; children?: React.ReactNode }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-5 py-4 border-b border-line/5 last:border-b-0 active:bg-white/5 transition-colors text-left">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-lg flex-shrink-0">{icon}</span>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-content font-bold text-sm">{label}</span>
          {pro && <ProBadge />}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {children}
        {sub && <span className="text-muted font-bold text-xs">{sub}</span>}
        <span className="text-muted">›</span>
      </div>
    </button>
  );
}

function SelectRow({
  icon, label, value, options, onChange, pro, onLocked,
}: {
  icon: string; label: string; value: string; options: { v: string; l: string }[];
  onChange: (v: string) => void; pro?: boolean; onLocked?: () => void;
}) {
  const cycle = () => {
    if (pro) { onLocked?.(); return; }
    const idx = options.findIndex((o) => o.v === value);
    onChange(options[(idx + 1) % options.length].v);
  };
  const current = options.find((o) => o.v === value);
  return (
    <button onClick={cycle} className="w-full flex items-center justify-between px-5 py-4 border-b border-line/5 last:border-b-0 active:bg-white/5 transition-colors text-left">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <span className="text-content font-bold text-sm">{label}</span>
        {pro && <ProBadge />}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-accent font-black text-xs uppercase tracking-wider">{current?.l}</span>
        <span className="text-muted">›</span>
      </div>
    </button>
  );
}
