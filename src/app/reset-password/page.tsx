'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useHabitStore';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false); // sesión de recuperación detectada
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setMounted(true);
    // El SDK de Supabase parsea automáticamente el token de recuperación de la URL (#access_token...).
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pass.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (pass !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true);
    const res = await updatePassword(pass);
    setLoading(false);
    if (res.success) {
      setDone(true);
      setTimeout(() => router.push('/'), 2500);
    } else {
      const msg = res.error?.includes('session') || res.error?.includes('Auth')
        ? 'El enlace ha caducado o no es válido. Solicita uno nuevo desde "¿Olvidaste tu contraseña?".'
        : (res.error || 'No se pudo actualizar la contraseña');
      setError(msg);
    }
  };

  if (!mounted) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-accent/10 blur-[130px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/10 blur-[130px] rounded-full" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm relative z-10">
        <header className="text-center mb-10">
          <h1 className="text-5xl font-black tracking-tighter text-content mb-2 italic">GYMRACE</h1>
          <p className="text-muted font-bold uppercase text-[9px] tracking-[0.4em]">Nueva contraseña</p>
        </header>

        <div className="bg-surface/50 backdrop-blur-xl border border-line/5 p-8 rounded-[40px] shadow-2xl">
          {done ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-4">
              <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center mb-5 shadow-[0_0_50px_rgba(16,185,129,0.4)]">
                <CheckCircle2 size={44} className="text-black" />
              </div>
              <h2 className="text-xl font-black text-content uppercase tracking-tighter italic mb-2">¡Contraseña actualizada!</h2>
              <p className="text-muted text-[11px] font-bold">Ya puedes iniciar sesión. Redirigiendo…</p>
            </motion.div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              {!ready && (
                <p className="text-amber-400/80 text-[11px] font-bold text-center leading-relaxed mb-1">
                  Abre esta página desde el enlace de tu email para que el cambio se aplique a tu cuenta.
                </p>
              )}

              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  type="password" placeholder="Nueva contraseña" value={pass} onChange={e => setPass(e.target.value)}
                  className="w-full bg-black/40 border border-line/5 rounded-2xl pl-14 pr-6 py-5 text-content font-bold outline-none focus:border-line/20 transition-all text-sm"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  type="password" placeholder="Repite la contraseña" value={confirm} onChange={e => setConfirm(e.target.value)}
                  className="w-full bg-black/40 border border-line/5 rounded-2xl pl-14 pr-6 py-5 text-content font-bold outline-none focus:border-line/20 transition-all text-sm"
                />
              </div>

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
              </AnimatePresence>

              <button
                type="submit" disabled={loading}
                className="w-full bg-white text-black py-5 rounded-3xl font-black uppercase tracking-widest mt-2 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-white/5"
              >
                {loading ? 'Guardando...' : 'Guardar contraseña'}
                <ArrowRight size={20} strokeWidth={3} />
              </button>

              <button
                type="button" onClick={() => router.push('/')}
                className="text-muted text-xs font-bold hover:text-content transition-all uppercase tracking-widest mt-3"
              >
                ← Volver
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
