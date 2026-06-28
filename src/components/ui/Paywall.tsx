'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type SubscriptionPlan } from '@/store/useHabitStore';

const PRO_FEATURES = [
  { emoji: '♾️', label: 'Actividades ilimitadas', desc: 'Hábitos, ejercicios y libros sin tope' },
  { emoji: '📊', label: 'Estadísticas avanzadas', desc: 'Tendencias, heatmaps y récords' },
  { emoji: '☁️', label: 'Copia en la nube', desc: 'Sincroniza entre todos tus dispositivos' },
  { emoji: '🎨', label: 'Temas y personalización', desc: 'Colores de acento y modo claro' },
  { emoji: '🛡️', label: 'Sin anuncios, para siempre', desc: 'Experiencia 100% limpia' },
];

const PLANS: { id: Exclude<SubscriptionPlan, 'free'>; name: string; price: string; sub: string; badge?: string }[] = [
  { id: 'weekly', name: 'Semanal', price: '0,99 €', sub: 'a la semana' },
  { id: 'monthly', name: 'Mensual', price: '2,99 €', sub: 'al mes', badge: 'POPULAR' },
  { id: 'quarterly', name: 'Trimestral', price: '4,99 €', sub: 'cada 3 meses · 1,66 €/mes', badge: 'AHORRA 44%' },
];

