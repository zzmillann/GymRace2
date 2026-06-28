'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { useAppStore } from '@/store/useHabitStore';

export function Wrapped({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { habits, exercises, userId, userName, getUserDetails, settings } = useAppStore();
  const [slide, setSlide] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [total, setTotal] = useState(0);

  const monthName = new Date().toLocaleDateString(settings.language === 'en' ? 'en-US' : 'es-ES', { month: 'long' });

  // --- Datos del mes ---
  const stats = useMemo(() => {
    const now = new Date();
    const ym = format(now, 'yyyy-MM');
    let monthCompletions = 0;
    const activeDays = new Set<string>();
    let bestStreak = 0;
    habits.forEach((h) => {
      bestStreak = Math.max(bestStreak, h.maxStreak || 0, h.streak || 0);
      Object.entries(h.history || {}).forEach(([date, done]) => {
        if (done && date.startsWith(ym)) { monthCompletions++; activeDays.add(date); }
      });
    });
    // Récord de peso más alto
    let topEx = { name: '', weight: 0 };
    exercises.forEach((e) => {
      const w = e.weightHistory[e.weightHistory.length - 1] || 0;
      if (w > topEx.weight) topEx = { name: e.name, weight: w };
    });
    const unit = settings.weightUnit;
    const topWeight = unit === 'lb' ? Math.round(topEx.weight * 2.20462) : Math.round(topEx.weight);

    // Día más fuerte de la semana (últimos 30 días)
    const dow = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 30; i++) {
      const d = subDays(now, i);
      const ds = format(d, 'yyyy-MM-dd');
      const any = habits.some((h) => h.history?.[ds]);
      if (any) dow[d.getDay()]++;
    }
    const bestDow = dow.indexOf(Math.max(...dow));
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    return { monthCompletions, activeDays: activeDays.size, bestStreak, topEx, topWeight, unit, bestDay: days[bestDow] };
  }, [habits, exercises, settings]);

  useEffect(() => {
    if (isOpen) {
      setSlide(0);
      if (userId) getUserDetails(userId).then((d) => { if (d) { setRank(d.rank); setTotal(d.totalCompletions); } });
    }
  }, [isOpen, userId, getUserDetails]);

  const slides = [
    {
      bg: 'from-violet-600 via-fuchsia-600 to-rose-500',
      content: (
        <>
          <p className="text-white/70 font-black uppercase tracking-[0.3em] text-xs mb-3">Tu mes en</p>
          <h1 className="text-6xl font-black text-white italic uppercase tracking-tighter mb-4">GymRace</h1>
          <p className="text-white font-black uppercase tracking-widest text-lg capitalize">{monthName}</p>
          <p className="text-white/70 font-bold text-sm mt-8">Toca para ver tu resumen 👉</p>
        </>
      ),
    },
    {
      bg: 'from-emerald-500 via-teal-600 to-cyan-600',
      content: (
        <>
          <p className="text-white/80 font-black uppercase tracking-widest text-xs mb-4">Este mes completaste</p>
          <motion.h1 initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-8xl font-black text-white italic tracking-tighter">{stats.monthCompletions}</motion.h1>
          <p className="text-white font-black uppercase tracking-widest text-xl mt-2">actividades 💪</p>
          <p className="text-white/70 font-bold text-sm mt-6">en {stats.activeDays} días activos</p>
        </>
      ),
    },
    {
      bg: 'from-orange-500 via-red-500 to-rose-600',
      content: (
        <>
          <p className="text-white/80 font-black uppercase tracking-widest text-xs mb-4">Tu mejor racha</p>
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="text-7xl mb-2">🔥</motion.div>
          <h1 className="text-8xl font-black text-white italic tracking-tighter">{stats.bestStreak}</h1>
          <p className="text-white font-black uppercase tracking-widest text-xl mt-2">días seguidos</p>
        </>
      ),
    },
    {
      bg: 'from-amber-400 via-amber-500 to-yellow-600',
      content: (
        <>
          <p className="text-black/70 font-black uppercase tracking-widest text-xs mb-4">Tu puesto mundial</p>
          <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-7xl mb-2">🏆</motion.div>
          <h1 className="text-8xl font-black text-black italic tracking-tighter">#{rank ?? '—'}</h1>
          <p className="text-black/80 font-black uppercase tracking-widest text-sm mt-3">{total} éxitos totales</p>
        </>
      ),
    },
    {
      bg: 'from-sky-500 via-indigo-600 to-violet-700',
      content: (
        <>
          <p className="text-white/80 font-black uppercase tracking-widest text-xs mb-4">Tu mejor levantamiento</p>
          {stats.topEx.weight > 0 ? (
            <>
              <h1 className="text-7xl font-black text-white italic tracking-tighter">{stats.topWeight}<span className="text-3xl"> {stats.unit.toUpperCase()}</span></h1>
              <p className="text-white font-black uppercase tracking-widest text-lg mt-2">{stats.topEx.name}</p>
            </>
          ) : (
            <p className="text-white font-black uppercase tracking-widest text-lg">Aún sin récords 👀</p>
          )}
          <p className="text-white/70 font-bold text-sm mt-6">Tu mejor día: {stats.bestDay}</p>
        </>
      ),
    },
    {
      bg: 'from-neutral-900 via-neutral-800 to-black',
      content: (
        <>
          <p className="text-emerald-400 font-black uppercase tracking-[0.3em] text-xs mb-6">Resumen de {userName}</p>
          <div className="space-y-3 text-left w-full max-w-[240px]">
            <Row k="Actividades" v={`${stats.monthCompletions}`} />
            <Row k="Días activos" v={`${stats.activeDays}`} />
            <Row k="Mejor racha" v={`${stats.bestStreak} 🔥`} />
            <Row k="Top mundial" v={`#${rank ?? '—'}`} />
            {stats.topEx.weight > 0 && <Row k="Récord" v={`${stats.topWeight} ${stats.unit}`} />}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); shareWrapped(stats, rank, monthName); }}
            className="mt-8 bg-white text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
          >
            📤 Compartir
          </button>
        </>
      ),
    },
  ];

  const next = () => setSlide((s) => (s < slides.length - 1 ? s + 1 : (onClose(), s)));
  const prev = () => setSlide((s) => Math.max(0, s - 1));

  // Auto-avance
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => { if (slide < slides.length - 1) setSlide(slide + 1); }, 4200);
    return () => clearTimeout(id);
  }, [slide, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[800] bg-black flex items-center justify-center">
          <div className={`relative w-full h-full max-w-md mx-auto bg-gradient-to-br ${slides[slide].bg} flex flex-col`}>
            {/* Barras de progreso */}
            <div className="flex gap-1.5 p-4 pt-6 z-20">
              {slides.map((_, i) => (
                <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-white" initial={{ width: 0 }} animate={{ width: i < slide ? '100%' : i === slide ? '100%' : '0%' }} transition={{ duration: i === slide ? 4.2 : 0.2, ease: 'linear' }} />
                </div>
              ))}
            </div>
            <button onClick={onClose} className="absolute top-5 right-5 z-30 text-white/80 text-2xl font-bold">✕</button>

            {/* Zonas de toque */}
            <button className="absolute left-0 top-0 bottom-0 w-1/3 z-10" onClick={prev} aria-label="anterior" />
            <button className="absolute right-0 top-0 bottom-0 w-2/3 z-10" onClick={next} aria-label="siguiente" />

            {/* Contenido */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-10 z-0">
              <AnimatePresence mode="wait">
                <motion.div key={slide} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center">
                  {slides[slide].content}
                </motion.div>
              </AnimatePresence>
            </div>

            <p className="text-center text-white/40 text-[9px] font-black uppercase tracking-[0.4em] italic pb-6 z-0">GymRace Wrapped</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between items-center border-b border-white/10 pb-2">
      <span className="text-white/60 font-bold text-sm">{k}</span>
      <span className="text-white font-black text-lg">{v}</span>
    </div>
  );
}

function shareWrapped(stats: any, rank: number | null, month: string) {
  const text = `Mi mes en GymRace (${month}): ${stats.monthCompletions} actividades, mejor racha ${stats.bestStreak} 🔥, Top mundial #${rank ?? '—'}. 💪`;
  if (typeof navigator !== 'undefined' && (navigator as any).share) {
    (navigator as any).share({ title: 'GymRace Wrapped', text }).catch(() => {});
  } else if (typeof navigator !== 'undefined') {
    navigator.clipboard?.writeText(text);
  }
}
