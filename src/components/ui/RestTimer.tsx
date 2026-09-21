'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer24Regular } from '@fluentui/react-icons';
import { Bell, ChevronDown, Repeat } from 'lucide-react';
import { haptic, playDing } from '@/lib/feedback';

/**
 * Cronómetro de descanso a pantalla completa, calcado al Temporizador del
 * Reloj de iOS: fondo negro, anillo naranja fino que se vacía de forma
 * continua, numerales grandes y finos, hora de fin con campanita debajo y los
 * dos botones redondos Cancelar / Pausa. Con "Repetir" activado, al terminar
 * vuelve a arrancar con el mismo tiempo (para encadenar series sin tocar).
 */

const PRESETS = [30, 60, 90, 120, 180];
const ORANGE = '#FF9F0A';           // system orange de iOS
const R = 56;                        // radio del anillo (viewBox 120)
const C = 2 * Math.PI * R;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const fmtPreset = (s: number) => (s < 60 ? `${s} s` : s % 60 === 0 ? `${s / 60} min` : fmt(s));
const fmtClock = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

export function RestTimer() {
  const [open, setOpen] = useState(false);
  const [total, setTotal] = useState(0);                    // segundos del descanso elegido
  const [endAt, setEndAt] = useState<number | null>(null);  // timestamp de fin (corriendo)
  const [pausedMs, setPausedMs] = useState(0);              // lo que queda cuando está en pausa
  const [repeat, setRepeat] = useState(false);              // reinicia solo al acabar
  const [now, setNow] = useState(() => Date.now());

  const running = endAt !== null;
  const leftMs = running ? Math.max(0, endAt - now) : pausedMs;
  const leftS = Math.ceil(leftMs / 1000);
  const active = running || pausedMs > 0;
  const progress = total ? Math.min(1, leftMs / (total * 1000)) : 0;

  // Reloj: mientras corre refrescamos a 10 fps (anillo suave); parado, nada.
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [running]);

  // Fin del descanso: aviso y, si toca, vuelta a empezar con el mismo tiempo.
  const finishedRef = useRef(false);
  useEffect(() => {
    if (!running) { finishedRef.current = false; return; }
    if (leftMs > 0 || finishedRef.current) return;
    finishedRef.current = true;
    haptic([60, 80, 60, 80, 120]);
    playDing(990);
    if (repeat && total > 0) {
      setEndAt(Date.now() + total * 1000);
      finishedRef.current = false;
    } else {
      setEndAt(null);
      setPausedMs(0);
    }
  }, [leftMs, running, repeat, total]);

  const start = useCallback((s: number) => {
    setTotal(s);
    setPausedMs(0);
    setEndAt(Date.now() + s * 1000);
    haptic(20);
  }, []);

  const pause = () => {
    if (endAt === null) return;
    setPausedMs(Math.max(0, endAt - Date.now()));
    setEndAt(null);
    haptic(20);
  };
  const resume = () => {
    if (running || pausedMs <= 0) return;
    setEndAt(Date.now() + pausedMs);
    setPausedMs(0);
    haptic(20);
  };
  const cancel = () => {
    setEndAt(null);
    setPausedMs(0);
    setTotal(0);
    haptic(20);
  };
  const add15 = () => {
    if (running) setEndAt((e) => (e ?? Date.now()) + 15_000);
    else setPausedMs((p) => p + 15_000);
    setTotal((t) => Math.max(t, leftS + 15));
    haptic(15);
  };

  const endClock = active ? fmtClock(new Date(Date.now() + leftMs)) : '';

  return (
    <>
      {/* Botón flotante en la pestaña de pesas */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-28 right-5 z-[55] h-12 px-4 rounded-2xl flex items-center gap-2 font-medium tracking-tight text-[11px] shadow-2xl active:scale-95 transition-all ${
          active
            ? 'text-black shadow-[0_0_24px_rgba(255,159,10,0.45)]'
            : 'bg-surface border border-line/10 text-content'
        }`}
        style={active ? { background: ORANGE } : undefined}
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
        {active ? <span className="tabular-nums">{fmt(leftS)}</span> : <span>Descanso</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
            className="fixed inset-0 z-[120] bg-black text-white flex flex-col select-none"
            style={{
              paddingTop: 'max(env(safe-area-inset-top), 14px)',
              paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
            }}
          >
            {/* Cabecera: minimizar (el descanso sigue corriendo detrás) */}
            <div className="relative flex items-center justify-center h-12 px-4">
              <button
                onClick={() => setOpen(false)}
                aria-label="Minimizar"
                className="absolute left-3 w-10 h-10 flex items-center justify-center rounded-full text-white/60 active:bg-white/10 transition-colors"
              >
                <ChevronDown size={26} strokeWidth={2.2} />
              </button>
              <span className="text-[17px] font-semibold tracking-tight">Descanso</span>
            </div>

            {/* Anillo */}
            <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
              <div className="relative" style={{ width: 'min(78vw, 330px)', height: 'min(78vw, 330px)' }}>
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3.6" />
                  <circle
                    cx="60" cy="60" r={R} fill="none"
                    stroke={ORANGE} strokeWidth="3.6" strokeLinecap="round"
                    style={{
                      strokeDasharray: C,
                      strokeDashoffset: C * (1 - progress),
                      transition: 'stroke-dashoffset 120ms linear',
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="leading-none font-extralight tabular-nums tracking-[-0.03em]"
                    style={{ fontSize: 'clamp(58px, 20vw, 86px)' }}
                  >
                    {fmt(active ? leftS : total)}
                  </span>
                  <span className="mt-3 h-5 flex items-center gap-1.5 text-[15px] text-white/45 tabular-nums">
                    {active && (<><Bell size={14} strokeWidth={2.2} fill="currentColor" />{endClock}</>)}
                  </span>
                </div>
              </div>

              {/* Antes de arrancar: tiempos rápidos. Corriendo: repetir y +15 s */}
              <div className="h-11 flex items-center justify-center gap-2">
                {!active ? (
                  PRESETS.map((s) => (
                    <button
                      key={s} onClick={() => start(s)}
                      className="h-10 px-4 rounded-full bg-white/[0.09] text-[14px] font-medium tabular-nums active:bg-white/20 transition-colors"
                    >
                      {fmtPreset(s)}
                    </button>
                  ))
                ) : (
                  <>
                    <button
                      onClick={() => { setRepeat((r) => !r); haptic(15); }}
                      aria-pressed={repeat}
                      className={`h-10 pl-3 pr-4 rounded-full text-[14px] font-medium flex items-center gap-1.5 transition-colors ${
                        repeat ? 'text-black' : 'bg-white/[0.09] text-white/85 active:bg-white/20'
                      }`}
                      style={repeat ? { background: ORANGE } : undefined}
                    >
                      <Repeat size={15} strokeWidth={2.4} />
                      {repeat ? 'Repite solo' : 'Repetir'}
                    </button>
                    <button
                      onClick={add15}
                      className="h-10 px-4 rounded-full bg-white/[0.09] text-[14px] font-medium tabular-nums active:bg-white/20 transition-colors"
                    >
                      +15 s
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Botones redondos iOS */}
            <div className="flex items-center justify-between px-9 pb-2" style={{ maxWidth: 420, width: '100%', margin: '0 auto' }}>
              <button
                onClick={() => { cancel(); if (!active) setOpen(false); }}
                className="w-[88px] h-[88px] rounded-full flex items-center justify-center text-[15px] font-medium active:opacity-70 transition-opacity"
                style={{ background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.9)' }}
              >
                {active ? 'Cancelar' : 'Cerrar'}
              </button>
              <button
                onClick={() => (running ? pause() : active ? resume() : start(total || 60))}
                className="w-[88px] h-[88px] rounded-full flex items-center justify-center text-[15px] font-medium active:opacity-70 transition-opacity"
                style={{ background: 'rgba(255,159,10,0.28)', color: ORANGE }}
              >
                {running ? 'Pausa' : active ? 'Reanudar' : 'Iniciar'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
