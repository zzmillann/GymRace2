'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckmarkCircle24Filled, 
  Circle24Regular 
} from '@fluentui/react-icons';
import { Flame } from '@/components/ui/Flame';
import { format, subDays } from 'date-fns';
import { useMemo } from 'react';
import { useAppStore } from '@/store/useHabitStore';
import { haptic, playDing, confettiBurst } from '@/lib/feedback';

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
  const { habits, settings } = useAppStore();
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
        className="w-full text-left rounded-[32px] p-6 flex flex-col gap-5 relative overflow-hidden group cursor-pointer transition-colors
                   bg-white/[0.07] backdrop-blur-2xl border border-white/[0.14]
                   shadow-[0_10px_36px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-1px_0_rgba(0,0,0,0.22)]
                   hover:bg-white/[0.10] active:bg-white/[0.12]"
      >
        {/* brillo superior, el reflejo típico del cristal */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <div className={`absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full blur-3xl opacity-30 ${theme.bg}`} />

        <div className="flex justify-between items-start z-10 pr-14">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display lowercase first-letter:uppercase text-2xl font-semibold tracking-tight text-content">{title}</h3>
                {isShared && (
                  <motion.div 
                    animate={{ x: [0, 2, 0] }} transition={{ repeat: Infinity, duration: 2 }}
                    className="p-1 px-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg text-[11px] font-medium text-black tracking-tight shadow-lg"
                  >
                    Competición
                  </motion.div>
                )}
            </div>
            <div className="flex items-center gap-2">
                {isShared && (
                    <div className="flex -space-x-2">
                        {participants.map((p, i) => (
                            <motion.div 
                              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}
                              key={p.id} className="w-8 h-8 rounded-full border-2 border-app bg-surface-2 flex items-center justify-center text-[10px] overflow-hidden shadow-xl"
                            >
                                {p.avatar.startsWith('http') ? <img src={p.avatar} className="w-full h-full object-cover" /> : p.avatar}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-2xl ${theme.bg} ${theme.text} border border-line/5 shadow-inner`}>
            <Flame size={20} />
            <span className="font-medium text-lg">{streak}</span>
          </div>
        </div>

        <div className="flex gap-1.5 z-10 mt-2">
          {last28Days.map((completed, i) => (
            <div
              key={i}
              className={`w-2 h-6 rounded-sm transition-colors duration-300 flex-1 max-w-[8px] ${
                completed ? theme.gridActive : 'bg-surface-2'
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
          // Feedback al marcar (solo al COMPLETAR, no al desmarcar)
          if (!isCompletedToday) {
            if (settings.confetti !== false) confettiBurst(colorTheme);
            if (settings.hapticFeedback) haptic([20, 30, 60]);
            if (settings.soundEffects) playDing();
          } else if (settings.hapticFeedback) {
            haptic(20);
          }
          onToggleToday?.();
        }}
        className="absolute top-5 right-5 z-20 focus:outline-none"
      >
        {/* Los dos estados se superponen y se cruzan a la vez. Con
            AnimatePresence mode="wait" había que esperar a que saliera uno
            para que entrara el otro: se veía cortado y lento, y al desmarcar
            el círculo vacío tardaba en volver. */}
        <span className="relative block" style={{ width: 54, height: 54 }}>
          <motion.span
            className="absolute inset-0 flex items-center justify-center text-muted"
            animate={{ opacity: isCompletedToday ? 0 : 1, scale: isCompletedToday ? 0.7 : 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <Circle24Regular style={{ fontSize: 54 }} />
          </motion.span>
          <motion.span
            className={`absolute inset-0 flex items-center justify-center ${theme.text}`}
            initial={false}
            animate={{
              opacity: isCompletedToday ? 1 : 0,
              scale: isCompletedToday ? 1 : 0.5,
              rotate: isCompletedToday ? 0 : -35,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 22, mass: 0.6 }}
          >
            <CheckmarkCircle24Filled style={{ fontSize: 54 }} />
          </motion.span>
        </span>
      </motion.button>
    </div>
  );
}
