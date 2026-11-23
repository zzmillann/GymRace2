'use client';

// Datos del gimnasio: importar (Strong / Hevy / FitNotes, Apple Health, copia JSON), exportar y compartir rutinas.
import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, FileDown, FileUp, Printer, Scale, Share2, Upload } from 'lucide-react';
import { useGymStore } from '@/store/useGymStore';
import { useAppStore } from '@/store/useHabitStore';
import { byId } from '@/lib/gym/catalog';
import { fmtKg, iso } from '@/lib/gym/calc';
import {
  exportCSV, exportJSON, importAny, importJSON, parseAppleHealthWeight, routineFromShareFile, routineToShareFile,
  type ImportFormat, type WeightUnit,
} from '@/lib/gym/importers';
import type { Routine } from '@/lib/gym/types';

const FORMAT_NAME: Record<ImportFormat, string> = { strong: 'Strong', hevy: 'Hevy', fitnotes: 'FitNotes' };

type Result =
  | { kind: 'csv'; format: ImportFormat; total: number; added: number; skipped: number; newEx: number; unknown: string[] }
  | { kind: 'weight'; count: number }
  | { kind: 'backup'; workouts: number; routines: number }
  | { kind: 'routine'; name: string; newEx: number }
  | { kind: 'info'; text: string }
  | { kind: 'error'; text: string };

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const safeName = (s: string) => s.replace(/[^0-9A-Za-zÀ-ɏ _-]+/g, '').trim().replace(/\s+/g, '_') || 'rutina';

/** Botón que abre un selector de archivo oculto. */
function FilePick({ label, hint, accept, icon, onFile }: { label: string; hint?: string; accept: string; icon: React.ReactNode; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <button type="button" className="og-row w-full text-left" onClick={() => ref.current?.click()}>
      <span className="text-accent">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-content text-[15px]">{label}</span>
        {hint && <span className="block text-muted text-xs">{hint}</span>}
      </span>
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f); }} />
    </button>
  );
}

