'use client';

import { motion } from 'framer-motion';
import { format, addDays, eachMonthOfInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo } from 'react';

interface YearlyHeatmapProps {
  data: Record<string, boolean>;
  colorTheme: string;
  startDate?: string; // ISO date string '2024-04-08'
}

export function YearlyHeatmap({ data, colorTheme, startDate }: YearlyHeatmapProps) {
  const activeColorFn = (theme: string) => {
    const map: Record<string, string> = {
      emerald: 'bg-accent shadow-[0_0_12px_rgba(16,185,129,0.4)]',
      indigo: 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]',
      rose: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]',
      amber: 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]',
      sky: 'bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.4)]',
    };
    return map[theme] || 'bg-accent shadow-[0_0_12px_rgba(16,185,129,0.4)]';
  };

  const activeBg = activeColorFn(colorTheme);
  
  const startAt = useMemo(() => {
    return startDate ? parseISO(startDate) : new Date();
  }, [startDate]);

  // Grid layout: 52 columns x 7 rows (forward from startDate)
  const heatmapGrid = useMemo(() => {
    const grid: string[][] = [];
    for (let c = 0; c < 52; c++) {
      const column: string[] = [];
      for (let r = 0; r < 7; r++) {
        const offset = (c * 7) + r;
        const date = addDays(startAt, offset);
        column.push(format(date, 'yyyy-MM-dd'));
      }
      grid.push(column);
    }
    return grid;
  }, [startAt]);

  // Month labels starting from startDate
  const monthLabels = useMemo(() => {
    const labels = [];
    const endDate = addDays(startAt, 364);
    const months = eachMonthOfInterval({ start: startAt, end: endDate });
    
    for (const month of months) {
        const daysDiff = Math.floor((month.getTime() - startAt.getTime()) / (1000 * 60 * 60 * 24));
        const colIndex = Math.floor(daysDiff / 7);
        labels.push({ name: format(month, 'MMM', { locale: es }), col: colIndex });
    }
    return labels;
  }, [startAt]);

  return (
    <div className="w-full bg-surface/80 border border-line/10/50 rounded-[32px] p-6 mb-8 overflow-hidden relative shadow-2xl backdrop-blur-md">
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />
      
      <h4 className="text-[10px] font-black text-muted mb-8 tracking-[0.3em] uppercase flex justify-between items-center px-1">
        <span>Ciclo de 365 Días</span>
        <div className="flex gap-1.5 items-center">
            <span className="text-muted text-[8px]">LIBRE</span>
            <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-[3px] bg-surface-2" />
                <div className={`w-2.5 h-2.5 rounded-[3px] ${activeBg} opacity-40`} />
                <div className={`w-2.5 h-2.5 rounded-[3px] ${activeBg}`} />
            </div>
            <span className="text-muted text-[8px]">LOGRADO</span>
        </div>
      </h4>
      
      <div className="overflow-x-auto pb-4 hide-scrollbar touch-pan-x container-mask">
        <div className="relative">
            <div className="flex mb-3 h-4 relative">
                {monthLabels.map((m, i) => (
                    <span key={i} className="absolute text-[9px] font-bold text-muted uppercase" style={{ left: `${m.col * 1.5}rem` }}>
                        {m.name}
                    </span>
                ))}
            </div>

            <div className="flex gap-1.5 w-max pr-6 mt-2">
                {heatmapGrid.map((week, weekIdx) => (
                    <div key={weekIdx} className="flex flex-col gap-1.5 w-4">
                    {week.map((dateStr, dayIdx) => (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: (weekIdx * 0.005) + (dayIdx * 0.01) }}
                            key={dateStr}
                            className={`w-4 h-4 rounded-[4px] transition-all duration-700 ${
                                data[dateStr] ? activeBg : 'bg-surface-2/40 hover:bg-surface-2/60'
                            }`}
                        />
                    ))}
                    </div>
                ))}
            </div>
        </div>
      </div>
      
      <div className="flex justify-between text-[9px] font-black text-muted uppercase tracking-[0.2em] mt-6 border-t border-line/10/50 pt-4 px-1">
        <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
            <span>Inicio ({format(startAt, 'dd MMM yy', { locale: es })})</span>
        </div>
        <div className="flex items-center gap-2">
            <span>Meta Anual</span>
            <div className="w-1 h-1 rounded-full bg-surface-2" />
        </div>
      </div>

      <style jsx>{`
        .container-mask {
            mask-image: linear-gradient(to right, black 85%, transparent 100%);
        }
      `}</style>
    </div>
  );
}
