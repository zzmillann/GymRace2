'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Checkmark24Filled } from '@fluentui/react-icons';
import { PALETTES, type Palette } from '@/lib/palettes';
import { useAppStore } from '@/store/useHabitStore';
import { haptic } from '@/lib/feedback';

/**
 * Galería de estilos: se pasan con el dedo y cada tarjeta enseña una maqueta
 * de la pantalla principal con esos colores. El estilo no se guarda hasta
 * pulsar "Aplicar".
 */

/** Maqueta en miniatura de la home, pintada con la paleta que reciba. */
function Preview({ p }: { p: Palette }) {
  const glass = 'rgba(255,255,255,0.08)';
  const border = 'rgba(255,255,255,0.14)';

  return (
    <div
      className="w-full h-full rounded-[22px] overflow-hidden relative select-none"
      style={{
        backgroundColor: p.app,
        backgroundImage: `
          radial-gradient(85% 50% at 10% -8%, ${p.g1} 0%, transparent 62%),
          radial-gradient(75% 45% at 100% 5%, ${p.g2} 0%, transparent 62%),
          radial-gradient(95% 55% at 45% 108%, ${p.g3} 0%, transparent 66%)`,
      }}
    >
      <div className="p-3.5">
        <div className="h-2.5 w-24 rounded-full mb-1.5" style={{ background: p.content, opacity: 0.9 }} />
        <div className="h-1.5 w-16 rounded-full" style={{ background: p.muted, opacity: 0.7 }} />
      </div>

      {/* dos tarjetas de cristal */}
      {[0, 1].map((i) => (
        <div
          key={i}
          className="mx-3.5 mb-2.5 rounded-2xl p-3 relative overflow-hidden"
          style={{ background: glass, border: `1px solid ${border}`, backdropFilter: 'blur(10px)' }}
        >
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent)' }}
          />
          <div className="flex justify-between items-start">
            <div>
              <div className="h-2 w-12 rounded-full mb-1.5" style={{ background: p.content, opacity: 0.85 }} />
              <div className="h-1.5 w-8 rounded-full" style={{ background: p.muted, opacity: 0.6 }} />
            </div>
            <div className="h-4 w-9 rounded-lg" style={{ background: p.accent, opacity: 0.85 }} />
          </div>
          <div className="flex gap-[3px] mt-2.5">
            {Array.from({ length: 14 }).map((_, k) => (
              <div
                key={k}
                className="h-3 flex-1 rounded-[2px]"
                style={{ background: k % 3 === i ? p.accent : 'rgba(255,255,255,0.13)' }}
              />
            ))}
          </div>
        </div>
      ))}

      {/* barra inferior flotante */}
      <div
        className="absolute bottom-2.5 left-3 right-3 h-8 rounded-2xl flex items-center justify-around px-2"
        style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${border}`, backdropFilter: 'blur(10px)' }}
      >
        {[0, 1, 2, 3, 4].map((k) => (
          <div
            key={k}
            className="rounded-full"
            style={{
              width: k === 2 ? 12 : 8,
              height: k === 2 ? 12 : 8,
              background: k === 0 ? p.content : k === 2 ? p.content : p.muted,
              opacity: k === 0 || k === 2 ? 0.95 : 0.5,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ThemeGallery() {
  const saved = useAppStore((s) => s.settings.palette) || 'aurora';
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [idx, setIdx] = useState(Math.max(0, PALETTES.findIndex((p) => p.id === saved)));
  const trackRef = useRef<HTMLDivElement | null>(null);

  const current = PALETTES[idx];
  const isApplied = current.id === saved;

  // Al abrir, centramos la tarjeta del estilo que ya está aplicado
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.children[idx] as HTMLElement | undefined;
    card?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Qué tarjeta está centrada, para saber cuál se aplicaría
  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestD = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const node = c as HTMLElement;
      const center = node.offsetLeft + node.offsetWidth / 2;
      const d = Math.abs(center - mid);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best !== idx) setIdx(best);
  };

  const apply = () => {
    updateSettings({ palette: current.id });
    haptic([20, 40]);
  };

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between px-1 mb-3">
        <span className="text-[15px] text-content/80 tracking-tight">Estilo</span>
        <span className="text-[12px] text-muted">{current.name}</span>
      </div>

      {/* carrusel */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory hide-scrollbar px-1 pb-2"
      >
        {PALETTES.map((p, i) => (
          <button
            key={p.id}
            onClick={() => {
              setIdx(i);
              (trackRef.current?.children[i] as HTMLElement)?.scrollIntoView({
                block: 'nearest', inline: 'center', behavior: 'smooth',
              });
            }}
            className="snap-center shrink-0 relative outline-none"
            style={{ width: 168 }}
          >
            <motion.div
              className="rounded-[24px] p-[3px]"
              animate={{
                scale: i === idx ? 1 : 0.93,
                opacity: i === idx ? 1 : 0.55,
              }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              style={{
                background: i === idx
                  ? `linear-gradient(140deg, ${p.g1}, ${p.g2})`
                  : 'transparent',
              }}
            >
              <div style={{ height: 268 }}>
                <Preview p={p} />
              </div>
            </motion.div>

            <p className={`mt-2 text-center text-[12px] tracking-tight ${
              i === idx ? 'text-content font-medium' : 'text-muted'
            }`}>
              {p.name}
            </p>

            {p.id === saved && (
              <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center shadow-lg">
                <Checkmark24Filled style={{ fontSize: 14 }} />
              </span>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={apply}
        disabled={isApplied}
        className={`w-full mt-3 py-3.5 rounded-2xl text-sm font-medium tracking-tight transition-all active:scale-[0.98] ${
          isApplied
            ? 'bg-surface-2 text-muted cursor-default'
            : 'bg-content text-app'
        }`}
      >
        {isApplied ? `“${current.name}” aplicado` : `Aplicar “${current.name}”`}
      </button>
    </div>
  );
}
