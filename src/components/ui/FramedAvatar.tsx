'use client';

import { motion } from 'framer-motion';

export type FrameId = 'none' | 'emerald' | 'gold' | 'neon' | 'fire' | 'rainbow' | 'verified';

export const FRAMES: { id: FrameId; label: string; emoji: string }[] = [
  { id: 'none', label: 'Ninguno', emoji: '⚪' },
  { id: 'emerald', label: 'Esmeralda', emoji: '🟢' },
  { id: 'gold', label: 'Oro', emoji: '🏅' },
  { id: 'verified', label: 'Verificado', emoji: '✅' },
  { id: 'neon', label: 'Neón', emoji: '💠' },
  { id: 'fire', label: 'Fuego', emoji: '🔥' },
  { id: 'rainbow', label: 'Arcoíris', emoji: '🌈' },
];

const CONIC: Partial<Record<FrameId, string>> = {
  neon: 'conic-gradient(#22d3ee, #a855f7, #ec4899, #22d3ee)',
  rainbow: 'conic-gradient(#f43f5e, #f59e0b, #10b981, #3b82f6, #a855f7, #f43f5e)',
  fire: 'conic-gradient(#f59e0b, #ef4444, #f97316, #f59e0b)',
};

const RING: Partial<Record<FrameId, string>> = {
  emerald: 'ring-2 ring-accent shadow-[0_0_16px_rgba(16,185,129,0.5)]',
  gold: 'ring-2 ring-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.55)]',
  verified: 'ring-2 ring-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.5)]',
};

const BADGE: Partial<Record<FrameId, { e: string; bg: string }>> = {
  gold: { e: '👑', bg: 'bg-amber-400' },
  verified: { e: '✓', bg: 'bg-sky-500' },
  fire: { e: '🔥', bg: 'bg-orange-500' },
};

export function FramedAvatar({
  src, frame = 'none', size = 56, rounded = 'rounded-2xl', className = '',
}: { src?: string; frame?: FrameId; size?: number; rounded?: string; className?: string }) {
  const conic = CONIC[frame];
  const ring = RING[frame] || '';
  const badge = BADGE[frame];

  const inner = (
    <div className={`${rounded} overflow-hidden bg-surface-2 flex items-center justify-center w-full h-full`}>
      {src && src.startsWith('http')
        ? <img src={src} className="w-full h-full object-cover" alt="" />
        : <span style={{ fontSize: size * 0.45 }}>{src || '👤'}</span>}
    </div>
  );

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      {conic ? (
        <>
          {/* Aro de color girando (el centro queda tapado por el avatar) */}
          <motion.div
            className={`absolute inset-0 ${rounded}`}
            style={{ background: conic, filter: 'saturate(1.3)' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-[3px]">{inner}</div>
        </>
      ) : (
        <div className={`${rounded} w-full h-full ${ring}`}>{inner}</div>
      )}
      {badge && (
        <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${badge.bg} rounded-full flex items-center justify-center text-[10px] font-black text-white border-2 border-app shadow-lg z-10`}>
          {badge.e}
        </div>
      )}
    </div>
  );
}
