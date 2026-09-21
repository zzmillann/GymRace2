'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Timer } from 'lucide-react';

/** Tiempo que queda hasta medianoche, que es cuando se reinicia el día. */
function timeToMidnight() {
  const now = new Date();
  const nextMidnight = new Date();
  nextMidnight.setHours(24, 0, 0, 0);
  const diff = nextMidnight.getTime() - now.getTime();
  return {
    h: Math.floor((diff / (1000 * 60 * 60)) % 24),
    m: Math.floor((diff / 1000 / 60) % 60),
    s: Math.floor((diff / 1000) % 60),
  };
}

export function CountdownTimer() {
  // Calculado ya en el primer render: al entrar está puesto, sin aparecer
  // después ni animarse. Solo se pinta en cliente (la home espera a `mounted`).
  const [timeLeft, setTimeLeft] = useState(timeToMidnight);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(timeToMidnight()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    // Sin caja ni borde: forma parte del fondo de la pantalla.
    <div className="flex items-center gap-3 px-1">
      <div className="flex items-center gap-2">
        {/* respiración suave en vez del parpadeo de animate-pulse */}
        <motion.span
          className="flex text-accent"
          animate={{ opacity: [1, 0.45, 1] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
        >
          <Timer size={14} />
        </motion.span>
        <span className="text-[10px] font-medium text-muted tracking-tight whitespace-nowrap">Siguiente Check-in</span>
      </div>
      <div className="flex gap-1.5 font-medium text-xs">
        <span className="text-content tabular-nums">{timeLeft.h.toString().padStart(2, '0')}h</span>
        <span className="text-muted">:</span>
        <span className="text-content tabular-nums">{timeLeft.m.toString().padStart(2, '0')}m</span>
        <span className="text-muted">:</span>
        <span className="text-content tabular-nums">{timeLeft.s.toString().padStart(2, '0')}s</span>
      </div>
    </div>
  );
}
