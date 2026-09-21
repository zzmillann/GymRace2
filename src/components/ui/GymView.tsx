'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ArrowUpRight, History, Trash2, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/useHabitStore';
import { haptic, playDing, confettiBig } from '@/lib/feedback';
import { RestTimer } from '@/components/ui/RestTimer';
import { RoutesView } from '@/components/ui/RoutesView';

// Conversión kg <-> unidad mostrada (los pesos se guardan SIEMPRE en kg)
const KG_TO_LB = 2.20462;

const MUSCLES = ['Pecho', 'Espalda', 'Pierna', 'Hombro', 'Biceps', 'Triceps'];

const getInsultRole = (weight: number) => {
  if (weight < 20) return { label: 'Fideo', color: 'text-muted', bg: 'bg-neutral-500/10' };
  if (weight < 40) return { label: 'Cuerpo Escombro', color: 'text-orange-500', bg: 'bg-orange-500/10' };
  if (weight < 60) return { label: 'Pre-playa', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
  if (weight < 80) return { label: 'Humano Promedio', color: 'text-accent', bg: 'bg-accent/10' };
  if (weight < 100) return { label: 'Gorila con Asma', color: 'text-sky-500', bg: 'bg-sky-500/10' };
  if (weight < 140) return { label: 'Bestia', color: 'text-purple-500', bg: 'bg-purple-500/10' };
  return { label: 'Mutante', color: 'text-red-500', bg: 'bg-red-500/10' };
};

export function GymView() {
  const { exercises, addExercise, updateWeight, deleteExercise, activeGymMuscle, setActiveGymMuscle, settings } = useAppStore();
  const router = useRouter();

  // Unidad de peso (Ajustes). Almacenamos en kg y mostramos según preferencia.
  const unit = settings.weightUnit; // 'kg' | 'lb'
  const unitLabel = unit === 'lb' ? 'LB' : 'KG';
  const toDisplay = (kg: number) => unit === 'lb' ? Math.round(kg * KG_TO_LB) : Math.round(kg);
  const toKg = (val: number) => unit === 'lb' ? val / KG_TO_LB : val;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExId, setEditingExId] = useState<string | null>(null);
  
  const [newExName, setNewExName] = useState('');
  const [newExWeight, setNewExWeight] = useState('');
  const [updateWeightVal, setUpdateWeightVal] = useState('');
  const [prCelebration, setPrCelebration] = useState<{ name: string; weight: number } | null>(null);
  const [gymTab, setGymTab] = useState<'pesas' | 'rutas'>('pesas');

  const filteredExercises = exercises.filter(ex => ex.muscle === activeGymMuscle);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName || !newExWeight) return;
    addExercise(newExName, activeGymMuscle, toKg(Number(newExWeight)));
    setNewExName('');
    setNewExWeight('');
    setIsAddModalOpen(false);
  };

  const handleUpdateWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExId || !updateWeightVal) return;
    const ex = exercises.find(x => x.id === editingExId);
    const newKg = toKg(Number(updateWeightVal));
    const prevMax = ex && ex.weightHistory.length ? Math.max(...ex.weightHistory) : 0;
    const isPR = !!ex && ex.weightHistory.length > 0 && newKg > prevMax;

    updateWeight(editingExId, newKg);

    if (isPR) {
      // ¡Récord! Celebración a tope
      confettiBig();
      if (settings.hapticFeedback) haptic([40, 60, 40, 60, 90]);
      if (settings.soundEffects) playDing(880);
      setPrCelebration({ name: ex!.name, weight: Number(updateWeightVal) });
      setTimeout(() => setPrCelebration(null), 2800);
    } else {
      if (settings.hapticFeedback) haptic([20, 40, 20]);
      if (settings.soundEffects) playDing(660);
    }
    setUpdateWeightVal('');
    setEditingExId(null);
  };

  return (
    <div className="pb-32 px-1">
      <header className="mb-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-semibold tracking-tighter text-content">Gimnasio</h1>
        </div>

        {/* Toggle Pesas / Rutas */}
        <div className="flex gap-2 bg-surface p-1 rounded-2xl border border-line/5 mb-5">
          <button onClick={() => setGymTab('pesas')} className={`flex-1 py-3 rounded-xl font-medium text-[10px] tracking-tight transition-all ${gymTab === 'pesas' ? 'bg-white text-black shadow-lg' : 'text-muted'}`}>Pesas</button>
          <button onClick={() => setGymTab('rutas')} className={`flex-1 py-3 rounded-xl font-medium text-[10px] tracking-tight transition-all ${gymTab === 'rutas' ? 'bg-white text-black shadow-lg' : 'text-muted'}`}>Rutas</button>
        </div>

        {gymTab === 'pesas' && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-6 px-6">
          {MUSCLES.map(m => (
            <button
              key={m}
              onClick={() => setActiveGymMuscle(m)}
              className={`px-6 py-3 rounded-2xl whitespace-nowrap font-medium text-[10px] tracking-tight transition-all ${activeGymMuscle === m ? 'bg-white text-black scale-105 shadow-2xl shadow-white/10' : 'bg-surface text-muted border border-line/5'}`}
            >
              {m}
            </button>
          ))}
        </div>
        )}
      </header>

      {gymTab === 'rutas' && <RoutesView />}

      {gymTab === 'pesas' && (
      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {filteredExercises.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-2 text-center py-20 text-muted font-medium text-[10px] tracking-tight">
                No hay ejercicios en {activeGymMuscle}
            </motion.div>
          )}

          {filteredExercises.map((ex) => {
            const currentWeight = ex.weightHistory[ex.weightHistory.length - 1];
            const role = getInsultRole(currentWeight);
            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={ex.id}
                className="bg-surface/80 backdrop-blur-xl border border-line/5 rounded-[26px] p-4 relative overflow-hidden group shadow-xl"
              >
                <button 
                  onClick={() => { if(confirm('¿Eliminar ejercicio?')) deleteExercise(ex.id) }} 
                  className="absolute top-3 right-3 text-muted hover:text-red-500 transition-colors p-1.5"
                >
                  <Trash2 size={15} />
                </button>

                <div className="mb-4 pr-6">
                    <span className={`inline-block px-2 py-0.5 rounded-full ${role.bg} ${role.color} text-[10px] font-medium tracking-tight mb-2`}>
                        {role.label}
                    </span>
                    <h3 className="text-lg font-semibold text-content leading-tight break-words">{ex.name}</h3>
                </div>

                <div className="flex justify-between items-end mb-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium text-muted tracking-tight mb-0.5">Récord</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-semibold text-content tabular-nums">{toDisplay(currentWeight)}</span>
                        <span className="text-[11px] font-medium text-muted">{unitLabel}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setEditingExId(ex.id)}
                    className="bg-surface-2 text-content p-2.5 rounded-2xl hover:bg-surface-2 transition-all shadow-lg active:scale-95"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Stashed Weights */}
                <div className="flex flex-wrap items-center gap-2 p-2.5 bg-app/20 rounded-xl border border-line/5">
                  <History size={12} className="text-muted" />
                  {ex.weightHistory.map((w, i) => (
                    <span key={i} className={`text-[11px] font-medium tracking-tighter ${i === ex.weightHistory.length - 1 ? 'text-accent' : 'text-muted line-through opacity-40'}`}>
                        {toDisplay(w)}{unit}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      )}

      {/* Modal Añadir */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 bg-app/90 backdrop-blur-md">
            <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }} className="bg-surface border border-line/10 w-full max-w-sm rounded-[40px] p-8 relative">
              <button onClick={() => setIsAddModalOpen(false)} className="mx-auto w-12 h-1.5 bg-surface-2 rounded-full mb-8 sm:hidden" />
              <h2 className="text-2xl font-semibold text-content mb-8 tracking-tighter">Nuevo Ejercicio</h2>
              <form onSubmit={handleAdd} className="flex flex-col gap-4 text-content">
                <input autoFocus placeholder="Nombre (ej. Press Banca)" value={newExName} onChange={e => setNewExName(e.target.value)} className="bg-app border border-line/5 rounded-2xl px-6 py-5 font-medium outline-none focus:border-line/20" />
                <input type="number" placeholder={`Peso inicial (${unit})`} value={newExWeight} onChange={e => setNewExWeight(e.target.value)} className="bg-app border border-line/5 rounded-2xl px-6 py-5 font-medium outline-none focus:border-line/20" />
                <button type="submit" className="bg-white text-black py-5 rounded-2xl font-medium tracking-tight mt-4">Guardar</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Actualizar Peso */}
      <AnimatePresence>
        {editingExId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 bg-app/90 backdrop-blur-md">
            <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }} className="bg-surface border border-line/10 w-full max-w-sm rounded-[40px] p-8 relative">
              <h2 className="text-2xl font-semibold text-content mb-2 tracking-tighter text-center">Nuevo Récord</h2>
              <p className="text-center text-muted text-xs font-medium mb-8 tracking-tight">¿Cuánto has levantado hoy? ({unitLabel})</p>
              <form onSubmit={handleUpdateWeight} className="flex flex-col gap-4 text-center">
                <input type="number" autoFocus placeholder="00" value={updateWeightVal} onChange={e => setUpdateWeightVal(e.target.value)} className="bg-transparent text-content text-7xl font-medium text-center outline-none mb-4" />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setEditingExId(null)} className="flex-1 bg-surface-2 text-content py-5 rounded-2xl font-medium tracking-tight">Cancelar</button>
                  <button type="submit" className="flex-1 bg-accent text-content py-5 rounded-2xl font-medium tracking-tight shadow-[0_0_20px_rgba(16,185,129,0.3)]">Confirmar</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cronómetro de descanso (botón flotante + overlay) */}
      {/* Solo tiene sentido entre series: en Rutas estorba */}
      {gymTab === 'pesas' && <RestTimer />}

      {/* Celebración de RÉCORD */}
      <AnimatePresence>
        {prCelebration && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-app/80 backdrop-blur-md pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 12 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="text-7xl mb-2"
              >
                🏆
              </motion.div>
              <p className="text-amber-400 font-medium tracking-tight text-sm mb-1">¡Nuevo Récord!</p>
              <h2 className="text-5xl font-semibold text-content tracking-tighter mb-2">{prCelebration.weight} {unitLabel}</h2>
              <p className="text-muted font-medium tracking-tight text-xs">{prCelebration.name}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