// Logo de Apple para el botón de Apple Pay (SVG inline, sin dependencias)
function AppleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 384 512" className={className} fill="currentColor" aria-hidden>
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function CheckIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function Paywall() {
  const { paywall, closePaywall, activatePro } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'plans' | 'card' | 'success'>('plans');
  const [plan, setPlan] = useState<Exclude<SubscriptionPlan, 'free'>>('monthly');
  const [processing, setProcessing] = useState(false);

  // Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');

  useEffect(() => setMounted(true), []);

  // Reinicia el flujo cada vez que se abre
  useEffect(() => {
    if (paywall.open) {
      setStep('plans');
      setProcessing(false);
    }
  }, [paywall.open]);

  if (!mounted) return null;

  const selectedPlan = PLANS.find((p) => p.id === plan)!;

  const formatCard = (val: string) =>
    val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  const formatExp = (val: string) => {
    const v = val.replace(/\D/g, '').slice(0, 4);
    return v.length >= 3 ? `${v.slice(0, 2)}/${v.slice(2)}` : v;
  };

  const demoSuccess = () => {
    setProcessing(false);
    setStep('success');
    setTimeout(() => activatePro(plan), 1400);
  };

  const pay = async (_method: 'apple' | 'bizum' | 'card') => {
    setProcessing(true);
    try {
      const userId = useAppStore.getState().userId;
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, userId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          // Stripe Checkout: tarjeta, Apple Pay/Google Pay y Bizum según tu Dashboard.
          window.location.href = data.url;
          return;
        }
      }
      // Stripe no configurado (503) → modo demo para no bloquear la app.
      setTimeout(demoSuccess, 700);
    } catch {
      setTimeout(demoSuccess, 700);
    }
  };

  const cardValid = cardNumber.replace(/\s/g, '').length === 16 && exp.length === 5 && cvc.length >= 3;

  return (
    <AnimatePresence>
      {paywall.open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xl"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="bg-neutral-950 border border-white/10 w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-7 relative shadow-2xl max-h-[92vh] overflow-y-auto hide-scrollbar"
          >
            <button
              onClick={closePaywall}
              className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center bg-neutral-900 border border-white/5 rounded-xl text-neutral-400 hover:text-white transition-colors z-10 text-lg font-bold"
            >
              ✕
            </button>

            <AnimatePresence mode="wait">
              {/* ───────── PASO 1: PLANES ───────── */}
              {step === 'plans' && (
                <motion.div key="plans" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="flex flex-col items-center text-center mb-6">
                    <motion.div
                      animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.08, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)] mb-4 text-3xl"
                    >
                      ✨
                    </motion.div>
                    <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">
                      GymRace <span className="text-emerald-500">Pro</span>
                    </h2>
                    {paywall.reason ? (
                      <p className="text-amber-400/90 text-xs font-bold mt-2 leading-snug">{paywall.reason}</p>
                    ) : (
                      <p className="text-neutral-500 text-xs font-bold mt-2">Desbloquea todo tu potencial</p>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-7">
                    {PRO_FEATURES.map((f) => (
                      <div key={f.label} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-base">
                          {f.emoji}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-black text-sm leading-tight">{f.label}</p>
                          <p className="text-neutral-500 text-[11px] font-medium leading-tight">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Planes */}
                  <div className="space-y-3 mb-6">
                    {PLANS.map((p) => {
                      const active = plan === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setPlan(p.id)}
                          className={`w-full flex items-center justify-between rounded-2xl px-5 py-4 border transition-all ${
                            active ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-neutral-900 hover:border-white/15'
                          }`}
                        >
                          <div className="flex items-center gap-3 text-left">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? 'border-emerald-500 bg-emerald-500 text-black' : 'border-neutral-600'}`}>
                              {active && <CheckIcon size={12} />}
                            </div>
                            <div>
                              <p className="text-white font-black text-sm">{p.name}</p>
                              <p className="text-neutral-500 text-[11px] font-bold">{p.sub}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {p.badge && (
                              <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-1 rounded-full uppercase tracking-wider">{p.badge}</span>
                            )}
                            <p className="text-white font-black text-base">{p.price}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Apple Pay */}
                  <button
                    onClick={() => pay('apple')}
                    disabled={processing}
                    className="w-full bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 mb-3 active:scale-[0.98] transition-transform disabled:opacity-60"
                  >
                    {processing ? (
                      <span className="font-black uppercase tracking-widest text-sm">Procesando…</span>
                    ) : (
                      <>
                        <AppleLogo className="w-5 h-5 -mt-0.5" />
                        <span className="text-lg font-medium">Pay</span>
                      </>
                    )}
                  </button>

                  {/* Bizum */}
                  <button
                    onClick={() => pay('bizum')}
                    disabled={processing}
                    className="w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 mb-3 active:scale-[0.98] transition-transform disabled:opacity-60 text-white"
                    style={{ background: 'linear-gradient(135deg, #00B6CB 0%, #0A7FC2 100%)' }}
                  >
                    {processing ? (
                      <span className="font-black uppercase tracking-widest text-sm">Procesando…</span>
                    ) : (
                      <>
                        <span className="text-base font-black lowercase tracking-tight">Pagar con</span>
                        <span className="text-lg font-black lowercase tracking-tighter italic">bizum</span>
                      </>
                    )}
                  </button>

                  {/* Pagar con tarjeta (Stripe Checkout) */}
                  <button
                    onClick={() => pay('card')}
                    disabled={processing}
                    className="w-full bg-neutral-900 border border-white/10 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
                  >
                    💳 Pagar con tarjeta
                  </button>

                  <p className="text-center text-[10px] text-neutral-600 font-medium mt-4 leading-relaxed">
                    Pago seguro. Cancela cuando quieras.<br />
                    Renovación automática salvo cancelación 24 h antes.
                  </p>
                </motion.div>
              )}

              {/* ───────── PASO 2: TARJETA ───────── */}
              {step === 'card' && (
                <motion.div key="card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <div className="mb-6">
                    <h2 className="text-2xl font-black tracking-tighter text-white uppercase italic">Pago con tarjeta</h2>
                    <p className="text-neutral-500 text-xs font-bold mt-1">
                      Plan {selectedPlan.name} · <span className="text-white">{selectedPlan.price}</span> {selectedPlan.sub}
                    </p>
                  </div>

                  {/* Card preview */}
                  <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 rounded-3xl p-5 h-40 flex flex-col justify-between mb-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-purple-500/10" />
                    <div className="flex justify-between items-start">
                      <p className="text-white font-black tracking-widest italic">GYMRACE</p>
                      <div className="w-9 h-9 rounded-full bg-amber-400/80 relative">
                        <div className="w-9 h-9 rounded-full bg-rose-500/70 absolute -right-3 top-0 mix-blend-screen" />
                      </div>
                    </div>
                    <div>
                      <p className="text-white/40 text-[8px] font-black uppercase tracking-[0.3em] mb-1">Número</p>
                      <p className="text-white font-black tracking-[0.2em] text-sm">{formatCard(cardNumber) || '•••• •••• •••• ••••'}</p>
                      <p className="text-white/60 text-[10px] font-bold mt-2 uppercase">{name || 'TU NOMBRE'} · {exp || 'MM/AA'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <input
                      inputMode="numeric" placeholder="Número de tarjeta"
                      value={formatCard(cardNumber)}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, ''))}
                      className="w-full bg-neutral-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold tracking-widest outline-none focus:border-emerald-500/50 transition-all"
                    />
                    <input
                      placeholder="Nombre del titular" value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        inputMode="numeric" placeholder="MM/AA" value={exp}
                        onChange={(e) => setExp(formatExp(e.target.value))}
                        className="bg-neutral-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold tracking-widest outline-none focus:border-emerald-500/50 transition-all text-center"
                      />
                      <input
                        inputMode="numeric" type="password" placeholder="CVC" value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="bg-neutral-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold tracking-widest outline-none focus:border-emerald-500/50 transition-all text-center"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => pay('card')}
                    disabled={!cardValid || processing}
                    className="w-full bg-emerald-500 text-black py-4 rounded-2xl font-black uppercase tracking-widest text-sm mt-6 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {processing ? 'Procesando…' : `Pagar ${selectedPlan.price}`}
                  </button>
                  <button
                    onClick={() => setStep('plans')}
                    disabled={processing}
                    className="w-full text-neutral-500 py-3 font-black uppercase tracking-widest text-[10px] mt-1 disabled:opacity-40"
                  >
                    ← Volver
                  </button>
                </motion.div>
              )}

              {/* ───────── PASO 3: ÉXITO ───────── */}
              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                    transition={{ type: 'spring', damping: 12 }}
                    className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.5)] mb-6 text-black"
                  >
                    <CheckIcon size={50} />
                  </motion.div>
                  <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic mb-2">¡Ya eres Pro!</h2>
                  <p className="text-neutral-400 text-sm font-bold leading-relaxed">
                    Actividades ilimitadas desbloqueadas.<br />
                    <span className="text-emerald-500">Ahora a darlo todo. 💪</span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
