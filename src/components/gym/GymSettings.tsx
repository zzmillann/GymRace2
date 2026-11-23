'use client';

// Ajustes del gimnasio: columna de esfuerzo (RIR / RPE), descanso automático, pantalla encendida, destello
// y gimnasios (barras, discos y mancuernas disponibles).
import { useEffect, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { activeGym, useGymStore } from '@/store/useGymStore';
import { useAppStore } from '@/store/useHabitStore';
import { fmtKg, toKg, uid } from '@/lib/gym/calc';
import type { GymPlaces, GymPrefs } from '@/lib/gym/types';

const STANDARD_PLATES = [50, 25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5];

const EFFORT_HELP: Record<GymPrefs['effort'], string> = {
  off: 'No se muestra ninguna columna de esfuerzo al registrar series.',
  rir: 'RIR = repeticiones en reserva: cuántas más podrías haber hecho (0 = al fallo, 3 = te sobraban tres).',
  rpe: 'RPE = esfuerzo percibido de 6 a 10 (10 = no podías hacer ni una más, 8 = te quedaban dos).',
};

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative shrink-0 w-[51px] h-[31px] rounded-full transition-colors ${on ? 'bg-[rgb(var(--accent))]' : 'bg-surface-2'}`}>
      <span className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

/** Campo numérico en la unidad del usuario; guarda en kg al salir. */
function WeightField({ kg, unit, onCommit, label }: { kg: number; unit: 'kg' | 'lb'; onCommit: (kg: number) => void; label: string }) {
  const [text, setText] = useState(fmtKg(kg, unit));
  useEffect(() => setText(fmtKg(kg, unit)), [kg, unit]);
  const commit = () => {
    const v = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(v) && v >= 0) onCommit(Math.round(toKg(v, unit) * 1000) / 1000); else setText(fmtKg(kg, unit));
  };
  return (
    <label className="og-row">
      <span className="flex-1 text-content text-[15px]">{label}</span>
      <input inputMode="decimal" className="og-input og-num !w-24 text-right" value={text}
        onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      <span className="text-muted text-sm w-5">{unit}</span>
    </label>
  );
}

function GymEditor({ gym, unit, canDelete, onDelete }: { gym: GymPlaces; unit: 'kg' | 'lb'; canDelete: boolean; onDelete: () => void }) {
  const saveGym = useGymStore((s) => s.saveGym);
  const [name, setName] = useState(gym.name);
  const [customPlate, setCustomPlate] = useState('');
  const [dbText, setDbText] = useState((gym.dumbbells || []).map((d) => fmtKg(d, unit)).join(', '));
  useEffect(() => setName(gym.name), [gym.name]);
  useEffect(() => setDbText((gym.dumbbells || []).map((d) => fmtKg(d, unit)).join(', ')), [gym.dumbbells, unit]);

  const patch = (p: Partial<GymPlaces>) => saveGym({ ...gym, ...p });
  const plateSet = new Set(gym.plates);
  const allPlates = Array.from(new Set(STANDARD_PLATES.concat(gym.plates))).sort((a, b) => b - a);
  const togglePlate = (p: number) => patch({ plates: plateSet.has(p) ? gym.plates.filter((x) => x !== p) : [...gym.plates, p].sort((a, b) => b - a) });
  const addPlate = () => {
    const v = parseFloat(customPlate.replace(',', '.'));
    if (!Number.isFinite(v) || v <= 0) return;
    const kg = Math.round(toKg(v, unit) * 1000) / 1000;
    if (!plateSet.has(kg)) patch({ plates: [...gym.plates, kg].sort((a, b) => b - a) });
    setCustomPlate('');
  };
  const commitDumbbells = () => {
    const list = dbText.split(/[;,\s]+/).map((x) => parseFloat(x.replace(',', '.'))).filter((x) => Number.isFinite(x) && x > 0)
      .map((x) => Math.round(toKg(x, unit) * 1000) / 1000);
    const uniq = Array.from(new Set(list)).sort((a, b) => a - b);
    patch({ dumbbells: uniq.length ? uniq : undefined });
  };

  return (
    <div className="og-group">
      <div className="og-row">
        <input className="og-input" value={name} aria-label="Nombre del gimnasio" placeholder="Nombre del gimnasio"
          onChange={(e) => setName(e.target.value)} onBlur={() => { const n = name.trim(); if (n && n !== gym.name) patch({ name: n }); else setName(gym.name); }} />
        {canDelete && (
          <button type="button" className="og-btn danger !px-3" aria-label="Borrar gimnasio"
            onClick={() => { if (window.confirm(`¿Borrar «${gym.name}»?`)) onDelete(); }}><Trash2 size={18} /></button>
        )}
      </div>
      <WeightField label="Barra olímpica" kg={gym.barKg} unit={unit} onCommit={(v) => patch({ barKg: v })} />
      <WeightField label="Barra Z" kg={gym.ezKg} unit={unit} onCommit={(v) => patch({ ezKg: v })} />
      <WeightField label="Barra hexagonal" kg={gym.trapKg} unit={unit} onCommit={(v) => patch({ trapKg: v })} />
      <WeightField label="Multipower" kg={gym.smithKg} unit={unit} onCommit={(v) => patch({ smithKg: v })} />
      <div className="px-3.5 py-3">
        <div className="text-content text-[15px] mb-1">Discos disponibles</div>
        <div className="text-muted text-xs mb-2">Toca para activar o quitar. Se usan en la calculadora de discos.</div>
        <div className="flex flex-wrap gap-1.5">
          {allPlates.map((p) => (
            <button key={p} type="button" className={`og-chip og-num !text-[13px] !py-1.5 !px-3 ${plateSet.has(p) ? 'on' : ''}`} onClick={() => togglePlate(p)}>
              {plateSet.has(p) && <Check size={12} />}{fmtKg(p, unit)}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2.5">
          <input inputMode="decimal" className="og-input og-num" placeholder={`Otro disco (${unit})`} value={customPlate}
            onChange={(e) => setCustomPlate(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addPlate(); }} />
          <button type="button" className="og-btn soft !px-3" onClick={addPlate} aria-label="Añadir disco"><Plus size={18} /></button>
        </div>
      </div>
      <div className="px-3.5 py-3">
        <div className="text-content text-[15px] mb-1">Mancuernas <span className="text-muted text-xs">(opcional)</span></div>
        <input inputMode="decimal" className="og-input og-num" placeholder={`p. ej. 2, 4, 6, 8, 10 (${unit})`} value={dbText}
          onChange={(e) => setDbText(e.target.value)} onBlur={commitDumbbells} />
      </div>
    </div>
  );
}

export function GymSettings() {
  const unit = useAppStore((s) => s.settings.weightUnit);
  const prefs = useGymStore((s) => s.prefs);
  const gyms = useGymStore((s) => s.gyms);
  const setPrefs = useGymStore((s) => s.setPrefs);
  const saveGym = useGymStore((s) => s.saveGym);
  const current = useGymStore(activeGym);

  const addGym = () => {
    const g: GymPlaces = { id: uid(), name: `Gimnasio ${gyms.length + 1}`, barKg: 20, ezKg: 10, trapKg: 25, smithKg: 15, plates: [25, 20, 15, 10, 5, 2.5, 1.25] };
    saveGym(g); setPrefs({ activeGym: g.id });
  };
  const deleteGym = (id: string) => {
    useGymStore.setState((s) => {
      if (s.gyms.length <= 1) return {};
      const gymsLeft = s.gyms.filter((g) => g.id !== id);
      return { gyms: gymsLeft, prefs: s.prefs.activeGym === id ? { ...s.prefs, activeGym: gymsLeft[0].id } : s.prefs };
    });
  };

  return (
    <div className="space-y-6">
      <section>
        <div className="og-label">Esfuerzo</div>
        <div className="og-card p-3.5">
          <div className="og-seg">
            {([['off', 'Desactivado'], ['rir', 'RIR'], ['rpe', 'RPE']] as const).map(([k, l]) => (
              <button key={k} type="button" className={prefs.effort === k ? 'on' : ''} onClick={() => setPrefs({ effort: k })}>{l}</button>
            ))}
          </div>
          <p className="text-xs text-muted mt-2.5">{EFFORT_HELP[prefs.effort]}</p>
        </div>
      </section>

      <section>
        <div className="og-label">Durante el entreno</div>
        <div className="og-group">
          {([
            ['autoRest', 'Descanso automático al marcar una serie', 'Arranca el temporizador de descanso al completar cada serie.'],
            ['keepAwake', 'Pantalla encendida mientras entrenas', 'Evita que el móvil se bloquee con un entreno en curso.'],
            ['flashOnRest', 'Destello al acabar el descanso', 'La pantalla parpadea: útil en gimnasios con música alta.'],
          ] as const).map(([k, label, hint]) => (
            <div key={k} className="og-row">
              <span className="flex-1 min-w-0"><span className="block text-content text-[15px]">{label}</span><span className="block text-muted text-xs">{hint}</span></span>
              <Switch on={!!prefs[k]} label={label} onChange={(v) => setPrefs({ [k]: v } as Partial<GymPrefs>)} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="og-label">Gimnasios</div>
        {gyms.length > 1 && (
          <div className="og-group mb-3">
            {gyms.map((g) => (
              <button key={g.id} type="button" className="og-row w-full text-left" onClick={() => setPrefs({ activeGym: g.id })}>
                <span className="flex-1 text-content text-[15px]">{g.name}</span>
                {current?.id === g.id && <Check size={18} className="text-accent" />}
              </button>
            ))}
          </div>
        )}
        {current && <GymEditor key={current.id} gym={current} unit={unit} canDelete={gyms.length > 1} onDelete={() => deleteGym(current.id)} />}
        <button type="button" className="og-btn soft w-full mt-3" onClick={addGym}><Plus size={18} />Añadir gimnasio</button>
        <p className="text-xs text-muted px-1.5 pt-2">El gimnasio marcado es el que se usa en la calculadora de discos.</p>
      </section>
    </div>
  );
}
