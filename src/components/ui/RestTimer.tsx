'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic, playDing } from '@/lib/feedback';

const PRESETS = [30, 60, 90, 120, 180];
const R = 54;
const C = 2 * Math.PI * R;

export function RestTimer() {
  const [open, setOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);

  // Tick
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Fin del descanso
  useEffect(() => {
    if (running && left === 0) {
      setRunning(false);
      haptic([60, 80, 60, 80, 120]);
      playDing(990);
    }
  }, [left, running]);

  const start = (s: number) => { setTotal(s); setLeft(s); setRunning(true); };
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const progress = total ? left / total : 0;
  const active = running || left > 0;

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-28 right-5 z-[55] h-12 px-4 rounded-2xl flex items-center gap-2 font-black uppercase tracking-widest text-[11px] shadow-2xl active:scale-95 transition-all ${
          active ? 'bg-accent text-black' : 'bg-surface border border-line/10 text-content'
        }`}
      >
        <span className="text-base">⏱️</span>
        {active ? <span className="tabular-nums">{fmt(left)}</span> : <span>Descanso</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-surface border border-line/10 w-full max-w-sm rounded-[40px] p-8 relative shadow-2xl flex flex-col items-center"
            >
              <button onClick={() => setOpen(false)} className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center bg-surface-2 rounded-xl text-muted hover:text-content transition-colors text-lg font-bold">✕</button>
              <h2 className="text-xl font-black text-content uppercase tracking-tighter italic mb-6">Descanso</h2>

              {/* Anillo de progreso */}
              <div className="relative w-44 h-44 mb-6">
                <svg className="w-44 h-44 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeWidth="9" className="text-surface-2" />
                  <motion.circle
                    cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round"
                    className="text-accent"
                    style={{ strokeDasharray: C }}
                    animate={{ strokeDashoffset: C * (1 - progress) }}
                    transition={{ duration: 0.5, ease: 'linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-content tabular-nums tracking-tighter">{fmt(left)}</span>
                  {active && <span className="text-[9px] font-black text-muted uppercase tracking-widest mt-1">{running ? 'en marcha' : 'en pausa'}</span>}
                </div>
              </div>

              {/* Presets */}
              <div className="grid grid-cols-5 gap-2 w-full mb-5">
                {PRESETS.map((s) => (
                  <button
                    key={s} onClick={() => start(s)}
                    className="bg-surface-2 text-content py-3 rounded-xl font-black text-xs active:scale-95 transition-all"
                  >
                    {s < 60 ? `${s}s` : `${s / 60}m`}
                  </button>
                ))}
              </div>

              {/* Controles */}
              {active ? (
                <div className="flex gap-2 w-full">
                  <button onClick={() => setLeft((l) => l + 15)} className="flex-1 bg-surface-2 text-content py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">+15s</button>
                  <button onClick={() => setRunning((r) => !r)} className="flex-1 bg-white text-black py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">{running ? 'Pausa' : 'Seguir'}</button>
                  <button onClick={() => { setRunning(false); setLeft(0); setTotal(0); }} className="flex-1 bg-surface-2 text-rose-500 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Reset</button>
                </div>
              ) : (
                <p className="text-muted text-[10px] font-bold uppercase tracking-widest text-center">Elige un tiempo de descanso</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
