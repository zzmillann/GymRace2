'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/store/useHabitStore';

export function AuthView() {
  const { signUp, signIn } = useAppStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

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

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/10 blur-[130px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/10 blur-[130px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        <header className="text-center mb-10">
          <motion.div 
            whileHover={{ rotate: 10 }}
            className="w-20 h-20 bg-white rounded-[32px] mx-auto mb-6 flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.15)]"
          >
            <ShieldCheck size={40} className="text-black" />
          </motion.div>
          <h1 className="text-5xl font-black tracking-tighter text-white mb-2 italic">GYMRACE</h1>
          <p className="text-neutral-500 font-bold uppercase text-[9px] tracking-[0.4em]">Elite Productivity & Strength</p>
        </header>

        <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-[40px] shadow-2xl">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="relative">
                {isLogin ? (
                    <>
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
                        <input 
                            type="text" placeholder="Nombre de usuario" value={name} onChange={e => setName(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-white font-bold outline-none focus:border-white/20 transition-all text-sm"
                        />
                    </>
                ) : (
                    <>
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
                        <input 
                            type="email" placeholder="Email (ej. alex@gym.com)" value={email} onChange={e => setEmail(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-white font-bold outline-none focus:border-white/20 transition-all text-sm"
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
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
                        <input 
                            type="text" placeholder="¿Cómo te llamas?" value={name} onChange={e => setName(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-white font-bold outline-none focus:border-white/20 transition-all text-sm"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
                <input 
                type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-white font-bold outline-none focus:border-white/20 transition-all text-sm"
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
                {success && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3"
                    >
                        <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={18} />
                        <p className="text-emerald-500 text-[11px] font-black uppercase leading-tight">{success}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <button 
                type="submit" disabled={loading}
                className="w-full bg-white text-black py-5 rounded-3xl font-black uppercase tracking-widest mt-4 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-white/5"
            >
                {loading ? 'Entrenando...' : (isLogin ? 'Entrar' : 'Empezar Carrera')}
                <ArrowRight size={20} strokeWidth={3} />
            </button>
            </form>

            <footer className="mt-8 text-center">
            <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-neutral-500 text-xs font-bold hover:text-white transition-all uppercase tracking-widest"
            >
                {isLogin ? '¿Nuevo aquí? Regístrate' : 'Ya tengo cuenta'}
            </button>
            </footer>
        </div>
      </motion.div>
      
      <div 
        className="fixed bottom-12 left-0 right-0 text-center z-0 opacity-30"
      >
        <p className="text-[9px] text-white font-extralight uppercase tracking-[0.6em] italic">Developed by Alejandro Millán</p>
      </div>
    </div>
  );
}
