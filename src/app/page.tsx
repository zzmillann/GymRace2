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
import { useT } from '@/lib/i18n';

const THEMES = [
  { id: 'emerald', bg: 'bg-accent' },
  { id: 'indigo', bg: 'bg-indigo-500' },
  { id: 'rose', bg: 'bg-rose-500' },
  { id: 'amber', bg: 'bg-amber-500' },
  { id: 'sky', bg: 'bg-sky-500' },
];

// Solo mostramos el preloader en el primer arranque, no al volver de otra página
let bootedOnce = false;

export default function Home() {
  const { habits, addHabit, toggleHabitToday, activeTab, initialize, userId, initialized, userAvatar, userName, activeGymMuscle, settings } = useAppStore();
  const router = useRouter();
  const t = useT();
  const [mounted, setMounted] = useState(() => bootedOnce);
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

  // Invitación entrante (enlace / QR): ?add=CODIGO
  const [inviteFriend, setInviteFriend] = useState<{ id: string; name: string; avatar: string; code: string } | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  
  const today = new Date();
  const dateFormatted = today.toLocaleDateString(settings.language === 'en' ? 'en-US' : 'es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  useEffect(() => {
    bootedOnce = true;
    setMounted(true);
    initialize();
  }, [initialize]);

  // Precargamos rutas para que abrir hábito / ajustes sea instantáneo
  useEffect(() => {
    router.prefetch('/settings');
  }, [router]);

  useEffect(() => {
    habits.forEach(h => router.prefetch(`/habit/${h.id}`));
  }, [habits, router]);

  // Invitación entrante por enlace/QR (?add=CODIGO)
  useEffect(() => {
    if (!userId) return;
    const code = new URLSearchParams(window.location.search).get('add');
    if (!code) return;
    window.history.replaceState({}, '', '/');
    (async () => {
      const prof = await useAppStore.getState().getProfileByCode(code);
      if (prof && prof.id !== userId) setInviteFriend(prof);
    })();
  }, [userId]);

  const acceptInvite = async () => {
    if (!inviteFriend) return;
    setInviteBusy(true);
    const res = await useAppStore.getState().addFriendByCode(inviteFriend.code);
    setInviteBusy(false);
    setInviteMsg(res.message);
    setTimeout(() => { setInviteFriend(null); setInviteMsg(''); }, 1900);
  };

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
            className="text-content font-black italic text-5xl tracking-tighter mb-4"
        >
            GYMRACE
        </motion.div>
        
        <div 
            className="fixed bottom-12 left-0 right-0 text-center opacity-30"
        >
            <p className="text-[9px] text-content font-extralight uppercase tracking-[0.6em] italic">Developed by Alejandro Millán</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return <AuthView />;
  }

  return (
    <div className="p-6 pt-12 relative min-h-screen bg-app overflow-x-hidden">
      <AnimatePresence mode="wait">
        {activeTab === 'habits' && (
          <motion.div
            key="habits" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
          >
            <header className="flex justify-between items-start mb-10">
              <div className="flex items-center gap-4">
                <button 
                    onClick={() => setIsProfileOpen(true)}
                    className="w-14 h-14 bg-surface border border-line/5 rounded-2xl flex items-center justify-center shadow-xl active:scale-95 transition-all overflow-hidden"
                >
                    {userAvatar && userAvatar.startsWith('http') ? (
                        <img src={userAvatar} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-2xl">{userAvatar}</span>
                    )}
                </button>
                <div className="flex flex-col gap-0.5">
                  <p className="text-muted text-[9px] font-black uppercase tracking-[0.2em]">{dateFormatted}</p>
                  <h1 className="text-3xl font-black tracking-tighter text-content leading-none">{t('home.hi')}, {userName.split(' ')[0]}</h1>
                </div>
              </div>
              <button
                onClick={() => router.push('/settings')}
                className="w-10 h-10 bg-surface border border-line/5 rounded-2xl flex items-center justify-center text-muted active:scale-95 transition-all hover:text-content"
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
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-muted py-10 font-bold uppercase text-xs tracking-widest">
                    {t('home.noHabits')}
                  </motion.div>
                )}
                {habits.map((habit, idx) => (
                  <motion.div
                    layout key={habit.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.14, delay: Math.min(idx * 0.02, 0.08) }}
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
             key="gym" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
          >
            <GymView />
          </motion.div>
        )}

        {activeTab === 'library' && (
          <motion.div 
             key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
          >
             <LibraryView />
          </motion.div>
        )}

        {activeTab === 'social' && (
          <motion.div 
             key="social" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
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

      {/* Modal: invitación entrante (enlace / QR) */}
      <AnimatePresence>
        {inviteFriend && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-surface border border-line/10 w-full max-w-sm rounded-[40px] p-8 relative shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-24 h-24 rounded-[32px] bg-surface-2 border border-line/5 flex items-center justify-center text-5xl overflow-hidden mb-5 shadow-xl">
                {inviteFriend.avatar?.startsWith('http')
                  ? <img src={inviteFriend.avatar} className="w-full h-full object-cover" alt={inviteFriend.name} />
                  : <span>{inviteFriend.avatar}</span>}
              </div>
              <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Invitación de amistad</p>
              <h2 className="text-2xl font-black text-content tracking-tighter italic uppercase mb-1">{inviteFriend.name}</h2>
              <p className="text-muted text-sm font-bold mb-6">¿Quieres añadir a <span className="text-content">{inviteFriend.name}</span> como amigo?</p>

              {inviteMsg ? (
                <p className="text-accent font-black uppercase text-xs tracking-widest py-3">{inviteMsg}</p>
              ) : (
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setInviteFriend(null)} disabled={inviteBusy}
                    className="flex-1 bg-surface-2 text-content py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all disabled:opacity-50"
                  >
                    Ahora no
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.96 }} onClick={acceptInvite} disabled={inviteBusy}
                    className="flex-1 bg-accent text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] touch-manipulation disabled:opacity-50"
                  >
                    {inviteBusy ? '...' : 'Añadir'}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Habits */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-20 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-surface border border-line/10 w-full max-w-sm rounded-[40px] p-8 relative"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-muted"><X /></button>
              <h2 className="text-2xl font-black mb-8 text-content uppercase tracking-tighter">Nuevo Hábito</h2>
              <form onSubmit={handleAddHabit} className="flex flex-col gap-6">
                <div>
                  <label className="block text-xs font-black text-muted mb-2 uppercase tracking-widest">Nombre</label>
                  <input
                    autoFocus type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ej. Meditar" className="w-full bg-app border border-line/10 rounded-2xl px-5 py-4 text-content font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-muted mb-3 uppercase tracking-widest">Tema</label>
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
            <motion.div initial={{ y: -50 }} animate={{ y: 0 }} exit={{ y: -50 }} className="bg-surface border border-line/10 w-full max-w-sm rounded-[40px] p-8 pb-12 relative">
              <button onClick={() => setIsGymAddOpen(false)} className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center bg-surface-2 rounded-xl text-muted hover:text-content transition-colors">
                <X size={18} />
              </button>
              <h2 className="text-2xl font-black text-content mb-8 uppercase tracking-tighter">Nuevo Ejercicio</h2>
              <div className="flex flex-col gap-4">
                <input autoFocus placeholder="Nombre (ej. Press Banca)" value={newExName} onChange={e => setNewExName(e.target.value)} className="bg-app border border-line/5 rounded-2xl px-6 py-5 font-bold outline-none text-content text-center" />
                <input type="number" placeholder="Peso inicial (kg)" value={newExWeight} onChange={e => setNewExWeight(e.target.value)} className="bg-app border border-line/5 rounded-2xl px-6 py-5 font-bold outline-none text-content text-center" />
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
            <motion.div initial={{ y: -50 }} animate={{ y: 0 }} exit={{ y: -50 }} className="bg-surface border border-line/10 w-full max-w-sm rounded-[40px] p-8 pb-12 relative">
              <button onClick={() => setIsLibraryAddOpen(false)} className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center bg-surface-2 rounded-xl text-muted hover:text-content transition-colors">
                <X size={18} />
              </button>
              <h2 className="text-2xl font-black text-content mb-8 uppercase tracking-tighter text-center">Añadir Libro</h2>
              <div className="flex flex-col gap-4">
                <input autoFocus placeholder="Título" value={newLibTitle} onChange={e => setNewLibTitle(e.target.value)} className="bg-app border border-line/5 rounded-2xl px-6 py-5 font-bold outline-none text-content text-center" />
                <input placeholder="Autor" value={newLibAuthor} onChange={e => setNewLibAuthor(e.target.value)} className="bg-app border border-line/5 rounded-2xl px-6 py-5 font-bold outline-none text-content text-center" />
                <input type="number" placeholder="Páginas" value={newLibPages} onChange={e => setNewLibPages(e.target.value)} className="bg-app border border-line/5 rounded-2xl px-6 py-5 font-bold outline-none text-content text-center" />
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
