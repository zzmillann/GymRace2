'use client';

// Biblioteca de ejercicios: buscador, filtros por material y músculo (tocando el mapa), lista agrupada
// y formulario para crear/editar ejercicios propios (con foto, GIF o vídeo guardado en el dispositivo).
import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { BodyMap } from './BodyMap';
import { ExerciseSheet, KIND_NAMES, mediaKey, readMedia, type ExMedia } from './ExerciseSheet';
import { CATALOG, norm } from '@/lib/gym/catalog';
import { uid } from '@/lib/gym/calc';
import { EQUIPMENT, MUSCLES, equipmentName, muscleName } from '@/lib/gym/muscles';
import type { CatalogExercise, Equipment, ExerciseKind, MuscleId } from '@/lib/gym/types';
import { useGymStore } from '@/store/useGymStore';

const OWNED_KEY = 'gr_owned_equipment';
const MAX_MEDIA = 2 * 1024 * 1024;
const groupOf = (ex: CatalogExercise) => (ex.primary[0] ? MUSCLES.find((m) => m.id === ex.primary[0])?.group || 'Otros' : 'Otros');
const GROUP_ORDER = [...Array.from(new Set(MUSCLES.map((m) => m.group))), 'Otros'];

export function ExerciseLibrary({ onPick }: { onPick?: (exId: string) => void }) {
  const custom = useGymStore((s) => s.customExercises);
  const [q, setQ] = useState('');
  const [equip, setEquip] = useState<Equipment | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [owned, setOwned] = useState<Equipment[]>(['bodyweight', 'dumbbell', 'barbell', 'machine', 'cable']);
  const [muscle, setMuscle] = useState<MuscleId | null>(null);
  const [grouping, setGrouping] = useState<'muscle' | 'az'>('muscle');
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<CatalogExercise | 'new' | null>(null);

  // el material que tengo se recuerda en este dispositivo (comodidad; no es un dato del entreno)
  useEffect(() => { try { const r = localStorage.getItem(OWNED_KEY); if (r) setOwned(JSON.parse(r)); } catch { /* sin almacenamiento */ } }, []);
  const toggleOwned = (id: Equipment) => {
    const next = owned.includes(id) ? owned.filter((x) => x !== id) : [...owned, id];
    setOwned(next); try { localStorage.setItem(OWNED_KEY, JSON.stringify(next)); } catch { /* sin almacenamiento */ }
  };

  const all = useMemo(() => [...custom, ...CATALOG], [custom]);
  const list = useMemo(() => {
    const nq = norm(q.trim());
    return all.filter((ex) => {
      if (nq && !norm(ex.name).includes(nq) && !ex.primary.some((m) => norm(muscleName(m)).includes(nq))) return false;
      if (onlyMine ? !owned.includes(ex.equipment) : equip && ex.equipment !== equip) return false;
      if (muscle && !ex.primary.includes(muscle) && !ex.secondary.includes(muscle)) return false;
      return true;
    }).sort((a, b) => {
      // con un músculo elegido, primero los que lo trabajan como principal
      if (muscle) { const d = Number(b.primary.includes(muscle)) - Number(a.primary.includes(muscle)); if (d) return d; }
      return a.name.localeCompare(b.name, 'es');
    });
  }, [all, q, equip, onlyMine, owned, muscle]);

  const groups = useMemo(() => {
    const map = new Map<string, CatalogExercise[]>();
    for (const ex of list) {
      const k = grouping === 'az' ? (norm(ex.name)[0] || '#').toUpperCase() : groupOf(ex);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(ex);
    }
    const keys = Array.from(map.keys()).sort((a, b) => (grouping === 'az' ? a.localeCompare(b) : GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b)));
    return keys.map((k) => ({ key: k, items: map.get(k)! }));
  }, [list, grouping]);

  const pick = (id: string) => (onPick ? onPick(id) : setOpen(id));
  const mapValues: Partial<Record<MuscleId, number>> = {};

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input className="og-input" style={{ paddingLeft: 34 }} placeholder="Buscar ejercicio o músculo" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <button onClick={() => setQ('')} aria-label="Borrar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted"><X size={16} /></button>}
      </div>

      <div className="og-card p-3 flex items-center gap-3">
        <BodyMap values={mapValues} selected={muscle} onPick={(m) => setMuscle(muscle === m ? null : m)} size={210} label />
        <div className="flex-1 min-w-0 text-sm">
          <p className="text-muted">Toca un músculo para ver sus ejercicios.</p>
          {muscle && (
            <button onClick={() => setMuscle(null)} className="og-chip on mt-2">{muscleName(muscle)} <X size={12} /></button>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-sm text-content font-medium">Solo lo que tengo</span>
          <button role="switch" aria-checked={onlyMine} onClick={() => setOnlyMine(!onlyMine)}
            className={`w-12 h-7 rounded-full p-0.5 transition-colors ${onlyMine ? 'bg-accent' : 'bg-surface-2'}`}>
            <span className={`block w-6 h-6 rounded-full bg-white shadow transition-transform ${onlyMine ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          {!onlyMine && <button className={`og-chip shrink-0 ${!equip ? 'on' : ''}`} onClick={() => setEquip(null)}>Todo el material</button>}
          {EQUIPMENT.map((e) => {
            const on = onlyMine ? owned.includes(e.id) : equip === e.id;
            return <button key={e.id} className={`og-chip shrink-0 ${on ? 'on' : ''}`} onClick={() => (onlyMine ? toggleOwned(e.id) : setEquip(equip === e.id ? null : e.id))}>{e.name}</button>;
          })}
        </div>
        {onlyMine && <p className="text-xs text-muted mt-1 px-1">Marca el material que tienes a mano.</p>}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted flex-1">{list.length} {list.length === 1 ? 'ejercicio' : 'ejercicios'}</span>
        <div className="og-seg w-44">
          <button className={grouping === 'muscle' ? 'on' : ''} onClick={() => setGrouping('muscle')}>Músculo</button>
          <button className={grouping === 'az' ? 'on' : ''} onClick={() => setGrouping('az')}>A-Z</button>
        </div>
      </div>

      <button className="og-btn soft w-full" onClick={() => setEditing('new')}><Plus size={18} /> Crear ejercicio</button>

      {list.length === 0 ? (
        <div className="og-card p-6 text-center text-sm text-muted">No hay ejercicios con esos filtros. Prueba a quitar alguno o créalo tú.</div>
      ) : groups.map((g) => (
        <div key={g.key}>
          <div className="og-label">{g.key} · {g.items.length}</div>
          <div className="og-group">
            {g.items.map((ex) => (
              <div key={ex.id} className="og-row">
                <button className="flex-1 min-w-0 text-left" onClick={() => pick(ex.id)}>
                  <div className="text-content font-medium truncate">{ex.name}{ex.custom && <span className="og-chip ml-2 align-middle" style={{ fontSize: 10, padding: '1px 6px' }}>Propio</span>}</div>
                  <div className="text-xs text-muted truncate">{ex.primary.map(muscleName).join(', ')} · {equipmentName(ex.equipment)}</div>
                </button>
                {ex.custom && <button aria-label="Editar" className="p-2 text-muted" onClick={() => setEditing(ex)}><Pencil size={16} /></button>}
                <ChevronRight size={16} className="text-muted shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {open && <ExerciseSheet exId={open} onClose={() => setOpen(null)} />}
      {editing && <ExerciseForm initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ── Formulario de ejercicio propio ──
function ExerciseForm({ initial, onClose }: { initial: CatalogExercise | null; onClose: () => void }) {
  const save = useGymStore((s) => s.saveCustomExercise);
  const remove = useGymStore((s) => s.deleteCustomExercise);
  const [name, setName] = useState(initial?.name || '');
  const [primary, setPrimary] = useState<MuscleId[]>(initial?.primary || []);
  const [secondary, setSecondary] = useState<MuscleId[]>(initial?.secondary || []);
  const [equipment, setEquipment] = useState<Equipment>(initial?.equipment || 'dumbbell');
  const [kind, setKind] = useState<ExerciseKind>(initial?.kind || 'weight');
  const [perSide, setPerSide] = useState(!!initial?.perSide);
  const [steps, setSteps] = useState((initial?.steps || []).join('\n'));
  const [media, setMedia] = useState<ExMedia | null>(null);
  const [mediaTouched, setMediaTouched] = useState(false);
  const [err, setErr] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => { if (initial) setMedia(readMedia(initial.id)); }, [initial]);

  const toggle = (list: MuscleId[], set: (l: MuscleId[]) => void, m: MuscleId, other: MuscleId[], setOther: (l: MuscleId[]) => void) => {
    if (list.includes(m)) set(list.filter((x) => x !== m));
    else { set([...list, m]); if (other.includes(m)) setOther(other.filter((x) => x !== m)); }
  };

  const onFile = (f: File | undefined) => {
    setErr('');
    if (!f) return;
    if (f.size > MAX_MEDIA) { setErr('El archivo pasa de 2 MB. Prueba con uno más corto o comprimido.'); return; }
    if (!/^(image|video)\//.test(f.type)) { setErr('Solo fotos, GIF o vídeos.'); return; }
    // Se guarda como data URL en este dispositivo. Ojo: una foto puede llevar datos EXIF (ubicación) dentro.
    const r = new FileReader();
    r.onload = () => { setMedia({ type: f.type, data: String(r.result) }); setMediaTouched(true); };
    r.onerror = () => setErr('No se pudo leer el archivo.');
    r.readAsDataURL(f);
  };

  const submit = () => {
    if (!name.trim()) { setErr('Ponle un nombre.'); return; }
    if (!primary.length) { setErr('Elige al menos un músculo principal.'); return; }
    const id = initial?.id || `custom_${uid()}`;
    if (mediaTouched) {
      try {
        if (media) localStorage.setItem(mediaKey(id), JSON.stringify(media));
        else localStorage.removeItem(mediaKey(id));
      } catch { setErr('No hay espacio para guardar el archivo en este dispositivo.'); return; }
    }
    save({
      id, name: name.trim(), primary, secondary, equipment, kind, perSide: perSide || undefined,
      steps: steps.split('\n').map((s) => s.trim()).filter(Boolean), custom: true,
    });
    onClose();
  };

  const del = () => {
    if (!initial) return;
    try { localStorage.removeItem(mediaKey(initial.id)); } catch { /* nada */ }
    remove(initial.id); onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-app/90 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-app rounded-t-3xl sm:rounded-3xl border border-line/10 p-4 pb-8 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <h2 className="flex-1 text-lg font-bold text-content">{initial ? 'Editar ejercicio' : 'Crear ejercicio'}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded-full bg-surface-2 text-muted"><X size={18} /></button>
        </div>

        <div>
          <div className="og-label">Nombre</div>
          <input className="og-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Remo en máquina Hammer" maxLength={60} />
        </div>

        <MusclePicker title="Músculos principales" sel={primary} onToggle={(m) => toggle(primary, setPrimary, m, secondary, setSecondary)} />
        <MusclePicker title="Músculos secundarios" sel={secondary} onToggle={(m) => toggle(secondary, setSecondary, m, primary, setPrimary)} />

        <div>
          <div className="og-label">Material</div>
          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENT.map((e) => <button key={e.id} className={`og-chip ${equipment === e.id ? 'on' : ''}`} onClick={() => setEquipment(e.id)}>{e.name}</button>)}
          </div>
        </div>

        <div>
          <div className="og-label">Cómo se registra</div>
          <div className="og-seg">
            {(Object.keys(KIND_NAMES) as ExerciseKind[]).map((k) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{KIND_NAMES[k]}</button>)}
          </div>
        </div>

        <label className="flex items-center justify-between og-card px-3 py-2.5">
          <span className="text-sm text-content">Se hace por lado (una pierna, un brazo)</span>
          <input type="checkbox" checked={perSide} onChange={(e) => setPerSide(e.target.checked)} className="w-5 h-5 accent-[rgb(var(--accent))]" />
        </label>

        <div>
          <div className="og-label">Pasos (uno por línea)</div>
          <textarea className="og-input py-2" style={{ minHeight: 96 }} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder={'Colócate…\nBaja controlado…\nSube…'} />
        </div>

        <div>
          <div className="og-label">Foto, GIF o vídeo (máx. 2 MB)</div>
          {media ? (
            <div className="og-card overflow-hidden">
              {media.type.startsWith('video/')
                ? <video src={media.data} controls muted playsInline className="w-full max-h-56 object-contain bg-black" />
                : <img src={media.data} alt="" className="w-full max-h-56 object-contain bg-black" />}
              <button className="og-btn danger w-full rounded-none" onClick={() => { setMedia(null); setMediaTouched(true); }}><Trash2 size={16} /> Quitar</button>
            </div>
          ) : (
            <label className="og-btn soft w-full cursor-pointer">
              <Plus size={16} /> Añadir archivo
              <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          )}
          <p className="text-[11px] text-muted mt-1 px-1">Se guarda solo en este dispositivo. Las fotos del móvil pueden incluir la ubicación en sus datos.</p>
        </div>

        {err && <p className="text-sm og-bad">{err}</p>}

        <button className="og-btn w-full" onClick={submit}>{initial ? 'Guardar cambios' : 'Crear ejercicio'}</button>
        {initial && (confirmDel ? (
          <div className="flex gap-2">
            <button className="og-btn soft flex-1" onClick={() => setConfirmDel(false)}>Cancelar</button>
            <button className="og-btn danger flex-1" onClick={del}>Sí, borrar</button>
          </div>
        ) : (
          <button className="og-btn danger w-full" onClick={() => setConfirmDel(true)}><Trash2 size={16} /> Borrar ejercicio</button>
        ))}
      </div>
    </div>
  );
}

function MusclePicker({ title, sel, onToggle }: { title: string; sel: MuscleId[]; onToggle: (m: MuscleId) => void }) {
  return (
    <div>
      <div className="og-label">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {MUSCLES.map((m) => <button key={m.id} className={`og-chip ${sel.includes(m.id) ? 'on' : ''}`} onClick={() => onToggle(m.id)}>{m.name}</button>)}
      </div>
    </div>
  );
}
