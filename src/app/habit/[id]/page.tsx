'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useHabitStore';
import { isCreator } from '@/store/useHabitStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft24Regular, 
  Fire24Regular,
  Search24Regular, 
  Trophy24Regular, 
  Checkmark24Regular, 
  Dismiss24Regular, 
  Calendar24Regular, 
  Share24Regular,
  Warning24Regular,
  Person24Regular,
  People24Regular
} from '@fluentui/react-icons';
import { useState, useMemo } from 'react';
import { YearlyHeatmap } from '@/components/ui/YearlyHeatmap';
import { ReminderPicker } from '@/components/ui/ReminderPicker';

export default function HabitDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { habits, friends, inviteToHabit, userId, userCode, habitReminders, setHabitReminder } = useAppStore();
  const habit = habits.find(h => h.id === id);
  
  const [searchFriend, setSearchFriend] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{msg: string, type: 's'|'e'} | null>(null);

  const participants = habit?.participants || [];
  const isShared = participants.length > 1;

  
  const participantsWithStats = useMemo(() => {
    return participants.map(p => {
      const history = p.history || {};
      const totalCompletions = Object.values(history).filter(v => v === true).length;
      return { ...p, totalCompletions };
    });
  }, [participants]);

  const podium = useMemo(() => {
    return [...participantsWithStats].sort((a, b) => b.totalCompletions - a.totalCompletions);
  }, [participantsWithStats]);

  // Total propio: en retos individuales se muestra junto al título
  const myCompletions = useMemo(
    () => Object.values(habit?.history || {}).filter((v) => v === true).length,
    [habit],
  );

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(searchFriend.toLowerCase()) && 
    !participants.some(p => p.id === f.id)
  );

  if (!habit) return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center p-6 text-center">
        <Warning24Regular className="text-neutral-800 mb-4" style={{ fontSize: 48 }} />
        <h1 className="text-content font-semibold text-xl tracking-tighter">Hábito no encontrado</h1>
        <button onClick={() => router.push('/')} className="mt-4 text-accent font-medium text-[10px] tracking-tight border-b border-accent pb-1">Volver al Dashboard</button>
    </div>
  );

  // Enlace de invitación al reto. Lleva el reto y mi código: quien lo abra
  // se une al reto y además nos hacemos amigos, aunque tenga que registrarse.
  const shareHabit = async () => {
    const url = `${window.location.origin}/?join=${habit.id}${userCode ? `&ref=${userCode}` : ''}`;
    const text = `¡Únete a mi reto "${habit.title}" en GymRace!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'GymRace', text, url });
        return;
      }
    } catch { /* el usuario canceló el diálogo */ }
    // Sin API de compartir (escritorio): abrimos WhatsApp directamente
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}
${url}`)}`, '_blank');
  };

  const handleInvite = async (friendId: string, name: string) => {
    const res = await inviteToHabit(habit.id, friendId);
    setFeedback({ msg: res.success ? `¡Reto enviado a ${name}!` : res.message, type: res.success ? 's' : 'e' });
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="min-h-screen bg-app text-content pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-app/80 backdrop-blur-xl border-b border-line/5 p-6">
        <div className="flex items-center justify-between mb-4">
            <button onClick={() => router.push('/')} className="p-3 bg-surface rounded-2xl border border-line/5 active:scale-90 transition-all">
                <ArrowLeft24Regular />
            </button>
            <div className="flex -space-x-3 pr-2">
                {participants.map(p => (
                    <div key={p.id} className="w-10 h-10 rounded-full border-2 border-app bg-surface-2 flex items-center justify-center text-sm shadow-xl overflow-hidden">
                        {p.avatar.startsWith('http') ? <img src={p.avatar} className="w-full h-full object-cover" /> : p.avatar}
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                {/* Invitar amigos ya registrados */}
                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    aria-label="Invitar amigos"
                    className="w-10 h-10 rounded-full bg-surface border border-line/10 text-content flex items-center justify-center active:scale-90 transition-all"
                >
                    <People24Regular style={{ fontSize: 20 }} />
                </button>
                {/* Enlace para quien todavía no usa la app */}
                <button
                    onClick={shareHabit}
                    aria-label="Compartir enlace del reto"
                    className="w-10 h-10 rounded-full bg-accent text-black flex items-center justify-center shadow-lg active:scale-90 transition-all"
                >
                    <Share24Regular style={{ fontSize: 20 }} />
                </button>
            </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display lowercase first-letter:uppercase text-4xl font-bold tracking-tight">{habit.title}</h1>
          {/* En retos individuales no hay podio: el total va aquí, con estrella */}
          {!isShared && (
            <span className="flex items-center gap-1 text-amber-500">
              <Fire24Regular style={{ fontSize: 17 }} />
              <span className="font-medium text-lg tabular-nums leading-none">{myCompletions}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 mt-3">
          <ReminderPicker
            value={habitReminders[habit.id] || null}
            onChange={(v) => setHabitReminder(habit.id, v)}
          />
          <span className="text-[10px] font-medium text-muted tracking-tight">
            {habitReminders[habit.id] ? 'Recordatorio diario' : 'Sin recordatorio'}
          </span>
        </div>
      </header>

      <main className="p-6 space-y-12">
        {/* PODIUM / RANKING — solo tiene sentido si el reto es colectivo */}
        {isShared && (
        <section>
            <div className="flex items-center gap-2 mb-6">
                <Trophy24Regular className="text-amber-500" style={{ fontSize: 18 }} />
                <h2 className="text-[11px] font-medium text-muted tracking-tight">Podio</h2>
            </div>
            <div className="space-y-3">
                {podium.map((p, i) => (
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                        key={p.id}
                        className={`bg-surface/50 border ${i === 0 ? 'border-amber-500/30' : 'border-line/5'} p-5 rounded-[32px] flex items-center justify-between shadow-2xl overflow-hidden relative`}
                    >
                        {i === 0 && <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 blur-2xl rounded-full -mr-12 -mt-12" />}
                        <div className="flex items-center gap-4 relative z-10">
                            <span className={`text-lg font-medium ${i === 0 ? 'text-amber-500' : 'text-muted'}`}>0{i + 1}</span>
                            <div className="w-12 h-12 rounded-full bg-surface-2 border border-line/5 overflow-hidden flex items-center justify-center text-xl">
                                {p.avatar && p.avatar.startsWith('http') ? (
                                    <img src={p.avatar} className="w-full h-full object-cover" />
                                ) : (
                                    <Person24Regular className="text-muted" />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-normal text-content text-[15px] tracking-tight leading-none">
                                        {p.id === userId ? 'Tú' : p.name}
                                    </h3>
                                    {isCreator(p.name) && (
                                        <span className="bg-amber-500/10 text-amber-500 text-[10px] font-normal px-1.5 py-0.5 rounded-md border border-amber-500/20 tracking-tight">El Creador</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end relative z-10">
                            <div className="flex items-baseline gap-1">
                                <span className={`text-2xl font-semibold ${i === 0 ? 'text-amber-400' : 'text-content'}`}>{p.totalCompletions}</span>
                                <Fire24Regular className="text-amber-500" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
        )}

        {/* YEARLY GRAPHS PER PARTICIPANT */}
        <section className="space-y-12">
            <div className="flex items-center gap-2 px-1">
                <Calendar24Regular className="text-muted" style={{ fontSize: 18 }} />
                <h2 className="text-[11px] font-medium text-muted tracking-tight">Progreso del año</h2>
            </div>
            {participants.map((p, i) => (
                <div key={p.id} className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <h4 className="font-normal text-content/80 text-[15px] tracking-tight">
                            {/* comparamos por id: antes se cotejaba p.name con userId
                                (nombre contra id) y nunca coincidía */}
                            {participants.length <= 1 || p.id === userId
                              ? 'Mi progreso'
                              : `Progreso de ${p.name}`}
                        </h4>
                        {isCreator(p.name) && (
                            <span className="bg-amber-500/10 text-amber-500 text-[10px] font-medium px-1 py-0.5 rounded-md border border-amber-500/20 tracking-[0.1em]">El Creador</span>
                        )}
                    </div>
                    <YearlyHeatmap data={p.history} colorTheme={habit.colorTheme} startDate={habit.createdAt} />
                </div>
            ))}
        </section>
      </main>

      {/* INVITE MODAL */}
      <AnimatePresence>
        {isInviteModalOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-app/95 backdrop-blur-xl flex items-center justify-center p-6">
                <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }} className="bg-surface border border-line/10 w-full max-w-md rounded-[48px] p-8 shadow-3xl relative overflow-hidden">
                    <button onClick={() => setIsInviteModalOpen(false)} className="absolute top-6 right-6 text-muted p-2"><Dismiss24Regular /></button>
                    
                    <header className="mb-8">
                        <div className="w-16 h-16 bg-white rounded-3xl mb-4 flex items-center justify-center text-black shadow-xl">
                            <Share24Regular style={{ fontSize: 32 }} />
                        </div>
                        <h2 className="text-3xl font-semibold text-content tracking-tighter leading-none mb-1">Invitar al Reto</h2>
                        <p className="text-[10px] font-medium text-muted tracking-tight">Escoge a tus compañeros de armas</p>
                    </header>

                    <div className="relative mb-8">
                        <Search24Regular className="absolute left-6 top-1/2 -translate-y-1/2 text-muted" />
                        <input 
                            type="text" placeholder="Busca entre tus amigos..." value={searchFriend} onChange={e => setSearchFriend(e.target.value)}
                            className="w-full bg-app/40 border border-line/5 rounded-3xl pl-16 pr-6 py-6 text-content font-medium outline-none focus:border-line/10 transition-all text-sm"
                        />
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredFriends.length === 0 && <p className="text-center text-[10px] font-medium text-muted py-10">No hay amigos disponibles para invitar</p>}
                        {filteredFriends.map(f => (
                            <div key={f.id} className="bg-app/20 border border-line/5 p-4 rounded-3xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-lg overflow-hidden border border-line/5 shadow-inner">
                                        {f.avatar?.startsWith('http') ? (
                                            <img src={f.avatar} className="w-full h-full object-cover" />
                                        ) : (
                                            <Person24Regular className="text-muted" />
                                        )}
                                    </div>
                                    <h4 className="font-medium text-content">{f.name}</h4>
                                </div>
                                <button 
                                    onClick={() => handleInvite(f.id, f.name)}
                                    className="p-3 bg-white text-black rounded-2xl shadow-xl active:scale-90 transition-all flex items-center justify-center"
                                >
                                    <Checkmark24Regular />
                                </button>
                            </div>
                        ))}
                    </div>

                    {feedback && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 p-4 rounded-2xl text-[10px] font-medium text-center tracking-tight ${feedback.type === 's' ? 'bg-accent text-content' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                            {feedback.msg}
                        </motion.div>
                    )}
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
