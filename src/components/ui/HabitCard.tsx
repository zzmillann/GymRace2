'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Fire24Filled, 
  CheckmarkCircle24Filled, 
  Circle24Regular 
} from '@fluentui/react-icons';
import { format, subDays } from 'date-fns';
import { useMemo } from 'react';
import { Badge } from './Badge';
import { useAppStore } from '@/store/useHabitStore';

interface HabitCardProps {
  id: string;
  title: string;
  streak: number;
  colorTheme: string;
  history: Record<string, boolean>;
  onClick?: () => void;
  onToggleToday?: () => void;
}

const colors: Record<string, { bg: string; text: string; gridActive: string }> = {
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    gridActive: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-500',
    gridActive: 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]',
  },
  rose: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-500',
    gridActive: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    gridActive: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
  },
  sky: {
    bg: 'bg-sky-500/10',
    text: 'text-sky-500',
    gridActive: 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]',
  }
};

export function HabitCard({ id, title, streak, colorTheme, history, onClick, onToggleToday }: HabitCardProps) {
  const { habits } = useAppStore();
  const habit = habits.find(h => h.id === id);
  const theme = colors[colorTheme] || colors.emerald;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isCompletedToday = history[todayStr] === true;

  const participants = habit?.participants || [];
  const isShared = participants.length > 1;

  // ... last28Days useMemo ...

  // Compute last 28 days boolean array based on history
  const last28Days = useMemo(() => {
    const days: boolean[] = [];
    for (let i = 27; i >= 0; i--) {
      const dateStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
      days.push(history[dateStr] === true);
    }
    return days;
  }, [history]);

  const totalCompletions = useMemo(() => Object.values(history).filter(v => v).length, [history]);

  return (
    <div className="relative w-full">
      <motion.div
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.97 }}
        onTap={onClick}
        className="w-full text-left bg-neutral-900 border border-neutral-800 rounded-[32px] p-6 flex flex-col gap-5 relative overflow-hidden group cursor-pointer shadow-xl active:bg-neutral-800/80 transition-colors"
      >
        <div className={`absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full blur-3xl opacity-20 ${theme.bg}`} />

        <div className="flex justify-between items-start z-10 pr-12">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-2xl font-black tracking-tight text-white">{title}</h3>
                {isShared && (
                  <motion.div 
                    animate={{ x: [0, 2, 0] }} transition={{ repeat: Infinity, duration: 2 }}
                    className="p-1 px-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg text-[8px] font-black uppercase text-black tracking-widest shadow-lg"
                  >
                    Competición
                  </motion.div>
                )}
            </div>
            <div className="flex items-center gap-2">
                <Badge level={totalCompletions} />
                {isShared && (
                    <div className="flex -space-x-2 ml-2">
                        {participants.map((p, i) => (
                            <motion.div 
                              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}
                              key={p.id} className="w-8 h-8 rounded-xl border-2 border-neutral-950 bg-neutral-800 flex items-center justify-center text-[10px] overflow-hidden shadow-xl"
                            >
                                {p.avatar.startsWith('http') ? <img src={p.avatar} className="w-full h-full object-cover" /> : p.avatar}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-2xl ${theme.bg} ${theme.text} border border-white/5 shadow-inner`}>
            <Fire24Filled className="animate-pulse" />
            <span className="font-black text-lg">{streak}</span>
          </div>
        </div>

        <div className="flex gap-1.5 z-10 mt-2">
          {last28Days.map((completed, i) => (
            <div
              key={i}
              className={`w-2 h-6 rounded-sm transition-colors duration-300 flex-1 max-w-[8px] ${
                completed ? theme.gridActive : 'bg-neutral-800'
              }`}
            />
          ))}
        </div>
      </motion.div>

      {/* Botón flotante para marcar el día de hoy, separado del onClick de la tarjeta */}
      <motion.button 
        whileTap={{ scale: 1.4 }}
        onClick={(e) => {
          e.stopPropagation();
          onToggleToday?.();
        }}
        className="absolute top-5 right-5 z-20 focus:outline-none"
      >
        <AnimatePresence mode="wait">
          {isCompletedToday ? (
            <motion.div
              key="checked"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 45 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
            >
              <CheckmarkCircle24Filled className={theme.text} style={{ fontSize: 42 }} />
            </motion.div>
          ) : (
            <motion.div
              key="unchecked"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            >
              <Circle24Regular className="text-neutral-700 hover:text-neutral-500 transition-colors" style={{ fontSize: 42 }} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
