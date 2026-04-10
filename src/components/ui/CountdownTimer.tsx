'use client';

import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

export function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<{ h: number, m: number, s: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 0);

      const diff = nextMidnight.getTime() - now.getTime();

      setTimeLeft({
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / 1000 / 60) % 60),
        s: Math.floor((diff / 1000) % 60)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center gap-3 bg-neutral-900/50 border border-neutral-800 rounded-2xl px-5 py-2.5 backdrop-blur-sm shadow-xl">
      <div className="flex items-center gap-2">
        <Timer size={14} className="text-emerald-500 animate-pulse" />
        <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest whitespace-nowrap">Siguiente Check-in</span>
      </div>
      <div className="flex gap-1.5 font-black text-xs">
        <span className="text-white tabular-nums">{timeLeft.h.toString().padStart(2, '0')}h</span>
        <span className="text-neutral-700">:</span>
        <span className="text-white tabular-nums">{timeLeft.m.toString().padStart(2, '0')}m</span>
        <span className="text-neutral-700">:</span>
        <span className="text-white tabular-nums">{timeLeft.s.toString().padStart(2, '0')}s</span>
      </div>
    </div>
  );
}
