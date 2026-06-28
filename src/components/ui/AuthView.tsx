'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '@/store/useHabitStore';
import { useT } from '@/lib/i18n';

export function AuthView() {
  const { signUp, signIn, resetPassword } = useAppStore();
  const t = useT();
  const [isLogin, setIsLogin] = useState(true);
  const [forgot, setForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [resetId, setResetId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearMsgs = () => { setError(null); setSuccess(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMsgs();

    // Basic validation
    if (!isLogin && !email.includes('@')) { setError('Introduce un email válido'); setLoading(false); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); setLoading(false); return; }

    try {
      if (isLogin) {
        // En login usamos el campo 'name' como nombre de usuario
        const res = await signIn(name, password);
        if (!res.success) {
            if (res.error?.includes('Invalid login credentials') || res.error?.includes('Nombre de usuario no encontrado')) {
                setError('Usuario o contraseña incorrectos');
            } else {
                setError(res.error || 'No se pudo iniciar sesión');
            }
        }
      } else {
        if (!name.trim()) { setError('El nombre es obligatorio'); setLoading(false); return; }
        const res = await signUp(email.trim(), password, name.trim());
        if (!res.success) {
            if (res.error?.includes('violates row-level security')) {
                setError('Error técnico de permisos (RLS). Ejecuta el fix de base de datos.');
            } else if (res.error?.includes('User already registered')) {
                setError('Este email ya está registrado');
            } else {
                setError(res.error || 'Error en el registro');
            }
        } else {
            setSuccess('¡Cuenta creada! Iniciando...');
        }
      }
    } catch (err: any) {
      setError('Error de conexión. Revisa tu internet.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMsgs();
    try {
      const res = await resetPassword(resetId);
      if (res.success) {
        setSuccess('📩 Te hemos enviado un email con el enlace para restablecer tu contraseña. Revisa tu bandeja (y el spam).');
      } else {
        setError(res.error || 'No se pudo enviar el email');
      }
    } catch {
      setError('Error de conexión. Revisa tu internet.');
    } finally {
      setLoading(false);
    }
  };

  const Messages = (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3"
        >
          <AlertCircle className="text-rose-500 flex-shrink-0" size={18} />
          <p className="text-rose-500 text-[11px] font-black uppercase leading-tight">{error}</p>
        </motion.div>
      )}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="bg-accent/10 border border-accent/20 p-4 rounded-2xl flex items-center gap-3"
        >
          <CheckCircle2 className="text-accent flex-shrink-0" size={18} />
          <p className="text-accent text-[11px] font-black uppercase leading-tight">{success}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-accent/10 blur-[130px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/10 blur-[130px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        <header className="text-center mb-10">
          <h1 className="text-5xl font-black tracking-tighter text-content mb-2 italic">GYMRACE</h1>
          <p className="text-muted font-bold uppercase text-[9px] tracking-[0.4em]">{t('auth.subtitle')}</p>
        </header>

        <div className="bg-surface/50 backdrop-blur-xl border border-line/5 p-8 rounded-[40px] shadow-2xl">
          {forgot ? (
            /* ───────── RESTABLECER CONTRASEÑA ───────── */
            <>
              <div className="mb-6 text-center">
                <h2 className="text-xl font-black text-content uppercase tracking-tighter italic">{t('auth.resetTitle')}</h2>
                <p className="text-muted text-[11px] font-bold mt-2 leading-relaxed">
                  {t('auth.resetHelp')}
                </p>
              </div>
              <form onSubmit={handleReset} className="flex flex-col gap-4">
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input
                    type="text" placeholder={t('auth.resetField')} value={resetId} onChange={e => setResetId(e.target.value)}
                    className="w-full bg-black/40 border border-line/5 rounded-2xl pl-14 pr-6 py-5 text-content font-bold outline-none focus:border-line/20 transition-all text-sm"
                  />
                </div>

                {Messages}

                <motion.button
                  whileTap={{ scale: 0.96 }} transition={{ duration: 0.06 }}
                  type="submit" disabled={loading}
                  className="w-full bg-white text-black py-5 rounded-3xl font-black uppercase tracking-widest mt-2 flex items-center justify-center gap-2 touch-manipulation disabled:opacity-50 shadow-xl shadow-white/5"
                >
                  {loading ? t('auth.resetSending') : t('auth.resetSend')}
                  <ArrowRight size={20} strokeWidth={3} />
                </motion.button>
              </form>

              <footer className="mt-8 text-center">
                <button
                  onClick={() => { setForgot(false); clearMsgs(); }}
                  className="text-muted text-xs font-bold hover:text-content transition-all uppercase tracking-widest"
                >
                  {t('auth.resetBack')}
                </button>
              </footer>
            </>
          ) : (
            /* ───────── LOGIN / REGISTRO ───────── */
            <>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="relative">
                  {isLogin ? (
                    <>
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 text-muted" size={18} />
                      <input
                        type="text" placeholder={t('auth.username')} value={name} onChange={e => setName(e.target.value)}
                        className="w-full bg-black/40 border border-line/5 rounded-2xl pl-14 pr-6 py-5 text-content font-bold outline-none focus:border-line/20 transition-all text-sm"
                      />
                    </>
                  ) : (
                    <>
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-muted" size={18} />
                      <input
                        type="email" placeholder={t('auth.email')} value={email} onChange={e => setEmail(e.target.value)}
                        className="w-full bg-black/40 border border-line/5 rounded-2xl pl-14 pr-6 py-5 text-content font-bold outline-none focus:border-line/20 transition-all text-sm"
                      />
                    </>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {isLogin ? null : (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="relative"
                    >
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 text-muted" size={18} />
                      <input
                        type="text" placeholder={t('auth.name')} value={name} onChange={e => setName(e.target.value)}
                        className="w-full bg-black/40 border border-line/5 rounded-2xl pl-14 pr-6 py-5 text-content font-bold outline-none focus:border-line/20 transition-all text-sm"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'} placeholder={t('auth.password')} value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-line/5 rounded-2xl pl-14 pr-14 py-5 text-content font-bold outline-none focus:border-line/20 transition-all text-sm"
                  />
                  <button
                    type="button" onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-muted hover:text-content transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {isLogin && (
                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      onClick={() => { setForgot(true); clearMsgs(); setResetId(name); }}
                      className="text-muted text-[11px] font-bold hover:text-content transition-all"
                    >
                      {t('auth.forgot')}
                    </button>
                  </div>
                )}

                {Messages}

                <motion.button
                  whileTap={{ scale: 0.96 }} transition={{ duration: 0.06 }}
                  type="submit" disabled={loading}
                  className="w-full bg-white text-black py-5 rounded-3xl font-black uppercase tracking-widest mt-4 flex items-center justify-center gap-2 touch-manipulation disabled:opacity-50 shadow-xl shadow-white/5"
                >
                  {loading ? t('auth.loading') : (isLogin ? t('auth.login') : t('auth.signup'))}
                  <ArrowRight size={20} strokeWidth={3} />
                </motion.button>
              </form>

              <footer className="mt-8 text-center">
                <button
                  onClick={() => { setIsLogin(!isLogin); clearMsgs(); }}
                  className="text-muted text-xs font-bold hover:text-content transition-all uppercase tracking-widest"
                >
                  {isLogin ? t('auth.toSignup') : t('auth.toLogin')}
                </button>
              </footer>
            </>
          )}
        </div>
      </motion.div>

      <div
        className="fixed bottom-12 left-0 right-0 text-center z-0 opacity-30"
      >
        <p className="text-[9px] text-content font-extralight uppercase tracking-[0.6em] italic">Developed by Alejandro Millán</p>
      </div>
    </div>
  );
}
