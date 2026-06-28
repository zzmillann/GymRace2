'use client';

import { useAppStore } from '@/store/useHabitStore';
import { HabitCard } from '@/components/ui/HabitCard';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { Settings24Regular } from '@fluentui/react-icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { BottomNav } from '@/components/layout/BottomNav';
import { GymView } from '@/components/ui/GymView';
import { LibraryView } from '@/components/ui/LibraryView';
import { SocialView } from '@/components/ui/SocialView';
import { AuthView } from '@/components/ui/AuthView';
import { ProfileView } from '@/components/ui/ProfileView';

const THEMES = [
  { id: 'emerald', bg: 'bg-emerald-500' },
  { id: 'indigo', bg: 'bg-indigo-500' },
  { id: 'rose', bg: 'bg-rose-500' },
  { id: 'amber', bg: 'bg-amber-500' },
  { id: 'sky', bg: 'bg-sky-500' },
];

export default function Home() {
  const { habits, addHabit, toggleHabitToday, activeTab, initialize, userId, initialized, userAvatar, userName, activeGymMuscle } = useAppStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGymAddOpen, setIsGymAddOpen] = useState(false);
  const [isLibraryAddOpen, setIsLibraryAddOpen] = useState(false);
  
  // Gym item states
  const [newExName, setNewExName] = useState('');
  const [newExWeight, setNewExWeight] = useState('');
  
  // Library item states
  const [newLibTitle, setNewLibTitle] = useState('');
  const [newLibAuthor, setNewLibAuthor] = useState('');
  const [newLibPages, setNewLibPages] = useState('');

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTheme, setNewTheme] = useState('emerald');
  
  const today = new Date();
  const dateFormatted = today.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });

  useEffect(() => {
    setMounted(true);
    initialize();
  }, [initialize]);

  // Retorno desde Stripe Checkout: esperamos a que el webhook marque Pro y limpiamos la URL.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pro = new URLSearchParams(window.location.search).get('pro');
    if (!pro) return;
    window.history.replaceState({}, '', '/');
    if (pro === 'success') {
      let tries = 0;
      const iv = setInterval(async () => {
        tries++;
        await initialize();
        if (useAppStore.getState().isPro || tries >= 5) clearInterval(iv);
      }, 1500);
    }
  }, [initialize]);

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addHabit({ title: newTitle.trim(), colorTheme: newTheme });
    setNewTitle('');
    setNewTheme('emerald');
    setIsModalOpen(false);
  };

  if (!mounted || !initialized) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
         <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-white font-black italic text-5xl tracking-tighter mb-4"
        >
            GYMRACE
        </motion.div>
        
        <div 
            className="fixed bottom-12 left-0 right-0 text-center opacity-30"
        >
            <p className="text-[9px] text-white font-extralight uppercase tracking-[0.6em] italic">Developed by Alejandro Millán</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return <AuthView />;
  }

  return (
    <div className="p-6 pt-12 relative min-h-screen bg-neutral-950 overflow-x-hidden">
      <AnimatePresence mode="wait">
        {activeTab === 'habits' && (
          <motion.div 
            key="habits" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
          >
            <header className="flex justify-between items-start mb-10">
              <div className="flex items-center gap-4">
                <button 
                    onClick={() => setIsProfileOpen(true)}
                    className="w-14 h-14 bg-neutral-900 border border-white/5 rounded-2xl flex items-center justify-center shadow-xl active:scale-95 transition-all overflow-hidden"
                >
                    {userAvatar && userAvatar.startsWith('http') ? (
                        <img src={userAvatar} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-2xl">{userAvatar}</span>
                    )}
                </button>
                <div className="flex flex-col gap-0.5">
                  <p className="text-neutral-500 text-[9px] font-black uppercase tracking-[0.2em]">{dateFormatted}</p>
                  <h1 className="text-3xl font-black tracking-tighter text-white leading-none">Hola, {userName.split(' ')[0]}</h1>
                </div>
              </div>
              <button
                onClick={() => router.push('/settings')}
                className="w-10 h-10 bg-neutral-900 border border-white/5 rounded-2xl flex items-center justify-center text-neutral-500 active:scale-95 transition-all hover:text-white"
              >
                <Settings24Regular />
              </button>
            </header>

            <section className="mb-10 flex flex-col gap-4">
                <CountdownTimer />
            </section>

            <div className="flex flex-col gap-4 pb-32">
              <AnimatePresence>
                {habits.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-neutral-500 py-10 font-bold uppercase text-xs tracking-widest">
                    No tienes hábitos todavía
                  </motion.div>
                )}
                {habits.map((habit, idx) => (
                  <motion.div
                    layout key={habit.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: idx * 0.05 }}
                  >
                    <HabitCard
                      id={habit.id} title={habit.title} streak={habit.streak} colorTheme={habit.colorTheme}
                      history={habit.history} onClick={() => router.push(`/habit/${habit.id}`)}
                      onToggleToday={() => toggleHabitToday(habit.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {activeTab === 'gym' && (
          <motion.div 
             key="gym" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
          >
            <GymView />
          </motion.div>
        )}

        {activeTab === 'library' && (
          <motion.div 
             key="library" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
          >
             <LibraryView />
          </motion.div>
        )}

        {activeTab === 'social' && (
          <motion.div 
             key="social" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
          >
             <SocialView />
          </motion.div>
        )}
      </AnimatePresence>
      <BottomNav
        onPlusClick={() => {
          // Gating freemium: si se supera el límite, mostramos el paywall en vez del formulario.
          const store = useAppStore.getState();
          if (!store.canCreateActivity()) {
            store.openPaywall('Has alcanzado el límite de actividades del plan gratuito.');
            return;
          }
          if (activeTab === 'habits') setIsModalOpen(true);
          else if (activeTab === 'gym') setIsGymAddOpen(true);
          else if (activeTab === 'library') setIsLibraryAddOpen(true);
        }}
      />

      <ProfileView isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* Modal Habits */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-20 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-[40px] p-8 relative"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-neutral-400"><X /></button>
              <h2 className="text-2xl font-black mb-8 text-white uppercase tracking-tighter">Nuevo Hábito</h2>
              <form onSubmit={handleAddHabit} className="flex flex-col gap-6">
                <div>
                  <label className="block text-xs font-black text-neutral-500 mb-2 uppercase tracking-widest">Nombre</label>
                  <input
                    autoFocus type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ej. Meditar" className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-5 py-4 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-neutral-500 mb-3 uppercase tracking-widest">Tema</label>
                  <div className="flex gap-3">
                    {THEMES.map((t) => (
                      <button
                        key={t.id} type="button" onClick={() => setNewTheme(t.id)}
                        className={`w-11 h-11 rounded-full transition-all ${t.bg} ${newTheme === t.id ? 'ring-4 ring-white/20 scale-110' : 'opacity-40 scale-90'}`}
                      />
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={!newTitle.trim()} className="w-full bg-white text-black font-black py-4 rounded-2xl mt-4 uppercase tracking-widest hover:bg-neutral-200 transition-all">Crear Hábito</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Gym/Library Add Modals */}
      <AnimatePresence>
        {isGymAddOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-20 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ y: -50 }} animate={{ y: 0 }} exit={{ y: -50 }} className="bg-neutral-900 border border-white/10 w-full max-w-sm rounded-[40px] p-8 pb-12 relative">
              <button onClick={() => setIsGymAddOpen(false)} className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
              <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-tighter">Nuevo Ejercicio</h2>
              <div className="flex flex-col gap-4">
                <input autoFocus placeholder="Nombre (ej. Press Banca)" value={newExName} onChange={e => setNewExName(e.target.value)} className="bg-neutral-950 border border-white/5 rounded-2xl px-6 py-5 font-bold outline-none text-white text-center" />
                <input type="number" placeholder="Peso inicial (kg)" value={newExWeight} onChange={e => setNewExWeight(e.target.value)} className="bg-neutral-950 border border-white/5 rounded-2xl px-6 py-5 font-bold outline-none text-white text-center" />
                <button 
                  onClick={() => {
                     if (!newExName || !newExWeight) return;
                     useAppStore.getState().addExercise(newExName, activeGymMuscle, Number(newExWeight));
                     setNewExName(''); setNewExWeight(''); setIsGymAddOpen(false);
                  }}
                  className="bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest mt-4 shadow-xl text-center w-full"
                >
                  Guardar Ejercicio
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isLibraryAddOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-20 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ y: -50 }} animate={{ y: 0 }} exit={{ y: -50 }} className="bg-neutral-900 border border-white/10 w-full max-w-sm rounded-[40px] p-8 pb-12 relative">
              <button onClick={() => setIsLibraryAddOpen(false)} className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center bg-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
              <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-tighter text-center">Añadir Libro</h2>
              <div className="flex flex-col gap-4">
                <input autoFocus placeholder="Título" value={newLibTitle} onChange={e => setNewLibTitle(e.target.value)} className="bg-neutral-950 border border-white/5 rounded-2xl px-6 py-5 font-bold outline-none text-white text-center" />
                <input placeholder="Autor" value={newLibAuthor} onChange={e => setNewLibAuthor(e.target.value)} className="bg-neutral-950 border border-white/5 rounded-2xl px-6 py-5 font-bold outline-none text-white text-center" />
                <input type="number" placeholder="Páginas" value={newLibPages} onChange={e => setNewLibPages(e.target.value)} className="bg-neutral-950 border border-white/5 rounded-2xl px-6 py-5 font-bold outline-none text-white text-center" />
                <button 
                  onClick={() => {
                      if (!newLibTitle || !newLibPages) return;
                      useAppStore.getState().addBook(newLibTitle, newLibAuthor || 'Anónimo', Number(newLibPages));
                      setNewLibTitle(''); setNewLibAuthor(''); setNewLibPages(''); setIsLibraryAddOpen(false);
                  }}
                  className="bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest mt-4 shadow-xl text-center w-full"
                >
                  Guardar en Biblioteca
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
