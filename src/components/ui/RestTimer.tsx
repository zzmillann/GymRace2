'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Timer24Regular,
  Dismiss24Regular,
  Play24Filled,
  Pause24Filled,
  ArrowCounterclockwise24Regular,
  Add24Filled,
} from '@fluentui/react-icons';
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
  const ending = active && left <= 5 && left > 0;   // últimos segundos

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-28 right-5 z-[55] h-12 px-4 rounded-2xl flex items-center gap-2 font-medium tracking-tight text-[11px] shadow-2xl active:scale-95 transition-all ${
          active
            ? 'bg-accent text-black shadow-[0_0_24px_rgba(16,185,129,0.45)]'
            : 'bg-surface border border-line/10 text-content'
        }`}
      >
        {active ? (
          <motion.span
            className="flex items-center"
            animate={{ opacity: running ? [1, 0.55, 1] : 1 }}
            transition={{ repeat: running ? Infinity : 0, duration: 1 }}
          >
            <Timer24Regular style={{ fontSize: 18 }} />
          </motion.span>
        ) : (
          <Timer24Regular style={{ fontSize: 18 }} />
        )}
        {active ? <span className="tabular-nums">{fmt(left)}</span> : <span>Descanso</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[120] flex items-center justify-center p-5 bg-app/85 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 14, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-line/10 w-full max-w-[350px] rounded-[36px] p-7 relative shadow-2xl flex flex-col items-center overflow-hidden"
            >
              {/* halo que respira mientras corre */}
              {running && (
                <motion.div
                  aria-hidden
                  className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-accent/15 blur-[70px] pointer-events-none"
                  animate={{ opacity: [0.5, 1, 0.5], scale: [0.92, 1.08, 0.92] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                />
              )}

              <div className="w-full flex items-start justify-between mb-6 relative z-10">
                <div>
                  <p className="text-[11px] font-medium text-muted tracking-tight">Entre series</p>
                  <h2 className="text-xl font-semibold text-content tracking-tight">Descanso</h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 flex items-center justify-center bg-surface-2 rounded-full text-muted hover:text-content transition-colors"
                  aria-label="Cerrar"
                >
                  <Dismiss24Regular style={{ fontSize: 17 }} />
                </button>
              </div>

              {/* Anillo de progreso */}
              <motion.div
                className="relative w-44 h-44 mb-7 z-10"
                animate={ending ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                transition={{ repeat: ending ? Infinity : 0, duration: 1 }}
              >
                <svg className="w-44 h-44 -rotate-90 overflow-visible" viewBox="0 0 120 120">
                  <defs>
                    <linearGradient id="restRing" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#34D399" />
                      <stop offset="1" stopColor="#10B981" />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-2" />
                  <motion.circle
                    cx="60" cy="60" r={R} fill="none"
                    stroke={ending ? '#F43F5E' : 'url(#restRing)'}
                    strokeWidth="8" strokeLinecap="round"
                    style={{ strokeDasharray: C, filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.5))' }}
                    animate={{ strokeDashoffset: C * (1 - progress) }}
                    transition={{ duration: 0.5, ease: 'linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[2.75rem] leading-none font-semibold text-content tabular-nums tracking-tight">{fmt(left)}</span>
                  {active && (
                    <span className="text-[11px] font-medium text-muted tracking-tight mt-2">
                      {running ? 'en marcha' : 'en pausa'}
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Presets */}
              <div className="grid grid-cols-5 gap-1.5 w-full mb-4 relative z-10">
                {PRESETS.map((s) => (
                  <button
                    key={s} onClick={() => start(s)}
                    className={`py-3 rounded-xl font-medium text-xs tabular-nums active:scale-95 transition-all ${
                      total === s && active
                        ? 'bg-accent text-black'
                        : 'bg-surface-2 text-content hover:bg-surface-2/70'
                    }`}
                  >
                    {s < 60 ? `${s}s` : `${s / 60}m`}
                  </button>
                ))}
              </div>

              {/* Controles */}
              <div className="w-full relative z-10">
                {active ? (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setLeft((l) => l + 15)}
                      className="flex-1 bg-surface-2 text-content py-4 rounded-2xl font-medium text-[10px] tracking-tight active:scale-95 transition-all flex items-center justify-center gap-1"
                    >
                      <Add24Filled style={{ fontSize: 13 }} />15s
                    </button>
                    <button
                      onClick={() => setRunning((r) => !r)}
                      className="flex-[1.4] bg-white text-black py-4 rounded-2xl font-medium text-[10px] tracking-tight active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      {running
                        ? <><Pause24Filled style={{ fontSize: 14 }} />Pausa</>
                        : <><Play24Filled style={{ fontSize: 14 }} />Seguir</>}
                    </button>
                    <button
                      onClick={() => { setRunning(false); setLeft(0); setTotal(0); }}
                      className="flex-1 bg-surface-2 text-rose-500 py-4 rounded-2xl font-medium text-[10px] tracking-tight active:scale-95 transition-all flex items-center justify-center"
                      aria-label="Reiniciar"
                    >
                      <ArrowCounterclockwise24Regular style={{ fontSize: 16 }} />
                    </button>
                  </div>
                ) : (
                  <p className="text-muted text-[10px] font-medium tracking-tight text-center py-2">
                    Elige un tiempo de descanso
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
