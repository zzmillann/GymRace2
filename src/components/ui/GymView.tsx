'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ArrowUpRight, History, Trash2, ChevronRight } from 'lucide-react';
import { Settings24Regular } from '@fluentui/react-icons';
import { useAppStore } from '@/store/useHabitStore';
import { haptic, playDing } from '@/lib/feedback';

// Conversión kg <-> unidad mostrada (los pesos se guardan SIEMPRE en kg)
const KG_TO_LB = 2.20462;

const MUSCLES = ['Pecho', 'Espalda', 'Pierna', 'Hombro', 'Biceps', 'Triceps'];

const getInsultRole = (weight: number) => {
  if (weight < 20) return { label: 'Fideo', color: 'text-neutral-500', bg: 'bg-neutral-500/10' };
  if (weight < 40) return { label: 'Cuerpo Escombro', color: 'text-orange-500', bg: 'bg-orange-500/10' };
  if (weight < 60) return { label: 'Pre-playa', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
  if (weight < 80) return { label: 'Humano Promedio', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
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
    updateWeight(editingExId, toKg(Number(updateWeightVal)));
    if (settings.hapticFeedback) haptic([20, 40, 20]);
    if (settings.soundEffects) playDing(660);
    setUpdateWeightVal('');
    setEditingExId(null);
  };

  return (
    <div className="pb-32 px-1">
      <header className="mb-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-black tracking-tighter text-white">Gimnasio</h1>
          <button
            onClick={() => router.push('/settings')}
            className="w-10 h-10 bg-neutral-900 border border-white/5 rounded-2xl flex items-center justify-center text-neutral-500 active:scale-95 transition-all hover:text-white"
          >
            <Settings24Regular />
          </button>
        </div>
        
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-6 px-6">
          {MUSCLES.map(m => (
            <button
              key={m}
              onClick={() => setActiveGymMuscle(m)}
              className={`px-6 py-3 rounded-2xl whitespace-nowrap font-black uppercase text-[10px] tracking-widest transition-all ${activeGymMuscle === m ? 'bg-white text-black scale-105 shadow-2xl shadow-white/10' : 'bg-neutral-900 text-neutral-500 border border-white/5'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-6">
        <AnimatePresence mode="popLayout">
          {filteredExercises.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-neutral-600 font-bold uppercase text-[10px] tracking-widest">
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
                className="bg-neutral-900/80 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 relative overflow-hidden group shadow-2xl"
              >
                <button 
                  onClick={() => { if(confirm('¿Eliminar ejercicio?')) deleteExercise(ex.id) }} 
                  className="absolute top-6 right-6 text-neutral-700 hover:text-red-500 transition-colors p-2"
                >
                  <Trash2 size={18} />
                </button>

                <div className="mb-8">
                    <span className={`inline-block px-3 py-1 rounded-full ${role.bg} ${role.color} text-[10px] font-black uppercase tracking-[0.2em] mb-3`}>
                        {role.label}
                    </span>
                    <h3 className="text-3xl font-black text-white leading-tight">{ex.name}</h3>
                </div>

                <div className="flex justify-between items-end mb-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Peso Récord</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-black text-white tabular-nums">{toDisplay(currentWeight)}</span>
                        <span className="text-sm font-black text-neutral-600">{unitLabel}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setEditingExId(ex.id)}
                    className="bg-neutral-800 text-white p-4 rounded-3xl hover:bg-neutral-700 transition-all shadow-xl active:scale-95"
                  >
                    <Plus size={24} />
                  </button>
                </div>

                {/* Stashed Weights */}
                <div className="flex flex-wrap gap-3 p-4 bg-black/20 rounded-2xl border border-white/5">
                  <History size={14} className="text-neutral-700 mr-2" />
                  {ex.weightHistory.map((w, i) => (
                    <span key={i} className={`text-xs font-black tracking-tighter ${i === ex.weightHistory.length - 1 ? 'text-emerald-500' : 'text-neutral-700 line-through opacity-40'}`}>
                        {toDisplay(w)}{unit}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Modal Añadir */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="bg-neutral-900 border border-white/10 w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] p-8 pb-12 sm:pb-8 relative">
              <button onClick={() => setIsAddModalOpen(false)} className="mx-auto w-12 h-1.5 bg-neutral-800 rounded-full mb-8 sm:hidden" />
              <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-tighter">Nuevo Ejercicio</h2>
              <form onSubmit={handleAdd} className="flex flex-col gap-4 text-white">
                <input autoFocus placeholder="Nombre (ej. Press Banca)" value={newExName} onChange={e => setNewExName(e.target.value)} className="bg-neutral-950 border border-white/5 rounded-2xl px-6 py-5 font-bold outline-none focus:border-white/20" />
                <input type="number" placeholder={`Peso inicial (${unit})`} value={newExWeight} onChange={e => setNewExWeight(e.target.value)} className="bg-neutral-950 border border-white/5 rounded-2xl px-6 py-5 font-bold outline-none focus:border-white/20" />
                <button type="submit" className="bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest mt-4">Guardar</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Actualizar Peso */}
      <AnimatePresence>
        {editingExId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="bg-neutral-900 border border-white/10 w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] p-8 pb-12 sm:pb-8 relative">
              <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter text-center">Nuevo Récord</h2>
              <p className="text-center text-neutral-500 text-xs font-bold mb-8 uppercase tracking-widest">¿Cuánto has levantado hoy? ({unitLabel})</p>
              <form onSubmit={handleUpdateWeight} className="flex flex-col gap-4 text-center">
                <input type="number" autoFocus placeholder="00" value={updateWeightVal} onChange={e => setUpdateWeightVal(e.target.value)} className="bg-transparent text-white text-7xl font-black text-center outline-none mb-4" />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setEditingExId(null)} className="flex-1 bg-neutral-800 text-white py-5 rounded-2xl font-black uppercase tracking-widest">Cancelar</button>
                  <button type="submit" className="flex-1 bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)]">Confirmar</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
