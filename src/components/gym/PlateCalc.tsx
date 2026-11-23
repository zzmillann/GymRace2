'use client';

// Calculadora de discos: qué poner a cada lado de la barra para llegar a un peso objetivo.
// Usa la barra y los discos del gimnasio activo. Los datos van en kg; se muestran en la unidad elegida.
import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useGymStore, activeGym } from '@/store/useGymStore';
import { useAppStore } from '@/store/useHabitStore';
import { fmtKg, plateMath, toKg } from '@/lib/gym/calc';

type BarEquip = 'barbell' | 'ez_bar' | 'trap_bar' | 'smith';

const BAR_NAMES: Record<BarEquip, string> = { barbell: 'Barra olímpica', ez_bar: 'Barra Z', trap_bar: 'Barra hexagonal', smith: 'Multipower' };

// Color de cada disco (aproximado al código de colores habitual)
const plateColor = (kg: number) => {
  if (kg >= 25) return '#e5484d';
  if (kg >= 20) return '#3e7bfa';
  if (kg >= 15) return '#f5c518';
  if (kg >= 10) return '#30a46c';
  if (kg >= 5) return '#e8e8ea';
  if (kg >= 2.5) return '#1f2126';
  return '#a0a0a8';
};

export function PlateCalc({ initialKg, equipment = 'barbell', onClose }: {
  initialKg?: number; equipment?: BarEquip; onClose: () => void;
}) {
  const unit = useAppStore((s) => s.settings.weightUnit);
  const gym = useGymStore((s) => activeGym(s));
  const [equip, setEquip] = useState<BarEquip>(equipment);
  const barKg = equip === 'ez_bar' ? gym.ezKg : equip === 'trap_bar' ? gym.trapKg : equip === 'smith' ? gym.smithKg : gym.barKg;
  const [text, setText] = useState(initialKg ? fmtKg(initialKg, unit) : fmtKg(barKg + 40, unit));
  const targetKg = toKg(parseFloat(text.replace(',', '.')) || 0, unit);
  const res = useMemo(() => plateMath(targetKg, barKg, gym.plates), [targetKg, barKg, gym.plates]);
  const maxPlate = Math.max(25, ...gym.plates);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-app p-4 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg text-content">Calculadora de discos</h2>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full bg-surface-2 p-1.5 text-muted"><X size={18} /></button>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {(Object.keys(BAR_NAMES) as BarEquip[]).map((k) => (
            <button key={k} className={`og-chip ${equip === k ? 'on' : ''}`} onClick={() => setEquip(k)}>{BAR_NAMES[k]}</button>
          ))}
        </div>

        <div className="og-group mb-4">
          <div className="og-row">
            <span className="flex-1 text-content">Peso objetivo</span>
            <input className="og-input og-num w-28 text-right" inputMode="decimal" value={text}
              onChange={(e) => setText(e.target.value)} onFocus={(e) => e.target.select()} />
            <span className="text-muted">{unit}</span>
          </div>
          <div className="og-row">
            <span className="flex-1 text-muted">{BAR_NAMES[equip]} ({gym.name})</span>
            <span className="og-num text-content">{fmtKg(barKg, unit)} {unit}</span>
          </div>
        </div>

        <div className="og-label">Por cada lado</div>
        <div className="og-card mb-3 flex min-h-[140px] items-center px-3 py-4">
          {/* manguito de la barra */}
          <div className="h-3 w-6 rounded-l bg-muted/50" />
          <div className="h-6 w-2 bg-muted/70" />
          <div className="flex items-center gap-[3px]">
            {res.perSide.map((p, i) => {
              const h = 40 + 80 * (p / maxPlate);
              const w = p >= 10 ? 16 : p >= 5 ? 12 : 9;
              return (
                <div key={i} title={`${fmtKg(p, unit)} ${unit}`} className="flex items-center justify-center rounded-[3px] text-[9px] font-bold"
                  style={{ height: h, width: w, background: plateColor(p), color: p >= 5 && p < 10 ? '#111' : '#fff', writingMode: 'vertical-rl' }}>
                  {fmtKg(p, unit)}
                </div>
              );
            })}
          </div>
          <div className="h-3 flex-1 rounded-r bg-muted/40" />
        </div>

        {res.perSide.length > 0 ? (
          <p className="og-num mb-2 text-sm text-content">
            {groupPlates(res.perSide).map(([p, n]) => `${n}×${fmtKg(p, unit)}`).join(' + ')} {unit} por lado
          </p>
        ) : (
          <p className="mb-2 text-sm text-muted">{targetKg <= barKg ? 'Solo la barra.' : 'No hay discos que encajen.'}</p>
        )}
        <p className="og-num text-sm text-muted">Total cargado: <span className="text-content">{fmtKg(res.achieved, unit)} {unit}</span></p>
        {Math.abs(res.rest) > 0.01 && (
          <p className="og-warn og-num mt-1 text-sm">
            {res.rest > 0 ? `Te faltan ${fmtKg(res.rest, unit)} ${unit}` : `Sobran ${fmtKg(-res.rest, unit)} ${unit} (la barra pesa más que el objetivo)`}
          </p>
        )}
      </div>
    </div>
  );
}

function groupPlates(list: number[]): [number, number][] {
  const m = new Map<number, number>();
  for (const p of list) m.set(p, (m.get(p) || 0) + 1);
  return Array.from(m.entries());
}
