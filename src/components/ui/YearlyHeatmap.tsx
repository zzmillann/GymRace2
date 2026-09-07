'use client';

import { motion } from 'framer-motion';
import { format, addDays, eachMonthOfInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo, useEffect, useRef } from 'react';

// Ancho del canalón izquierdo donde van las iniciales de los días
const DAY_GUTTER = 16;
// Paso real de columna: celda de 1rem + gap de 0.375rem = 22px
const COL_W = 22;

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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  
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

  // Columna donde cae hoy, para centrar ahí el scroll al abrir
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayCol = useMemo(() => {
    // Ojo: copiamos las fechas, setHours() muta el objeto original y startAt
    // alimenta también el grid, las iniciales y los meses.
    const from = new Date(startAt); from.setHours(0, 0, 0, 0);
    const to = new Date(); to.setHours(0, 0, 0, 0);
    const diff = Math.floor((to.getTime() - from.getTime()) / 86400000);
    return Math.max(0, Math.min(51, Math.floor(diff / 7)));
  }, [startAt]);

  // Al montar, desplazamos el calendario para dejar el día de hoy centrado:
  // el ciclo empieza en la fecha de creación, así que si no, siempre veías el
  // primer mes y hoy quedaba fuera de la vista.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = DAY_GUTTER + todayCol * COL_W + COL_W / 2 - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, target);
  }, [todayCol]);

  // Iniciales del día de la semana para cada fila (L M X J V S D).
  // Como el grid avanza de 7 en 7, la fila r cae siempre en el mismo día,
  // así que basta mirar los 7 primeros días desde el inicio del ciclo.
  const dayLabels = useMemo(
    () => Array.from({ length: 7 }, (_, r) =>
      format(addDays(startAt, r), 'EEEEE', { locale: es }).toUpperCase()),
    [startAt],
  );

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
      
      <h4 className="mb-8 flex justify-between items-center px-1">
        <span className="text-[11px] font-medium text-muted tracking-tight">Ciclo de 365 días</span>
        <div className="flex gap-2 items-center">
            <span className="text-muted/70 text-[11px] font-normal">Libre</span>
            <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-[3px] bg-surface-2" />
                <div className={`w-2.5 h-2.5 rounded-[3px] ${activeBg} opacity-40`} />
                <div className={`w-2.5 h-2.5 rounded-[3px] ${activeBg}`} />
            </div>
            <span className="text-muted/70 text-[11px] font-normal">Logrado</span>
        </div>
      </h4>
      
      <div ref={scrollRef} className="overflow-x-auto pb-4 hide-scrollbar touch-pan-x container-mask">
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
            {/* Meses. El paso real de columna es 1.375rem (celda 1rem + gap 0.375rem);
                antes se usaba 1.5rem y las etiquetas se iban desplazando a la derecha. */}
            <div className="flex mb-3 h-4 relative" style={{ marginLeft: DAY_GUTTER }}>
                {monthLabels.map((m, i) => (
                    <span key={i} className="absolute text-[11px] font-medium text-muted" style={{ left: `${m.col * 1.375}rem` }}>
                        {m.name}
                    </span>
                ))}
            </div>

            <div className="flex gap-1.5 w-max pr-6 mt-2">
                {/* Iniciales de los días, fijas al hacer scroll horizontal */}
                <div
                    className="flex flex-col gap-1.5 sticky left-0 z-10"
                    style={{ width: DAY_GUTTER }}
                >
                    {dayLabels.map((d, i) => (
                        <span key={i} className="h-4 flex items-center justify-start text-[11px] font-medium text-muted leading-none">
                            {d}
                        </span>
                    ))}
                </div>

                {/* Celdas sin animación propia: 364 motion.div con delays
                    escalonados hacían que abrir el hábito tardase casi un
                    segundo. Ahora entra el bloque entero de una vez. */}
                {heatmapGrid.map((week, weekIdx) => (
                    <div key={weekIdx} className="flex flex-col gap-1.5 w-4">
                    {week.map((dateStr) => (
                        <div
                            key={dateStr}
                            title={dateStr}
                            className={`w-4 h-4 rounded-[4px] transition-colors duration-300 ${
                                data[dateStr] ? activeBg : 'bg-surface-2/40 hover:bg-surface-2/60'
                            } ${dateStr === todayStr ? 'ring-2 ring-white/70 ring-offset-1 ring-offset-surface' : ''}`}
                        />
                    ))}
                    </div>
                ))}
            </div>
        </motion.div>
      </div>
      
      <div className="flex justify-between text-[11px] font-normal text-muted/70 tracking-tight mt-6 border-t border-line/10/50 pt-4 px-1">
        <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span>Inicio · {format(startAt, "d 'de' MMM yyyy", { locale: es })}</span>
        </div>
        <div className="flex items-center gap-2">
            <span>Meta anual</span>
            <div className="w-1.5 h-1.5 rounded-full bg-surface-2" />
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
