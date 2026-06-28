'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft24Regular } from '@fluentui/react-icons';
import { useAppStore, FREE_ACTIVITY_LIMIT } from '@/store/useHabitStore';
import { useT } from '@/lib/i18n';
import { ProfileView } from '@/components/ui/ProfileView';

const APP_VERSION = '1.0.0';

const ACCENT_HEX: Record<string, string> = {
  emerald: '#10b981', indigo: '#6366f1', rose: '#f43f5e', amber: '#f59e0b', sky: '#0ea5e9',
};

export default function SettingsPage() {
  const router = useRouter();
  const t = useT();
  const {
    settings, updateSettings, isPro, subscriptionPlan, getActivityCount, openPaywall,
    cancelPro, signOut, updatePassword, userName, userAvatar, userCode,
    habits, exercises, books,
  } = useAppStore();

  const [toast, setToast] = useState('');
  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  useEffect(() => setMounted(true), []);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  const handleChangePassword = async () => {
    setPwError('');
    if (newPass.length < 6) { setPwError('Mínimo 6 caracteres'); return; }
    if (newPass !== confirmPass) { setPwError('Las contraseñas no coinciden'); return; }
    setPwLoading(true);
    const res = await updatePassword(newPass);
    setPwLoading(false);
    if (res.success) {
      setPwOpen(false); setNewPass(''); setConfirmPass('');
      showToast('Contraseña actualizada ✅');
    } else {
      setPwError(res.error || 'No se pudo cambiar la contraseña');
    }
  };

  const usage = getActivityCount();
  const usagePct = Math.min(100, (usage / FREE_ACTIVITY_LIMIT) * 100);
  const planLabel = (p: string) => t(`plan.${p}`);

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

  const exportPDF = () => {
    if (!isPro) { openPaywall('La exportación de datos es una función Pro.'); return; }
    const w = window.open('', '_blank', 'width=900,height=1200');
    if (!w) { showToast('Permite las ventanas emergentes para exportar'); return; }
    const accent = ACCENT_HEX[settings.accentColor] || '#10b981';
    const fecha = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const totalCompletions = habits.reduce((a, h) => a + Object.values(h.history).filter(Boolean).length, 0);
    const bestStreak = habits.reduce((a, h) => Math.max(a, h.maxStreak || 0, h.streak || 0), 0);

    const stat = (n: number | string, l: string) =>
      `<div class="stat"><div class="num">${n}</div><div class="lbl">${l}</div></div>`;

    const habitRows = habits.length ? habits.map(h => {
      const done = Object.values(h.history).filter(Boolean).length;
      return `<div class="row"><div><div class="rt">${h.title}</div><div class="rs">${done} días completados</div></div>
        <div class="pill">🔥 ${h.streak} racha</div></div>`;
    }).join('') : '<div class="empty">Sin hábitos todavía</div>';

    const exRows = exercises.length ? exercises.map(e => {
      const pr = e.weightHistory[e.weightHistory.length - 1];
      const disp = settings.weightUnit === 'lb' ? Math.round(pr * 2.20462) : Math.round(pr);
      return `<div class="row"><div><div class="rt">${e.name}</div><div class="rs">${e.muscle}</div></div>
        <div class="pill">${disp} ${settings.weightUnit.toUpperCase()}</div></div>`;
    }).join('') : '<div class="empty">Sin ejercicios todavía</div>';

    const bookRows = books.length ? books.map(b => {
      const pct = b.pages ? Math.round((b.readPages / b.pages) * 100) : 0;
      return `<div class="row"><div><div class="rt">${b.title}</div><div class="rs">${b.author}</div></div>
        <div class="pill">${pct}%</div></div>`;
    }).join('') : '<div class="empty">Sin libros todavía</div>';

    w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>GymRace · ${userName}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      body { font-family:-apple-system,'Segoe UI',Arial,sans-serif; color:#0a0a0a; background:#fff; padding:48px 56px; }
      .head { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid ${accent}; padding-bottom:20px; margin-bottom:32px; }
      .brand { font-size:42px; font-weight:900; font-style:italic; letter-spacing:-2px; }
      .brand span { color:${accent}; }
      .meta { text-align:right; font-size:12px; color:#666; font-weight:700; text-transform:uppercase; letter-spacing:1px; line-height:1.6; }
      .stats { display:flex; gap:16px; margin-bottom:36px; }
      .stat { flex:1; background:#f5f5f5; border-radius:20px; padding:22px; text-align:center; }
      .stat .num { font-size:40px; font-weight:900; color:${accent}; letter-spacing:-1px; }
      .stat .lbl { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; color:#888; margin-top:4px; }
      h2 { font-size:13px; font-weight:900; text-transform:uppercase; letter-spacing:2px; color:#aaa; margin:28px 0 12px; }
      .row { display:flex; justify-content:space-between; align-items:center; padding:14px 18px; background:#fafafa; border:1px solid #eee; border-radius:16px; margin-bottom:8px; }
      .rt { font-weight:800; font-size:15px; }
      .rs { font-size:12px; color:#999; font-weight:600; margin-top:2px; }
      .pill { background:${accent}1a; color:${accent}; font-weight:900; font-size:12px; padding:6px 14px; border-radius:999px; white-space:nowrap; }
      .empty { color:#bbb; font-weight:700; font-size:13px; padding:10px 18px; }
      .foot { margin-top:40px; text-align:center; font-size:9px; color:#ccc; text-transform:uppercase; letter-spacing:3px; font-style:italic; }
    </style></head><body>
      <div class="head">
        <div class="brand">GYM<span>RACE</span></div>
        <div class="meta">${userName}<br>Código ${userCode}<br>${fecha}</div>
      </div>
      <div class="stats">
        ${stat(habits.length, 'Hábitos')}
        ${stat(totalCompletions, 'Completados')}
        ${stat(bestStreak, 'Mejor racha')}
        ${stat(exercises.length, 'Ejercicios')}
      </div>
      <h2>Hábitos</h2>${habitRows}
      <h2>Gimnasio · Récords</h2>${exRows}
      <h2>Biblioteca</h2>${bookRows}
      <div class="foot">Informe generado por GymRace · Developed by Alejandro Millán</div>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
    showToast('Generando PDF…');
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
        <h1 className="text-3xl font-black tracking-tighter text-content uppercase italic">{t('set.title')}</h1>
      </header>

      {/* ───────── SUSCRIPCIÓN ───────── */}
      {isPro ? (
        <div className="relative overflow-hidden rounded-[32px] p-6 mb-8 bg-gradient-to-br from-accent to-accent shadow-[0_10px_40px_rgba(16,185,129,0.3)]">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 blur-3xl rounded-full" />
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">👑</span>
            <p className="text-content font-black uppercase tracking-tighter text-lg italic">GymRace Pro</p>
          </div>
          <p className="text-content/80 text-xs font-bold mb-5">{planLabel(subscriptionPlan)} · {t('set.unlimited')}</p>
          <div className="flex gap-3">
            <button onClick={() => showToast('Gestiona tu plan desde la App Store')} className="flex-1 bg-white/20 backdrop-blur text-content py-3 rounded-2xl font-black uppercase tracking-widest text-[10px]">{t('set.manage')}</button>
            <button onClick={() => { cancelPro(); showToast('Suscripción cancelada'); }} className="px-5 bg-black/20 text-content py-3 rounded-2xl font-black uppercase tracking-widest text-[10px]">{t('common.cancel')}</button>
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
            <p className="text-content font-black uppercase tracking-tighter text-lg italic">{t('set.goPro')} <span className="text-accent">Pro</span></p>
          </div>
          <p className="text-muted text-xs font-bold mb-4">{t('set.proPitch')}</p>

          {/* Barra de uso del plan gratis */}
          <div className="bg-black/40 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-muted uppercase tracking-widest">{t('set.freePlan')}</span>
              <span className="text-[10px] font-black text-content">{usage} / {FREE_ACTIVITY_LIMIT} {t('set.activities')}</span>
            </div>
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${usagePct}%` }}
                className={`h-full rounded-full ${usage >= FREE_ACTIVITY_LIMIT ? 'bg-rose-500' : 'bg-accent'}`}
              />
            </div>
            {usage >= FREE_ACTIVITY_LIMIT && (
              <p className="text-rose-400 text-[10px] font-bold mt-2">{t('set.limitReached')}</p>
            )}
          </div>
          <div className="flex items-center justify-center gap-1 mt-4 text-accent font-black uppercase tracking-widest text-[11px]">
            {t('set.seePlans')} →
          </div>
        </button>
      )}

      {/* ───────── CUENTA ───────── */}
      <Section title={t('set.sec.account')}>
        <NavRow icon="🧑" label={t('set.editProfile')} sub={userName} onClick={() => setProfileOpen(true)}>
          <div className="w-8 h-8 rounded-lg bg-surface-2 overflow-hidden flex items-center justify-center text-sm">
            {userAvatar?.startsWith('http') ? <img src={userAvatar} className="w-full h-full object-cover" /> : userAvatar}
          </div>
        </NavRow>
        <NavRow icon="🔑" label={t('set.changePass')} onClick={() => { setPwError(''); setNewPass(''); setConfirmPass(''); setPwOpen(true); }} />
        <NavRow icon="🎟️" label={t('set.inviteCode')} sub={userCode} onClick={() => { navigator.clipboard?.writeText(userCode); showToast('Código copiado'); }} />
      </Section>

      {/* ───────── NOTIFICACIONES ───────── */}
      <Section title={t('set.sec.notifs')}>
        <ToggleRow icon="🔔" label={t('set.pushNotifs')} checked={settings.pushEnabled} onChange={() => updateSettings({ pushEnabled: !settings.pushEnabled })} />
        <ToggleRow icon="⏰" label={t('set.dailyReminder')} sub={t('set.dailyReminderSub')} checked={settings.dailyReminder} onChange={toggleDailyReminder} />
        {settings.dailyReminder && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-line/5">
            <div className="flex items-center gap-3">
              <span className="text-lg">🕐</span>
              <span className="text-content font-bold text-sm">{t('set.reminderTime')}</span>
            </div>
            <input
              type="time" value={settings.reminderTime}
              onChange={(e) => updateSettings({ reminderTime: e.target.value })}
              className="bg-surface-2 border border-line/5 rounded-xl px-3 py-2 text-content font-black outline-none"
            />
          </div>
        )}
        <ToggleRow icon="🔥" label={t('set.streakAlerts')} checked={settings.streakAlerts} onChange={() => updateSettings({ streakAlerts: !settings.streakAlerts })} />
        <ToggleRow icon="🗓️" label={t('set.weeklySummary')} checked={settings.weeklySummary} onChange={() => updateSettings({ weeklySummary: !settings.weeklySummary })} />
        <ToggleRow icon="👥" label={t('set.socialNotifs')} sub={t('set.socialNotifsSub')} checked={settings.socialNotifs} onChange={() => updateSettings({ socialNotifs: !settings.socialNotifs })} />
      </Section>

      {/* ───────── APARIENCIA ───────── */}
      <Section title={t('set.sec.appearance')}>
        <SelectRow icon="🌙" label={t('set.theme')} value={settings.theme} pro={!isPro}
          options={[{ v: 'dark', l: t('opt.dark') }, { v: 'light', l: t('opt.light') }, { v: 'system', l: t('opt.system') }]}
          onChange={(v) => updateSettings({ theme: v as any })} onLocked={() => openPaywall('Los temas son una función Pro.')} />
        <SelectRow icon="🎨" label={t('set.accent')} value={settings.accentColor} pro={!isPro}
          options={[{ v: 'emerald', l: t('opt.emerald') }, { v: 'indigo', l: t('opt.indigo') }, { v: 'rose', l: t('opt.rose') }, { v: 'amber', l: t('opt.amber') }, { v: 'sky', l: t('opt.sky') }]}
          onChange={(v) => updateSettings({ accentColor: v })} onLocked={() => openPaywall('La personalización de color es Pro.')} />
        <SelectRow icon="🌐" label={t('set.language')} value={settings.language}
          options={[{ v: 'es', l: t('opt.es') }, { v: 'en', l: t('opt.en') }]}
          onChange={(v) => updateSettings({ language: v as any })} />
      </Section>

      {/* ───────── UNIDADES Y PREFERENCIAS ───────── */}
      <Section title={t('set.sec.units')}>
        <SelectRow icon="⚖️" label={t('set.weightUnit')} value={settings.weightUnit}
          options={[{ v: 'kg', l: t('opt.kg') }, { v: 'lb', l: t('opt.lb') }]}
          onChange={(v) => updateSettings({ weightUnit: v as any })} />
        <SelectRow icon="📅" label={t('set.weekStart')} value={settings.weekStart}
          options={[{ v: 'monday', l: t('opt.monday') }, { v: 'sunday', l: t('opt.sunday') }]}
          onChange={(v) => updateSettings({ weekStart: v as any })} />
        <SelectRow icon="🗓️" label={t('set.dateFormat')} value={settings.dateFormat}
          options={[{ v: 'dmy', l: 'DD/MM/AAAA' }, { v: 'mdy', l: 'MM/DD/AAAA' }]}
          onChange={(v) => updateSettings({ dateFormat: v as any })} />
        <ToggleRow icon="📳" label={t('set.haptics')} checked={settings.hapticFeedback} onChange={() => updateSettings({ hapticFeedback: !settings.hapticFeedback })} />
        <ToggleRow icon="🔊" label={t('set.sound')} checked={settings.soundEffects} onChange={() => updateSettings({ soundEffects: !settings.soundEffects })} />
      </Section>

      {/* ───────── PRIVACIDAD ───────── */}
      <Section title={t('set.sec.privacy')}>
        <ToggleRow icon="👁️" label={t('set.publicProfile')} checked={settings.publicProfile} onChange={() => updateSettings({ publicProfile: !settings.publicProfile })} />
        <ToggleRow icon="🏆" label={t('set.leaderboard')} checked={settings.showInLeaderboard} onChange={() => updateSettings({ showInLeaderboard: !settings.showInLeaderboard })} />
        <ToggleRow icon="📤" label={t('set.shareProgress')} checked={settings.shareProgress} onChange={() => updateSettings({ shareProgress: !settings.shareProgress })} />
        <SelectRow icon="➕" label={t('set.whoInvites')} value={settings.allowInvites}
          options={[{ v: 'everyone', l: t('opt.everyone') }, { v: 'friends', l: t('opt.friends') }, { v: 'none', l: t('opt.none') }]}
          onChange={(v) => updateSettings({ allowInvites: v as any })} />
      </Section>

      {/* ───────── DATOS ───────── */}
      <Section title={t('set.sec.data')}>
        <ToggleRow icon="☁️" label={t('set.cloudSync')} pro={!isPro} checked={settings.cloudSync} onChange={() => proToggle('cloudSync')} />
        <ToggleRow icon="💾" label={t('set.autoBackup')} pro={!isPro} checked={settings.autoBackup} onChange={() => proToggle('autoBackup')} />
        <NavRow icon="📄" label={t('set.export')} pro={!isPro} onClick={exportPDF} />
      </Section>

      {/* ───────── SOPORTE ───────── */}
      <Section title={t('set.sec.support')}>
        <NavRow icon="❓" label={t('set.help')} onClick={() => showToast('Abriendo ayuda…')} />
        <NavRow icon="📄" label={t('set.terms')} onClick={() => showToast('Abriendo términos…')} />
        <NavRow icon="🛡️" label={t('set.privacy')} onClick={() => showToast('Abriendo privacidad…')} />
        <NavRow icon="⭐" label={t('set.rate')} onClick={() => showToast('¡Gracias por tu apoyo! ⭐')} />
        <div className="flex items-center justify-between px-5 py-4 border-t border-line/5">
          <span className="text-muted font-bold text-sm">{t('set.version')}</span>
          <span className="text-muted font-black text-sm">{APP_VERSION}</span>
        </div>
      </Section>

      {/* ───────── ZONA PELIGROSA ───────── */}
      <Section title={t('set.sec.danger')}>
        <button onClick={async () => { await signOut(); router.push('/'); }} className="w-full flex items-center gap-3 px-5 py-4 text-rose-400 font-black active:bg-white/5 transition-colors">
          <span className="text-lg">🚪</span> {t('set.logout')}
        </button>
        <button onClick={() => showToast('Contacta con soporte para eliminar tu cuenta')} className="w-full flex items-center gap-3 px-5 py-4 text-rose-500 font-black border-t border-line/5 active:bg-white/5 transition-colors">
          <span className="text-lg">⚠️</span> {t('set.deleteAccount')}
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

      {/* Editor de perfil (nombre + avatar) */}
      <ProfileView isOpen={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* Modal cambiar contraseña */}
      <AnimatePresence>
        {pwOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[550] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-surface border border-line/10 w-full max-w-sm rounded-[36px] p-7 relative shadow-2xl"
            >
              <button onClick={() => setPwOpen(false)} className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center bg-surface-2 rounded-xl text-muted hover:text-content transition-colors text-lg font-bold">✕</button>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xl">🔑</span>
                <h2 className="text-xl font-black text-content uppercase tracking-tighter italic">{t('set.changePass')}</h2>
              </div>
              <div className="flex flex-col gap-3">
                <input
                  type="password" placeholder={t('set.newPassword')} value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full bg-app border border-line/5 rounded-2xl px-5 py-4 text-content font-bold outline-none focus:border-accent/50 transition-all"
                />
                <input
                  type="password" placeholder={t('set.repeatPassword')} value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="w-full bg-app border border-line/5 rounded-2xl px-5 py-4 text-content font-bold outline-none focus:border-accent/50 transition-all"
                />
                {pwError && <p className="text-rose-500 text-[11px] font-black uppercase text-center">{pwError}</p>}
                <button
                  onClick={handleChangePassword} disabled={pwLoading}
                  className="w-full bg-accent text-black py-4 rounded-2xl font-black uppercase tracking-widest text-sm mt-1 active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {pwLoading ? '...' : t('common.save')}
                </button>
              </div>
            </motion.div>
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
