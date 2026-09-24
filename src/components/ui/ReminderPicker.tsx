'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock24Regular, Dismiss24Regular, Checkmark24Filled } from '@fluentui/react-icons';

/**
 * Selector de hora para los recordatorios.
 *
 * Sustituye al <input type="time"> nativo, que en Android/Chrome abre un
 * desplegable diminuto y descolocado. Aquí es un botón con reloj que abre un
 * modal centrado con dos ruedas (horas y minutos) cómodas de usar con el dedo.
 */

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const QUICK = ['07:00', '09:00', '14:00', '18:00', '21:00', '22:30'];

const ITEM_H = 44; // alto de cada opción de la rueda, en px

function Wheel({
  values,
  value,
  onChange,
  label,
}: {
  values: string[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Centrar la opción activa al abrir
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = values.indexOf(value);
    if (idx >= 0) el.scrollTop = idx * ITEM_H;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex-1">
      <p className="text-[11px] font-medium text-muted tracking-tight text-center mb-2">{label}</p>
      <div className="relative">
        {/* banda que marca la selección */}
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-xl bg-white/5 border border-line/10 pointer-events-none"
          style={{ height: ITEM_H }}
        />
        <div
          ref={ref}
          className="overflow-y-auto snap-y snap-mandatory hide-scrollbar"
          style={{ height: ITEM_H * 3, scrollPaddingTop: ITEM_H, paddingBlock: ITEM_H }}
        >
          {values.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`w-full snap-center flex items-center justify-center tabular-nums transition-all ${
                v === value
                  ? 'text-content text-2xl font-semibold'
                  : 'text-muted/60 text-lg font-medium hover:text-muted'
              }`}
              style={{ height: ITEM_H }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReminderPicker({
  value,
  onChange,
  compact = false,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [h, setH] = useState('09');
  const [m, setM] = useState('00');

  // Al abrir, partimos del valor guardado (o de las 09:00 por defecto)
  useEffect(() => {
    if (!open) return;
    const [vh, vm] = (value || '09:00').split(':');
    setH(vh?.padStart(2, '0') || '09');
    setM(vm?.padStart(2, '0') || '00');
  }, [open, value]);

  // Escape para cerrar y bloqueo del scroll de fondo
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const save = () => {
    onChange(`${h}:${m}`);
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 rounded-xl border transition-all active:scale-95 ${
          value
            ? 'bg-accent/10 border-accent/30 text-accent'
            : 'bg-surface border-line/10 text-muted hover:text-content hover:border-line/25'
        } ${compact ? 'px-3 py-1.5' : 'px-4 py-2'}`}
      >
        <Clock24Regular style={{ fontSize: compact ? 16 : 18 }} />
        <span className={`font-medium tabular-nums ${compact ? 'text-xs' : 'text-sm'}`}>
          {value || '--:--'}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[9999] bg-app/70 backdrop-blur-sm flex items-center justify-center p-5"
          >
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[330px] bg-surface border border-line/10 rounded-[28px] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[11px] font-medium text-muted tracking-tight">Recordatorio</p>
                  <p className="text-content font-medium text-lg tracking-tight">Cada día a las…</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 rounded-full bg-surface-2 text-muted hover:text-content flex items-center justify-center transition-colors"
                  aria-label="Cerrar"
                >
                  <Dismiss24Regular style={{ fontSize: 17 }} />
                </button>
              </div>

              {/* hora elegida, en grande */}
              <p className="text-center text-5xl font-semibold text-content tabular-nums tracking-tight mb-5">
                {h}<span className="text-muted/40">:</span>{m}
              </p>

              <div className="flex gap-3 mb-5">
                <Wheel values={HOURS} value={h} onChange={setH} label="hora" />
                <Wheel values={MINUTES} value={m} onChange={setM} label="min" />
              </div>

              {/* atajos */}
              <div className="flex flex-wrap gap-1.5 justify-center mb-5">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    onClick={() => { const [qh, qm] = q.split(':'); setH(qh); setM(qm); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium tabular-nums transition-colors ${
                      `${h}:${m}` === q
                        ? 'bg-accent text-white'
                        : 'bg-surface-2 text-muted hover:text-content'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                {value && (
                  <button
                    onClick={() => { onChange(null); setOpen(false); }}
                    className="px-4 py-3.5 rounded-2xl bg-surface-2 text-rose-500 font-medium text-[11px] tracking-tight active:scale-95 transition-transform"
                  >
                    Quitar
                  </button>
                )}
                <button
                  onClick={save}
                  className="flex-1 py-3.5 rounded-2xl bg-accent text-white font-medium text-[11px] tracking-tight flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <Checkmark24Filled style={{ fontSize: 16 }} />
                  Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
