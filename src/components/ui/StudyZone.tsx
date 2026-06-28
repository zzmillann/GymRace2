'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useHabitStore';
import { haptic, playDing, confettiBurst } from '@/lib/feedback';

const PRESETS = [15, 25, 45, 50];
const R = 54;
const C = 2 * Math.PI * R;

const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function StudyZone() {
  const { getStudyStats, getStudyRanking, logStudy, userId } = useAppStore();
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });
  const [mins, setMins] = useState(25);
  const [focus, setFocus] = useState(false);
  const [total, setTotal] = useState(0);
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [rankOpen, setRankOpen] = useState(false);
  const [ranking, setRanking] = useState<{ id: string; name: string; avatar: string; minutes: number }[]>([]);

  const reload = () => { if (userId) getStudyStats().then(setStats); };
  useEffect(() => { reload(); }, [userId]);

  // tick
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  // fin natural
  useEffect(() => {
    if (running && left === 0) { finish(true); }
  }, [left, running]);

  const startFocus = () => { setTotal(mins * 60); setLeft(mins * 60); setRunning(true); setFocus(true); };

  const finish = (completed: boolean) => {
    const studied = Math.round((total - left) / 60);
    setRunning(false);
    if (completed || studied >= 1) {
      const m = completed ? Math.round(total / 60) : studied;
      if (m >= 1) {
        logStudy(m).then(reload);
        confettiBurst();
        haptic([40, 60, 40]);
        playDing(880);
      }
    }
    setFocus(false);
    setLeft(0); setTotal(0);
  };

  const openRanking = async () => { setRankOpen(true); setRanking(await getStudyRanking()); };

  const progress = total ? left / total : 0;

  return (
    <div className="mb-8">
      {/* Tarjeta Pomodoro */}
      <div className="bg-gradient-to-br from-indigo-600/20 to-violet-600/10 border border-indigo-500/20 rounded-[32px] p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Sesión de estudio</p>
            <h3 className="text-2xl font-black text-content tracking-tighter italic uppercase">Pomodoro</h3>
          </div>
          <button onClick={openRanking} className="px-4 py-2 bg-surface-2 rounded-2xl text-content font-black uppercase text-[9px] tracking-widest active:scale-95 transition-all">🏆 Ranking</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <Stat label="Hoy" value={fmt(stats.today)} />
          <Stat label="Semana" value={fmt(stats.week)} />
          <Stat label="Mes" value={fmt(stats.month)} />
        </div>

        {/* Duración */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setMins(p)} className={`py-3 rounded-xl font-black text-sm transition-all ${mins === p ? 'bg-indigo-500 text-white' : 'bg-surface-2 text-muted'}`}>{p}m</button>
          ))}
        </div>

        <button onClick={startFocus} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-sm active:scale-[0.98] transition-transform">
          ▶ Empezar a estudiar
        </button>
      </div>

      {/* Modo concentración */}
      <AnimatePresence>
        {focus && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-gradient-to-br from-indigo-950 via-black to-violet-950 flex flex-col items-center justify-center p-8">
            <p className="text-indigo-300 font-black uppercase tracking-[0.3em] text-xs mb-8">Concéntrate 🧠</p>
            <div className="relative w-60 h-60 mb-10">
              <svg className="w-60 h-60 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeWidth="7" className="text-white/10" />
                <motion.circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" className="text-indigo-400" style={{ strokeDasharray: C }} animate={{ strokeDashoffset: C * (1 - progress) }} transition={{ duration: 0.5, ease: 'linear' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl font-black text-white tabular-nums tracking-tighter">{clock(left)}</span>
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mt-1">{running ? 'estudiando' : 'pausa'}</span>
              </div>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <button onClick={() => setLeft((l) => l + 300)} className="flex-1 bg-white/10 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">+5m</button>
              <button onClick={() => setRunning((r) => !r)} className="flex-1 bg-white text-black py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">{running ? 'Pausa' : 'Seguir'}</button>
              <button onClick={() => finish(false)} className="flex-1 bg-white/10 text-rose-400 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Terminar</button>
            </div>
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest mt-6 text-center">Al terminar se guardan tus minutos de estudio</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ranking de estudio */}
      <AnimatePresence>
        {rankOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-surface border border-line/10 w-full max-w-sm rounded-[40px] p-7 relative shadow-2xl max-h-[80vh] flex flex-col">
              <button onClick={() => setRankOpen(false)} className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center bg-surface-2 rounded-xl text-muted text-lg font-bold">✕</button>
              <div className="flex items-center gap-2 mb-1"><span className="text-xl">🏆</span><h2 className="text-lg font-black text-content uppercase tracking-tighter italic">Ranking de estudio</h2></div>
              <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-5">Esta semana</p>
              <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2">
                {ranking.map((r, i) => (
                  <div key={r.id} className={`flex items-center gap-3 rounded-2xl p-3 border ${i === 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-black/30 border-line/5'}`}>
                    <span className={`text-sm font-black w-5 ${i === 0 ? 'text-amber-500' : 'text-muted'}`}>{i + 1}</span>
                    <div className="w-9 h-9 rounded-xl bg-surface-2 overflow-hidden flex items-center justify-center text-sm">
                      {r.avatar?.startsWith('http') ? <img src={r.avatar} className="w-full h-full object-cover" /> : r.avatar}
                    </div>
                    <span className="font-black text-content text-sm flex-1 truncate">{r.name}</span>
                    <span className="font-black text-indigo-400 text-sm">{fmt(r.minutes)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/30 rounded-2xl p-3 text-center border border-line/5">
      <p className="text-lg font-black text-content tabular-nums">{value}</p>
      <p className="text-[8px] font-black text-muted uppercase tracking-widest">{label}</p>
    </div>
  );
}