export function DataView() {
  const appUnit = useAppStore((s) => s.settings.weightUnit) as WeightUnit;
  const routines = useGymStore((s) => s.routines);
  const history = useGymStore((s) => s.history);
  const customExercises = useGymStore((s) => s.customExercises);
  const importWorkouts = useGymStore((s) => s.importWorkouts);
  const saveCustomExercise = useGymStore((s) => s.saveCustomExercise);
  const saveRoutine = useGymStore((s) => s.saveRoutine);

  const [fileUnit, setFileUnit] = useState<WeightUnit>(appUnit);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [routineId, setRoutineId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== 'undefined' && 'share' in navigator), []);

  const routine: Routine | undefined = routines.find((r) => r.id === routineId) || routines[0];

  const run = async (fn: () => Promise<Result | null>) => {
    setBusy(true);
    try { const r = await fn(); if (r) setResult(r); } catch (e) { setResult({ kind: 'error', text: e instanceof Error ? e.message : 'No se pudo leer el archivo.' }); }
    finally { setBusy(false); }
  };

  // ── Importar ──
  const onCSV = (f: File) => run(async () => {
    const text = await f.text();
    const custom = useGymStore.getState().customExercises;
    const r = importAny(text, fileUnit, custom);
    if (!r.workouts.length) return { kind: 'info', text: 'El archivo no tiene entrenos que importar.' };
    const have = new Set(custom.map((e) => e.id));
    const fresh = r.newExercises.filter((e) => !have.has(e.id));
    fresh.forEach(saveCustomExercise);
    const added = importWorkouts(r.workouts);
    return { kind: 'csv', format: r.format, total: r.workouts.length, added, skipped: r.workouts.length - added, newEx: fresh.length, unknown: r.unknownNames };
  });

  const onWeight = (f: File) => run(async () => {
    const list = parseAppleHealthWeight(await f.text());
    if (!list.length) return { kind: 'info', text: 'No se ha encontrado ningún registro de peso corporal en el archivo.' };
    useGymStore.setState((s) => {
      const map = new Map(s.bodyweights.map((b) => [b.date, b.kg]));
      for (const b of list) map.set(b.date, b.kg);
      return { bodyweights: Array.from(map.entries()).map(([date, kg]) => ({ date, kg })).sort((a, b) => a.date.localeCompare(b.date)) };
    });
    return { kind: 'weight', count: list.length };
  });

  const onBackup = (f: File) => run(async () => {
    const b = importJSON(await f.text());
    const ok = window.confirm(`Esta copia tiene ${b.history.length} entrenos y ${b.routines.length} rutinas${b.exportedAt ? ` (del ${new Date(b.exportedAt).toLocaleDateString('es-ES')})` : ''}.\n\nSe REEMPLAZARÁN todos tus datos del gimnasio actuales. ¿Continuar?`);
    if (!ok) return null;
    useGymStore.setState((s) => ({
      routines: b.routines, plan: b.plan, history: b.history, bodyweights: b.bodyweights, customExercises: b.customExercises,
      gyms: b.gyms.length ? b.gyms : s.gyms,
      prefs: { ...s.prefs, ...b.prefs, activeGym: (b.gyms.length ? b.gyms : s.gyms).some((g) => g.id === b.prefs.activeGym) ? b.prefs.activeGym : (b.gyms[0] || s.gyms[0]).id },
      active: null, restEndsAt: null,
    }));
    return { kind: 'backup', workouts: b.history.length, routines: b.routines.length };
  });

  const onSharedRoutine = (f: File) => run(async () => {
    const { routine: r, exercises } = routineFromShareFile(await f.text());
    const have = new Set(useGymStore.getState().customExercises.map((e) => e.id));
    const fresh = exercises.filter((e) => !have.has(e.id));
    fresh.forEach(saveCustomExercise);
    const names = new Set(useGymStore.getState().routines.map((x) => x.name));
    saveRoutine(names.has(r.name) ? { ...r, name: `${r.name} (compartida)` } : r);
    return { kind: 'routine', name: r.name, newEx: fresh.length };
  });

  // ── Exportar ──
  const exportBackup = () => {
    const s = useGymStore.getState();
    download(`gymrace-gimnasio-${iso(new Date())}.json`, exportJSON(s), 'application/json');
  };
  const exportHistoryCSV = () => {
    if (!history.length) { setResult({ kind: 'info', text: 'Todavía no hay entrenos en el historial.' }); return; }
    download(`gymrace-entrenos-${iso(new Date())}.csv`, exportCSV(history, appUnit, customExercises), 'text/csv;charset=utf-8');
  };

  // ── Compartir rutina ──
  const shareFileName = (r: Routine) => `${safeName(r.name)}.gymrace.json`;
  const downloadRoutine = () => { if (routine) download(shareFileName(routine), routineToShareFile(routine, customExercises), 'application/json'); };
  const shareRoutine = async () => {
    if (!routine) return;
    const json = routineToShareFile(routine, customExercises);
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        const file = new File([json], shareFileName(routine), { type: 'application/json' });
        if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: routine.name, files: [file] });
        else await navigator.share({ title: `Rutina ${routine.name}`, text: json });
        return;
      }
      await navigator.clipboard.writeText(json);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      try { await navigator.clipboard.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 1800); }
      catch { setResult({ kind: 'error', text: 'No se pudo compartir ni copiar la rutina.' }); }
    }
  };
  const printRoutine = () => {
    if (!routine) return;
    const w = window.open('', '_blank');
    if (!w) { setResult({ kind: 'error', text: 'El navegador ha bloqueado la ventana de impresión.' }); return; }
    const rows = routine.items.map((it, i) => {
      const ex = byId(it.exId, customExercises);
      const work = it.sets.filter((s) => s.type !== 'warmup');
      const warm = it.sets.length - work.length;
      const reps = Array.from(new Set(work.map((s) => (s.seconds ? `${s.seconds} s` : s.reps != null ? (s.repsMax && s.repsMax !== s.reps ? `${s.reps}-${s.repsMax}` : String(s.reps)) : '—')))).join(' / ');
      const kgs = Array.from(new Set(work.filter((s) => s.kg != null).map((s) => `${fmtKg(s.kg, appUnit)} ${appUnit}`))).join(' / ');
      const ssTag = it.superset ? ' <span class="ss">superserie</span>' : '';
      return `<tr><td class="n">${i + 1}</td><td><b>${esc(ex?.name || it.exId)}</b>${ssTag}${it.note ? `<div class="note">${esc(it.note)}</div>` : ''}</td>`
        + `<td>${work.length}${warm ? ` <small>+${warm} cal.</small>` : ''}</td><td>${esc(reps)}</td><td>${esc(kgs || '—')}</td><td>${it.rest ? `${Math.floor(it.rest / 60)}:${String(it.rest % 60).padStart(2, '0')}` : '—'}</td></tr>`;
    }).join('');
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(routine.name)}</title><style>
      body{font:14px/1.4 -apple-system,system-ui,Segoe UI,Roboto,sans-serif;color:#111;margin:28px}
      h1{font-size:22px;margin:0 0 4px} p{color:#666;margin:0 0 18px}
      table{width:100%;border-collapse:collapse} th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #ddd;vertical-align:top}
      th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#666} td.n{color:#999;width:24px}
      .note{color:#666;font-size:12px} .ss{font-size:10px;border:1px solid #999;border-radius:8px;padding:0 5px;color:#555}
      small{color:#888} @media print{body{margin:12mm}}
    </style></head><body><h1>${esc(routine.name)}${routine.deload ? ' · descarga' : ''}</h1>
      <p>${routine.items.length} ejercicios · GymRace</p>
      <table><thead><tr><th></th><th>Ejercicio</th><th>Series</th><th>Reps</th><th>Peso</th><th>Descanso</th></tr></thead><tbody>${rows}</tbody></table>
    </body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { try { w.print(); } catch { /* el usuario puede imprimir a mano */ } }, 300);
  };

  return (
    <div className="space-y-6">
      {/* Importar */}
      <section>
        <div className="og-label">Importar</div>
        <div className="og-group">
          <FilePick label="Importar CSV de entrenos" hint="Strong, Hevy o FitNotes: se detecta solo" accept=".csv,text/csv,text/plain" icon={<FileUp size={20} />} onFile={onCSV} />
          <div className="og-row">
            <span className="flex-1 text-[13px] text-muted">Unidad del peso en el CSV de Strong</span>
            <div className="og-seg w-32">
              {(['kg', 'lb'] as const).map((u) => <button key={u} type="button" className={fileUnit === u ? 'on' : ''} onClick={() => setFileUnit(u)}>{u}</button>)}
            </div>
          </div>
          <FilePick label="Peso corporal de Apple Health" hint="export.xml (descomprime el .zip) o CSV «fecha,kg»" accept=".xml,.csv,text/xml,application/xml,text/csv" icon={<Scale size={20} />} onFile={onWeight} />
          <FilePick label="Restaurar copia de seguridad" hint="Archivo .json de GymRace (reemplaza tus datos)" accept=".json,application/json" icon={<Upload size={20} />} onFile={onBackup} />
        </div>
        <p className="text-xs text-muted px-1.5 pt-2">
          Strong: Ajustes → Exportar datos. Hevy: Perfil → Ajustes → Exportar datos. FitNotes: Ajustes → Copia de seguridad → Exportar CSV.
          Los entrenos que ya tengas (misma fecha y nombre) no se duplican.
        </p>
        {busy && <div className="og-card p-3 mt-3 text-sm text-muted">Leyendo archivo…</div>}
        {result && !busy && <ResultCard r={result} onClose={() => setResult(null)} />}
      </section>

      {/* Exportar */}
      <section>
        <div className="og-label">Exportar</div>
        <div className="og-group">
          <button type="button" className="og-row w-full text-left" onClick={exportBackup}>
            <span className="text-accent"><Download size={20} /></span>
            <span className="flex-1"><span className="block text-content text-[15px]">Descargar copia de seguridad</span><span className="block text-muted text-xs">Todo: rutinas, plan, historial, peso, gimnasios y ajustes (JSON)</span></span>
          </button>
          <button type="button" className="og-row w-full text-left" onClick={exportHistoryCSV}>
            <span className="text-accent"><FileDown size={20} /></span>
            <span className="flex-1"><span className="block text-content text-[15px]">Exportar historial a CSV</span><span className="block text-muted text-xs og-num">{history.length} entrenos · una fila por serie · se abre en Excel</span></span>
          </button>
        </div>
      </section>

      {/* Compartir rutina */}
      <section>
        <div className="og-label">Compartir rutina</div>
        <div className="og-group">
          {routines.length ? (
            <>
              <div className="og-row">
                <select className="og-input" value={routine?.id || ''} onChange={(e) => setRoutineId(e.target.value)} aria-label="Rutina">
                  {routines.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="og-row grid grid-cols-3 gap-2">
                <button type="button" className="og-btn soft !px-2 text-[13px]" onClick={downloadRoutine}><Download size={16} />Archivo</button>
                <button type="button" className="og-btn soft !px-2 text-[13px]" onClick={shareRoutine}>
                  {copied ? <><Check size={16} />Copiada</> : canShare ? <><Share2 size={16} />Compartir</> : <><Copy size={16} />Copiar</>}
                </button>
                <button type="button" className="og-btn soft !px-2 text-[13px]" onClick={printRoutine}><Printer size={16} />PDF</button>
              </div>
            </>
          ) : (
            <div className="og-row text-sm text-muted">Aún no tienes rutinas para compartir.</div>
          )}
          <FilePick label="Importar rutina compartida" hint="Archivo .gymrace.json que te hayan pasado" accept=".json,application/json" icon={<FileUp size={20} />} onFile={onSharedRoutine} />
        </div>
      </section>
    </div>
  );
}

function ResultCard({ r, onClose }: { r: Result; onClose: () => void }) {
  let body: React.ReactNode;
  if (r.kind === 'csv') body = (
    <>
      <div className="font-semibold text-content">Importado desde {FORMAT_NAME[r.format]}</div>
      <ul className="text-sm text-muted mt-1 space-y-0.5 og-num">
        <li><span className="og-good font-semibold">{r.added}</span> entrenos nuevos</li>
        {r.skipped > 0 && <li>{r.skipped} ya estaban (no se han duplicado)</li>}
        <li>{r.newEx} ejercicios nuevos creados</li>
      </ul>
      {r.unknown.length > 0 && (
        <p className="text-xs text-muted mt-2">Sin equivalente en el catálogo (se han creado como ejercicios propios): {r.unknown.slice(0, 12).join(', ')}{r.unknown.length > 12 ? ` y ${r.unknown.length - 12} más` : ''}.</p>
      )}
    </>
  );
  else if (r.kind === 'weight') body = <div className="text-content"><span className="og-good font-semibold">{r.count}</span> días de peso corporal importados.</div>;
  else if (r.kind === 'backup') body = <div className="text-content">Copia restaurada: {r.workouts} entrenos y {r.routines} rutinas.</div>;
  else if (r.kind === 'routine') body = <div className="text-content">Rutina «{r.name}» añadida{r.newEx ? ` con ${r.newEx} ejercicios propios nuevos` : ''}.</div>;
  else if (r.kind === 'info') body = <div className="text-content">{r.text}</div>;
  else body = <div className="og-bad">{r.text}</div>;
  return (
    <div className="og-card p-3 mt-3 flex gap-3 items-start">
      <div className="flex-1 min-w-0">{body}</div>
      <button type="button" className="text-muted text-sm" onClick={onClose} aria-label="Cerrar">✕</button>
    </div>
  );
}
