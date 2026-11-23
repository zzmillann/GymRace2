'use client';

// Progreso del gimnasio: resumen (totales, semana, racha, mejores marcas, equilibrio), mapa de músculos,
// peso corporal con objetivo y tendencia, e historial editable (incluido registrar entrenos pasados).
import { useMemo, useState, type ReactNode } from 'react';
import { ChevronRight, Clock, Dumbbell, Flame, Plus, Search, Trash2, Trophy, X } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BodyMap } from './BodyMap';
import { CATALOG, byId, norm } from '@/lib/gym/catalog';
import { KG_TO_LB, bests, fmtKg, hoursSinceMuscle, iso, setsByMuscle, toKg, uid, workoutMinutes, workoutSets, workoutVolume } from '@/lib/gym/calc';
import { MUSCLES, WEEKLY_SETS_TARGET, equipmentName, muscleName } from '@/lib/gym/muscles';
import type { DoneSet, GymPrefs, MuscleId, Workout, WorkoutEntry } from '@/lib/gym/types';
import { useGymStore } from '@/store/useGymStore';
import { useAppStore } from '@/store/useHabitStore';

type Unit = 'kg' | 'lb';
const DAY = 86400000;
const nf = (n: number, d = 0) => n.toLocaleString('es-ES', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const signed = (n: number, d = 1) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${nf(Math.abs(n), d)}`;
const dateOnly = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00`);
const fmtDay = (d: string) => dateOnly(d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtShort = (d: string) => dateOnly(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const volIn = (kg: number, unit: Unit) => (unit === 'lb' ? kg * KG_TO_LB : kg);
function mondayOf(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
const tooltipStyle = { background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line) / .1)', borderRadius: 10, fontSize: 12 };
const axisTick = { fontSize: 10, fill: 'rgb(var(--muted))' };

type Section = 'resumen' | 'musculos' | 'peso' | 'historial';

export function ProgressView() {
  const [sec, setSec] = useState<Section>('resumen');
  return (
    <div className="space-y-4">
      <div className="og-seg">
        {([['resumen', 'Resumen'], ['musculos', 'Músculos'], ['peso', 'Peso'], ['historial', 'Historial']] as [Section, string][]).map(([k, l]) => (
          <button key={k} className={sec === k ? 'on' : ''} onClick={() => setSec(k)}>{l}</button>
        ))}
      </div>
      {sec === 'resumen' && <Summary />}
      {sec === 'musculos' && <Muscles />}
      {sec === 'peso' && <Weight />}
      {sec === 'historial' && <History />}
    </div>
  );
}

function Empty({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="og-card p-6 text-center">
      <div className="mx-auto mb-2 w-11 h-11 rounded-full bg-surface-2 text-accent flex items-center justify-center">{icon}</div>
      <div className="font-semibold text-content">{title}</div>
      <p className="text-sm text-muted mt-1">{text}</p>
    </div>
  );
}

// ───────────────────────── Resumen ─────────────────────────
const BALANCE: { id: string; name: string; target: number }[] = [
  { id: 'squat', name: 'Sentadilla', target: 1.3 },
  { id: 'deadlift', name: 'Peso muerto', target: 1.6 },
  { id: 'ohp', name: 'Press militar', target: 0.65 },
  { id: 'barbell_row', name: 'Remo con barra', target: 0.9 },
];

function Summary() {
  const history = useGymStore((s) => s.history);
  const custom = useGymStore((s) => s.customExercises);
  const bodyweights = useGymStore((s) => s.bodyweights);
  const unit = useAppStore((s) => s.settings.weightUnit);
  const bw = bodyweights.length ? bodyweights[bodyweights.length - 1].kg : 0;

  const data = useMemo(() => {
    const totalVol = history.reduce((a, w) => a + workoutVolume(w), 0);
    const thisMon = mondayOf(new Date());
    const lastMon = new Date(thisMon); lastMon.setDate(lastMon.getDate() - 7);
    const agg = (from: Date, to: Date) => {
      const ws = history.filter((w) => { const t = +new Date(w.date); return t >= +from && t < +to; });
      return { n: ws.length, sets: ws.reduce((a, w) => a + workoutSets(w), 0), vol: ws.reduce((a, w) => a + workoutVolume(w), 0) };
    };
    const tw = agg(thisMon, new Date(+thisMon + 7 * DAY + DAY));
    const lw = agg(lastMon, thisMon);
    // racha de semanas con al menos un entreno (si esta semana aún no hay, cuenta desde la anterior)
    const weeks = new Set(history.map((w) => iso(mondayOf(new Date(w.date)))));
    let streak = 0; const cur = new Date(thisMon);
    if (!weeks.has(iso(cur))) cur.setDate(cur.getDate() - 7);
    while (weeks.has(iso(cur))) { streak++; cur.setDate(cur.getDate() - 7); }
    // mejores marcas
    const ids = new Set<string>(); history.forEach((w) => w.entries.forEach((e) => ids.add(e.exId)));
    const top = Array.from(ids).map((id) => ({ id, ex: byId(id, custom), e: bests(history, id).e1rm }))
      .filter((x) => x.e > 0).sort((a, b) => b.e - a.e).slice(0, 6);
    const bench = bests(history, 'bench_press').e1rm;
    const balance = BALANCE.map((b) => ({ ...b, e: bests(history, b.id).e1rm })).map((b) => ({ ...b, ratio: bench ? b.e / bench : 0 }));
    return { totalVol, tw, lw, streak, top, bench, balance };
  }, [history, custom]);

  if (!history.length) return <Empty icon={<Dumbbell size={20} />} title="Aún no hay entrenos" text="Cuando termines tu primer entreno verás aquí tu resumen, tus récords y tu racha." />;

  const tons = unit === 'lb' ? `${nf((data.totalVol * KG_TO_LB) / 1000, 1)} mil lb` : `${nf(data.totalVol / 1000, 1)} toneladas`;
  return (
    <div className="space-y-4">
      <div className="og-card p-4">
        <div className="text-sm text-muted">{nf(history.length)} {history.length === 1 ? 'entreno' : 'entrenos'} en total</div>
        <div className="text-2xl font-bold text-content mt-1">Has levantado <span className="text-accent og-num">{tons}</span></div>
      </div>

      <div>
        <div className="og-label">Esta semana</div>
        <div className="grid grid-cols-3 gap-2">
          <Delta label="Sesiones" now={data.tw.n} prev={data.lw.n} fmt={(n) => nf(n)} />
          <Delta label="Series" now={data.tw.sets} prev={data.lw.sets} fmt={(n) => nf(n)} />
          <Delta label={`Volumen (${unit})`} now={volIn(data.tw.vol, unit)} prev={volIn(data.lw.vol, unit)} fmt={(n) => nf(n)} />
        </div>
      </div>

      <div className="og-card p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgb(255 159 10 / .14)' }}><Flame size={22} className="og-warn" /></div>
        <div>
          <div className="text-lg font-bold text-content og-num">{data.streak} {data.streak === 1 ? 'semana' : 'semanas'} seguidas</div>
          <div className="text-xs text-muted">{data.streak ? 'Entrenando al menos una vez por semana.' : 'Entrena esta semana para empezar la racha.'}</div>
        </div>
      </div>

      {data.top.length > 0 && (
        <div>
          <div className="og-label">Mejores marcas (1RM estimado)</div>
          <div className="og-group">
            {data.top.map((t) => (
              <div key={t.id} className="og-row">
                <Trophy size={16} className="og-warn shrink-0" />
                <div className="flex-1 min-w-0 truncate text-content">{t.ex?.name || t.id}</div>
                <div className="text-right">
                  <div className="font-semibold text-content og-num">{fmtKg(t.e, unit)} {unit}</div>
                  {bw > 0 && <div className="text-[11px] text-muted og-num">{Math.round((t.e / bw) * 100)} % de tu peso</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="og-label">Equilibrio de fuerza</div>
        <div className="og-card p-4">
          {data.bench ? (
            <>
              <p className="text-xs text-muted mb-3">Comparado con tu press banca ({fmtKg(data.bench, unit)} {unit}). Cerca del objetivo = fuerza compensada.</p>
              <div className="space-y-2.5">
                {data.balance.map((b) => {
                  const ok = b.ratio > 0 && Math.abs(b.ratio / b.target - 1) <= 0.12;
                  return (
                    <div key={b.id} className="flex items-center gap-3 text-sm">
                      <div className="flex-1 text-content">{b.name}</div>
                      {b.ratio > 0
                        ? <div className={`font-semibold og-num ${ok ? 'og-good' : 'og-warn'}`}>×{nf(b.ratio, 2)}</div>
                        : <div className="text-muted text-xs">sin datos</div>}
                      <div className="w-20 text-right text-xs text-muted og-num">objetivo ×{nf(b.target, 2)}</div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : <p className="text-sm text-muted">Registra press banca para comparar tus básicos (sentadilla, peso muerto, press militar y remo).</p>}
        </div>
      </div>
    </div>
  );
}

function Delta({ label, now, prev, fmt }: { label: string; now: number; prev: number; fmt: (n: number) => string }) {
  const diff = now - prev;
  return (
    <div className="og-card p-3">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-lg font-bold text-content og-num">{fmt(now)}</div>
      <div className={`text-[11px] og-num ${diff > 0 ? 'og-good' : diff < 0 ? 'og-bad' : 'text-muted'}`}>
        {diff > 0 ? '▲' : diff < 0 ? '▼' : '='} {diff ? fmt(Math.abs(diff)) : ''} <span className="text-muted">vs anterior</span>
      </div>
    </div>
  );
}

// ───────────────────────── Músculos ─────────────────────────
type MapMode = 'vol' | 'rec' | 'old';

function Muscles() {
  const history = useGymStore((s) => s.history);
  const custom = useGymStore((s) => s.customExercises);
  const [mode, setMode] = useState<MapMode>('vol');
  const [sel, setSel] = useState<MuscleId | null>(null);

  const { weekly, hours } = useMemo(() => ({
    weekly: setsByMuscle(history, iso(new Date(Date.now() - 7 * DAY)), custom),
    hours: hoursSinceMuscle(history, custom),
  }), [history, custom]);

  const values = useMemo(() => {
    const out: Partial<Record<MuscleId, number>> = {};
    for (const m of MUSCLES) {
      const h = hours[m.id];
      if (mode === 'vol') out[m.id] = weekly[m.id] || 0;
      else if (mode === 'rec') out[m.id] = h != null && h < 48 ? 48 - h : 0;
      else out[m.id] = h == null || h >= 168 ? 1 : 0;
    }
    return out;
  }, [mode, weekly, hours]);

  const color = mode === 'rec' ? 'var(--og-orange)' : mode === 'old' ? 'var(--og-blue)' : 'rgb(var(--accent))';
  const [lo, hi] = WEEKLY_SETS_TARGET;
  const hint = mode === 'vol' ? 'Series de los últimos 7 días (secundarios cuentan la mitad).'
    : mode === 'rec' ? 'Trabajados en las últimas 48 h: cuanto más intenso, más reciente.'
      : 'Sin trabajar desde hace 7 días o más.';
  const selText = sel && (() => {
    const h = hours[sel];
    const when = h == null ? 'nunca' : h < 24 ? `hace ${Math.round(h)} h` : `hace ${Math.round(h / 24)} d`;
    return `${muscleName(sel)}: ${nf(weekly[sel] || 0, 1)} series esta semana · último ${when}`;
  })();

  return (
    <div className="space-y-4">
      <div className="og-seg">
        <button className={mode === 'vol' ? 'on' : ''} onClick={() => setMode('vol')}>Volumen</button>
        <button className={mode === 'rec' ? 'on' : ''} onClick={() => setMode('rec')}>Recuperando</button>
        <button className={mode === 'old' ? 'on' : ''} onClick={() => setMode('old')}>Olvidados</button>
      </div>
      <div className="og-card p-4 flex flex-col items-center">
        <BodyMap values={values} color={color} size={220} label selected={sel} onPick={(m) => setSel(sel === m ? null : m)} />
        <p className="text-xs text-muted text-center mt-2">{hint}</p>
        {selText && <p className="text-sm text-content text-center mt-1">{selText}</p>}
      </div>

      {!history.length ? (
        <Empty icon={<Dumbbell size={20} />} title="Sin datos todavía" text="Entrena y verás qué músculos trabajas y cuáles se te olvidan." />
      ) : (
        <div>
          <div className="og-label">Series por semana (objetivo {lo}-{hi})</div>
          <div className="og-group">
            {MUSCLES.map((m) => {
              const v = weekly[m.id] || 0;
              const cls = v < lo ? 'warn' : v <= hi ? 'good' : 'info';
              const col = cls === 'warn' ? 'var(--og-orange)' : cls === 'good' ? 'var(--og-green)' : 'var(--og-blue)';
              const scale = Math.max(hi * 1.25, v);
              return (
                <div key={m.id} className="og-row" style={{ minHeight: 42, paddingTop: 8, paddingBottom: 8 }}>
                  <div className="w-28 shrink-0 text-sm text-content truncate">{m.name}</div>
                  <div className="flex-1 relative h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div className="absolute inset-y-0 border-x border-line/20" style={{ left: `${(lo / scale) * 100}%`, width: `${((hi - lo) / scale) * 100}%`, background: 'rgb(var(--line) / .05)' }} />
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, (v / scale) * 100)}%`, background: col }} />
                  </div>
                  <div className={`w-9 text-right text-sm font-semibold og-num og-${cls}`}>{nf(v, 1)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Peso ─────────────────────────
function weeklyRate(bws: { date: string; kg: number }[]) {
  const from = Date.now() - 28 * DAY;
  const pts = bws.map((b) => ({ x: +dateOnly(b.date) / DAY, y: b.kg })).filter((p) => p.x * DAY >= from);
  if (pts.length < 2 || pts[pts.length - 1].x - pts[0].x < 3) return null;
  const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length, my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  const num = pts.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0), den = pts.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  return den ? (num / den) * 7 : null;
}

function Weight() {
  const bodyweights = useGymStore((s) => s.bodyweights);
  const prefs = useGymStore((s) => s.prefs);
  const addBodyweight = useGymStore((s) => s.addBodyweight);
  const deleteBodyweight = useGymStore((s) => s.deleteBodyweight);
  const setPrefs = useGymStore((s) => s.setPrefs);
  const unit = useAppStore((s) => s.settings.weightUnit);
  const [val, setVal] = useState('');
  const [date, setDate] = useState(iso(new Date()));
  const [goal, setGoal] = useState(prefs.goalKg ? fmtKg(prefs.goalKg, unit) : '');

  const chart = useMemo(() => bodyweights.map((b) => ({ date: b.date, v: Number(fmtKg(b.kg, unit)) })), [bodyweights, unit]);
  const rate = useMemo(() => weeklyRate(bodyweights), [bodyweights]);
  const goalV = prefs.goalKg ? Number(fmtKg(prefs.goalKg, unit)) : undefined;
  const last = bodyweights[bodyweights.length - 1];

  const add = () => {
    const n = parseFloat(val.replace(',', '.'));
    if (!n || n <= 0) return;
    addBodyweight(Math.round(toKg(n, unit) * 100) / 100, date);
    setVal('');
  };
  const saveGoal = () => {
    const n = parseFloat(goal.replace(',', '.'));
    setPrefs({ goalKg: n > 0 ? Math.round(toKg(n, unit) * 100) / 100 : undefined });
  };
  const modes: [NonNullable<GymPrefs['goalMode']>, string][] = [['lose', 'Perder'], ['gain', 'Ganar'], ['hold', 'Mantener']];
  const rateTxt = rate == null ? null : `${signed(volIn(rate, unit), 1)} ${unit}/semana`;
  const rateGood = rate == null ? null : prefs.goalMode === 'lose' ? rate < 0 : prefs.goalMode === 'gain' ? rate > 0 : prefs.goalMode === 'hold' ? Math.abs(rate) < 0.25 : null;

  return (
    <div className="space-y-4">
      {bodyweights.length === 0 ? (
        <Empty icon={<Plus size={20} />} title="Apunta tu peso" text="Pésate por la mañana un par de veces por semana y verás tu tendencia." />
      ) : (
        <div className="og-card p-3">
          <div className="flex items-end justify-between px-1 mb-2">
            <div>
              <div className="text-xs text-muted">Último · {fmtShort(last.date)}</div>
              <div className="text-2xl font-bold text-content og-num">{fmtKg(last.kg, unit)} <span className="text-base text-muted font-medium">{unit}</span></div>
            </div>
            {rateTxt && <div className={`text-sm font-semibold og-num ${rateGood == null ? 'text-muted' : rateGood ? 'og-good' : 'og-warn'}`}>{rateTxt}</div>}
          </div>
          {chart.length >= 2 && (
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="rgb(var(--line) / .06)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmtShort} tick={axisTick} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis domain={[(min: number) => Math.floor(Math.min(min, goalV ?? min) - 1), (max: number) => Math.ceil(Math.max(max, goalV ?? max) + 1)]} tick={axisTick} axisLine={false} tickLine={false} width={44} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => fmtDay(String(l))} formatter={(v) => [`${v} ${unit}`, 'Peso']} />
                  {goalV && <ReferenceLine y={goalV} stroke="var(--og-green)" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Objetivo', position: 'insideTopRight', fontSize: 10, fill: 'var(--og-green)' }} />}
                  <Line type="monotone" dataKey="v" stroke="rgb(var(--accent))" strokeWidth={2} dot={{ r: 2, fill: 'rgb(var(--accent))' }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {prefs.goalKg && last && (
            <p className="text-xs text-muted px-1 mt-2">Te {last.kg > prefs.goalKg ? 'sobran' : 'faltan'} {fmtKg(Math.abs(last.kg - prefs.goalKg), unit)} {unit} para tu objetivo.</p>
          )}
        </div>
      )}

      <div>
        <div className="og-label">Añadir peso</div>
        <div className="og-card p-3 flex gap-2">
          <input className="og-input og-num flex-1" inputMode="decimal" placeholder={unit} value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <input type="date" className="og-input w-[9.5rem]" value={date} max={iso(new Date())} onChange={(e) => setDate(e.target.value || iso(new Date()))} />
          <button className="og-btn px-3" onClick={add} aria-label="Añadir"><Plus size={18} /></button>
        </div>
      </div>

      <div>
        <div className="og-label">Objetivo</div>
        <div className="og-card p-3 space-y-3">
          <div className="og-seg">
            {modes.map(([k, l]) => <button key={k} className={prefs.goalMode === k ? 'on' : ''} onClick={() => setPrefs({ goalMode: k })}>{l}</button>)}
          </div>
          <div className="flex gap-2">
            <input className="og-input og-num flex-1" inputMode="decimal" placeholder={`Peso objetivo (${unit})`} value={goal} onChange={(e) => setGoal(e.target.value)} onBlur={saveGoal} onKeyDown={(e) => e.key === 'Enter' && saveGoal()} />
            <button className="og-btn soft" onClick={saveGoal}>Guardar</button>
          </div>
        </div>
      </div>

      {bodyweights.length > 0 && (
        <div>
          <div className="og-label">Registros</div>
          <div className="og-group">
            {[...bodyweights].reverse().map((b) => (
              <div key={b.date} className="og-row">
                <div className="flex-1 text-sm text-muted capitalize">{fmtDay(b.date)}</div>
                <div className="font-semibold text-content og-num">{fmtKg(b.kg, unit)} {unit}</div>
                <button aria-label="Borrar" className="p-2 -mr-2 text-muted" onClick={() => deleteBodyweight(b.date)}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Historial ─────────────────────────
function History() {
  const history = useGymStore((s) => s.history);
  const unit = useAppStore((s) => s.settings.weightUnit);
  const [edit, setEdit] = useState<Workout | null>(null);
  const sorted = useMemo(() => [...history].sort((a, b) => b.date.localeCompare(a.date)), [history]);

  const newManual = () => {
    const d = new Date(); d.setHours(18, 0, 0, 0);
    setEdit({ id: uid(), date: d.toISOString(), endedAt: new Date(+d + 60 * 60000).toISOString(), name: 'Entreno', entries: [], source: 'manual' });
  };

  return (
    <div className="space-y-4">
      <button className="og-btn soft w-full" onClick={newManual}><Plus size={18} /> Registrar entreno pasado</button>
      {!sorted.length ? (
        <Empty icon={<Clock size={20} />} title="Historial vacío" text="Tus entrenos aparecerán aquí. También puedes apuntar uno que hiciste antes de usar la app." />
      ) : (
        <div className="og-group">
          {sorted.map((w) => {
            const prs = w.entries.reduce((a, e) => a + e.sets.filter((s) => s.pr).length, 0);
            const min = workoutMinutes(w);
            return (
              <button key={w.id} className="og-row w-full text-left" onClick={() => setEdit(w)}>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted capitalize">{fmtDay(w.date)}{w.source && w.source !== 'app' ? ` · ${w.source === 'manual' ? 'manual' : 'importado'}` : ''}</div>
                  <div className="text-content font-medium truncate">{w.name}</div>
                  <div className="text-xs text-muted og-num mt-0.5">
                    {min ? `${min} min · ` : ''}{workoutSets(w)} series · {nf(volIn(workoutVolume(w), unit))} {unit}
                  </div>
                </div>
                {prs > 0 && <span className="og-chip on shrink-0"><Trophy size={12} /> {prs}</span>}
                <ChevronRight size={16} className="text-muted shrink-0" />
              </button>
            );
          })}
        </div>
      )}
      {edit && <WorkoutEditor initial={edit} isNew={!history.some((w) => w.id === edit.id)} onClose={() => setEdit(null)} />}
    </div>
  );
}

function WorkoutEditor({ initial, isNew, onClose }: { initial: Workout; isNew: boolean; onClose: () => void }) {
  const saveWorkout = useGymStore((s) => s.saveWorkout);
  const deleteWorkout = useGymStore((s) => s.deleteWorkout);
  const custom = useGymStore((s) => s.customExercises);
  const unit = useAppStore((s) => s.settings.weightUnit);
  const [w, setW] = useState<Workout>(() => JSON.parse(JSON.stringify(initial)));
  const [minutes, setMinutes] = useState(String(workoutMinutes(initial) || ''));
  const [picking, setPicking] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const local = new Date(w.date);
  const dateVal = iso(local);
  const timeVal = `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`;
  const setDateTime = (d: string, t: string) => {
    const [y, mo, da] = d.split('-').map(Number); const [h, mi] = t.split(':').map(Number);
    if (!y || !mo || !da) return;
    setW((x) => ({ ...x, date: new Date(y, mo - 1, da, h || 0, mi || 0).toISOString() }));
  };
  const upEntry = (u: string, fn: (e: WorkoutEntry) => WorkoutEntry) => setW((x) => ({ ...x, entries: x.entries.map((e) => (e.uid === u ? fn(e) : e)) }));
  const upSet = (u: string, i: number, patch: Partial<DoneSet>) => upEntry(u, (e) => ({ ...e, sets: e.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));

  const save = () => {
    const m = parseInt(minutes, 10);
    const entries = w.entries.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) })).filter((e) => e.sets.length);
    const out: Workout = { ...w, name: w.name.trim() || 'Entreno', entries, endedAt: m > 0 ? new Date(+new Date(w.date) + m * 60000).toISOString() : undefined };
    saveWorkout(out); onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-app/90 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-app rounded-t-3xl sm:rounded-3xl border border-line/10 p-4 pb-8 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <h2 className="flex-1 text-lg font-bold text-content">{isNew ? 'Registrar entreno' : 'Editar entreno'}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded-full bg-surface-2 text-muted"><X size={18} /></button>
        </div>

        <div className="space-y-2">
          <input className="og-input" value={w.name} onChange={(e) => setW({ ...w, name: e.target.value })} placeholder="Nombre del entreno" />
          <div className="flex gap-2">
            <input type="date" className="og-input flex-1" value={dateVal} max={iso(new Date())} onChange={(e) => setDateTime(e.target.value, timeVal)} />
            <input type="time" className="og-input w-24" value={timeVal} onChange={(e) => setDateTime(dateVal, e.target.value)} />
            <div className="relative w-24">
              <input className="og-input og-num pr-9" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} placeholder="Dur." aria-label="Duración en minutos" />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">min</span>
            </div>
          </div>
        </div>

        {w.entries.length === 0 && <p className="text-sm text-muted text-center py-2">Añade los ejercicios que hiciste.</p>}
        {w.entries.map((e) => {
          const ex = byId(e.exId, custom);
          const timed = ex?.kind === 'time' || ex?.kind === 'cardio';
          const noKg = ex?.kind === 'reps' || timed;
          return (
            <div key={e.uid} className="og-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 min-w-0 font-semibold text-content truncate">{ex?.name || e.exId}</div>
                <button aria-label="Quitar ejercicio" className="p-1.5 text-muted" onClick={() => setW((x) => ({ ...x, entries: x.entries.filter((y) => y.uid !== e.uid) }))}><Trash2 size={16} /></button>
              </div>
              <div className="space-y-1.5">
                {e.sets.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`w-6 text-center text-xs font-bold ${s.type === 'warmup' ? 'og-warn' : 'text-muted'}`}>{s.type === 'warmup' ? 'C' : i + 1}</span>
                    {!noKg && <NumField value={s.kg != null ? Number(fmtKg(s.kg, unit)) : undefined} suffix={unit} onChange={(n) => upSet(e.uid, i, { kg: n == null ? undefined : Math.round(toKg(n, unit) * 100) / 100 })} />}
                    {timed
                      ? <NumField value={s.seconds} suffix="s" onChange={(n) => upSet(e.uid, i, { seconds: n })} />
                      : <NumField value={s.reps} suffix="reps" onChange={(n) => upSet(e.uid, i, { reps: n })} />}
                    {s.pr && <Trophy size={14} className="og-warn shrink-0" />}
                    <button aria-label="Borrar serie" className="p-1.5 text-muted ml-auto" onClick={() => upEntry(e.uid, (x) => ({ ...x, sets: x.sets.filter((_, j) => j !== i) }))}><X size={16} /></button>
                  </div>
                ))}
              </div>
              <button className="text-sm text-accent font-semibold mt-2 flex items-center gap-1" onClick={() => upEntry(e.uid, (x) => {
                const p = x.sets[x.sets.length - 1];
                return { ...x, sets: [...x.sets, { type: 'normal', kg: p?.kg, reps: p?.reps, seconds: p?.seconds, done: true }] };
              })}><Plus size={14} /> Añadir serie</button>
            </div>
          );
        })}

        <button className="og-btn soft w-full" onClick={() => setPicking(true)}><Plus size={18} /> Añadir ejercicio</button>
        <button className="og-btn w-full" onClick={save}>Guardar</button>
        {!isNew && (confirmDel ? (
          <div className="flex gap-2">
            <button className="og-btn soft flex-1" onClick={() => setConfirmDel(false)}>Cancelar</button>
            <button className="og-btn danger flex-1" onClick={() => { deleteWorkout(w.id); onClose(); }}>Sí, borrar</button>
          </div>
        ) : (
          <button className="og-btn danger w-full" onClick={() => setConfirmDel(true)}><Trash2 size={16} /> Borrar entreno</button>
        ))}
      </div>

      {picking && (
        <ExercisePicker onClose={() => setPicking(false)} onPick={(exId) => {
          setPicking(false);
          setW((x) => ({ ...x, entries: [...x.entries, { uid: uid(), exId, sets: [{ type: 'normal', done: true }] }] }));
        }} />
      )}
    </div>
  );
}

function NumField({ value, suffix, onChange }: { value: number | undefined; suffix: string; onChange: (n: number | undefined) => void }) {
  const [txt, setTxt] = useState(value != null ? String(value).replace('.', ',') : '');
  return (
    <div className="relative flex-1 min-w-0">
      <input className="og-input og-num pr-11" style={{ minHeight: 38 }} inputMode="decimal" value={txt}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.,]/g, ''); setTxt(t);
          const n = parseFloat(t.replace(',', '.'));
          onChange(Number.isFinite(n) ? n : undefined);
        }} />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted pointer-events-none">{suffix}</span>
    </div>
  );
}

function ExercisePicker({ onPick, onClose }: { onPick: (exId: string) => void; onClose: () => void }) {
  const custom = useGymStore((s) => s.customExercises);
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const nq = norm(q.trim());
    return [...custom, ...CATALOG].filter((e) => !nq || norm(e.name).includes(nq) || e.primary.some((m) => norm(muscleName(m)).includes(nq)))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [q, custom]);
  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-app/90 backdrop-blur-md" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="w-full max-w-md h-[80vh] flex flex-col bg-app rounded-t-3xl sm:rounded-3xl border border-line/10 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input autoFocus className="og-input" style={{ paddingLeft: 34 }} placeholder="Buscar ejercicio" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded-full bg-surface-2 text-muted"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto"><div className="og-group">
          {list.map((ex) => (
            <button key={ex.id} className="og-row w-full text-left" onClick={() => onPick(ex.id)}>
              <div className="flex-1 min-w-0">
                <div className="text-content truncate">{ex.name}</div>
                <div className="text-xs text-muted truncate">{ex.primary.map(muscleName).join(', ')} · {equipmentName(ex.equipment)}</div>
              </div>
            </button>
          ))}
          {!list.length && <div className="p-4 text-sm text-muted text-center">Nada con ese nombre.</div>}</div>
        </div>
      </div>
    </div>
  );
}
