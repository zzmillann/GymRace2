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
    <div className="flex items-center gap-2 bg-neutral-900/50 border border-neutral-800 rounded-2xl px-4 py-2 backdrop-blur-sm">
      <Timer size={16} className="text-neutral-500 animate-pulse" />
      <div className="flex gap-1 font-mono text-sm">
        <span className="text-white tabular-nums">{timeLeft.h.toString().padStart(2, '0')}</span>
        <span className="text-neutral-600">:</span>
        <span className="text-white tabular-nums">{timeLeft.m.toString().padStart(2, '0')}</span>
        <span className="text-neutral-600">:</span>
        <span className="text-white tabular-nums">{timeLeft.s.toString().padStart(2, '0')}</span>
      </div>
    </div>
  );
}
