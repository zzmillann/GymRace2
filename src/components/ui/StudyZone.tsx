'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play24Filled, Pause24Filled, Stop24Filled } from '@fluentui/react-icons';
import { useAppStore } from '@/store/useHabitStore';
import { haptic, playDing, confettiBurst } from '@/lib/feedback';

/**
 * Burbujas de la lámpara de lava del modo concentración.
 * Suben y bajan a ritmos distintos para que nunca se repita el patrón;
 * los colores son los mismos índigo/violeta/cian de la sección de estudio.
 */
const LAVA = [
  { size: '46vw', left: '-8vw',  from: '78vh', to: '-18vh', drift: '6vw',  dur: 26, delay: 0,   color: 'rgba(99,102,241,0.55)' },
  { size: '38vw', left: '22vw',  from: '96vh', to: '-12vh', drift: '-5vw', dur: 34, delay: 3,   color: 'rgba(168,85,247,0.50)' },
  { size: '52vw', left: '52vw',  from: '88vh', to: '-22vh', drift: '4vw',  dur: 30, delay: 7,   color: 'rgba(56,189,248,0.42)' },
  { size: '30vw', left: '76vw',  from: '70vh', to: '-10vh', drift: '-7vw', dur: 22, delay: 1.5, color: 'rgba(217,70,239,0.45)' },
  { size: '42vw', left: '8vw',   from: '-16vh', to: '84vh', drift: '5vw',  dur: 38, delay: 5,   color: 'rgba(79,70,229,0.48)' },
  { size: '34vw', left: '60vw',  from: '-14vh', to: '92vh', drift: '-4vw', dur: 29, delay: 9,   color: 'rgba(129,140,248,0.44)' },
];

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
        if (useAppStore.getState().settings.confetti !== false) confettiBurst('sky');
        haptic([40, 60, 40]);
        playDing(880);
      }
    }
    setFocus(false);
    setLeft(0); setTotal(0);
  };

  // Se precarga al entrar en la sección: antes se pedía al pulsar y el modal
  // salía vacío el primer par de segundos.
  useEffect(() => {
    if (userId) getStudyRanking().then(setRanking).catch(() => {});
  }, [userId]);

  const openRanking = async () => {
    setRankOpen(true);
    const r = await getStudyRanking();
    setRanking(r);
  };

  const progress = total ? left / total : 0;

  return (
    <div className="mb-8">
      {/* Tarjeta Pomodoro */}
      {/* Sin fondo ni borde: el recuadro cortaba la sección. El color queda
          en un resplandor difuminado que no dibuja bordes. */}
      <div className="relative rounded-[32px] px-1 py-2">
        <div className="absolute -top-6 -left-10 w-56 h-56 rounded-full bg-indigo-600/15 blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-10 -right-8 w-52 h-52 rounded-full bg-violet-600/10 blur-[90px] pointer-events-none" />
        <div className="relative">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-medium text-indigo-300 tracking-tight">Sesión de estudio</p>
            <h3 className="text-2xl font-semibold text-content tracking-tight">Pomodoro</h3>
          </div>
          <button onClick={openRanking} className="px-4 py-2 bg-surface-2 rounded-2xl text-content font-medium text-[11px] tracking-tight active:scale-95 transition-all">Ranking</button>
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
            <button key={p} onClick={() => setMins(p)} className={`py-3 rounded-xl font-medium text-sm transition-all ${mins === p ? 'bg-indigo-500 text-white' : 'bg-surface-2 text-muted'}`}>{p}m</button>
          ))}
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={startFocus}
            className="inline-flex items-center bg-sky-400/15 text-sky-300 border border-sky-400/25 hover:bg-sky-400/25 px-6 py-3 rounded-2xl font-medium tracking-tight text-sm active:scale-95 transition-all"
          >
            Empezar a estudiar
          </button>
        </div>
        </div>
      </div>

      {/* Modo concentración */}
      <AnimatePresence>
        {focus && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-[#07060f] flex flex-col items-center justify-center p-8 overflow-hidden">
            {/* Lámpara de lava: burbujas que suben, bajan y se deforman. El
                filtro 'goo' las funde cuando se acercan, que es lo que da el
                efecto de lava en vez de círculos sueltos. */}
            <svg className="absolute w-0 h-0" aria-hidden>
              <defs>
                <filter id="lava-goo">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="26" result="b" />
                  <feColorMatrix
                    in="b"
                    mode="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
                  />
                </filter>
              </defs>
            </svg>

            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none overflow-hidden"
              style={{ filter: 'url(#lava-goo) blur(22px)' }}
            >
              {LAVA.map((b, i) => (
                <motion.span
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: b.size, height: b.size, left: b.left, background: b.color,
                  }}
                  initial={{ y: b.from }}
                  animate={{
                    y: [b.from, b.to, b.from],
                    x: [0, b.drift, 0],
                    scaleX: [1, 1.18, 0.9, 1],
                    scaleY: [1, 0.86, 1.14, 1],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: b.dur,
                    delay: b.delay,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>

            <div className="relative z-10 flex flex-col items-center w-full">
              <p className="text-indigo-200/70 font-normal tracking-tight text-[11px] mb-10">Concéntrate</p>

              <div className="relative w-[19rem] h-[19rem] mb-12">
                <svg className="w-[19rem] h-[19rem] -rotate-90 overflow-visible" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeWidth="6" className="text-white/10" />
                  <motion.circle
                    cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
                    className="text-indigo-300"
                    style={{ strokeDasharray: C, filter: 'drop-shadow(0 0 8px rgba(129,140,248,0.6))' }}
                    animate={{ strokeDashoffset: C * (1 - progress) }}
                    transition={{ duration: 0.5, ease: 'linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[5.5rem] leading-none font-semibold text-white tabular-nums tracking-tighter">{clock(left)}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setLeft((l) => l + 300)}
                  className="w-16 h-16 rounded-full bg-white/10 border border-white/10 text-white flex flex-col items-center justify-center font-medium text-xs active:scale-90 transition-transform"
                >
                  +5m
                </button>
                <button
                  onClick={() => setRunning((r) => !r)}
                  aria-label={running ? 'Pausar' : 'Seguir'}
                  className="w-24 h-24 rounded-full bg-white text-black flex items-center justify-center shadow-[0_8px_40px_rgba(255,255,255,0.25)] active:scale-95 transition-transform"
                >
                  {running
                    ? <Pause24Filled style={{ fontSize: 40 }} />
                    : <Play24Filled style={{ fontSize: 40 }} />}
                </button>
                <button
                  onClick={() => finish(false)}
                  aria-label="Terminar"
                  className="w-16 h-16 rounded-full bg-white/10 border border-white/10 text-rose-400 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <Stop24Filled style={{ fontSize: 26 }} />
                </button>
              </div>

              <p className="text-white/25 text-[11px] font-normal tracking-tight mt-8 text-center">Al terminar se guardan tus minutos de estudio</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ranking de estudio */}
      <AnimatePresence>
        {rankOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-start justify-center pt-16 p-4 bg-app/95 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-surface border border-line/10 w-full max-w-sm rounded-[40px] p-7 relative shadow-2xl max-h-[80vh] flex flex-col">
              <button onClick={() => setRankOpen(false)} className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center bg-surface-2 rounded-xl text-muted text-lg font-medium">✕</button>
              <div className="flex items-center gap-2 mb-1"><h2 className="text-lg font-medium text-content tracking-tight">Ranking de estudio</h2></div>
              <p className="text-[10px] font-medium text-muted tracking-tight mb-5">Esta semana</p>
              <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2">
                {ranking.map((r, i) => (
                  <div key={r.id} className={`flex items-center gap-3 rounded-2xl p-3 border ${i === 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-app/30 border-line/5'}`}>
                    <span className={`text-sm font-medium w-5 ${i === 0 ? 'text-amber-500' : 'text-muted'}`}>{i + 1}</span>
                    <div className="w-9 h-9 rounded-xl bg-surface-2 overflow-hidden flex items-center justify-center text-sm">
                      {r.avatar?.startsWith('http') ? <img src={r.avatar} className="w-full h-full object-cover" /> : r.avatar}
                    </div>
                    <span className="font-normal text-content text-sm flex-1 truncate">{r.name}</span>
                    <span className="font-medium text-indigo-400 text-sm">{fmt(r.minutes)}</span>
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
    <div className="bg-app/30 rounded-2xl p-3 text-center border border-line/5">
      <p className="text-lg font-medium text-content tabular-nums">{value}</p>
      <p className="text-[11px] font-medium text-muted tracking-tight">{label}</p>
    </div>
  );
}
