'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useHabitStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft24Regular, 
  Fire24Filled, 
  Star24Regular, 
  Search24Regular, 
  Trophy24Regular, 
  Checkmark24Regular, 
  Dismiss24Regular, 
  Calendar24Regular, 
  Share24Regular,
  Add24Filled,
  ArrowClockwise24Regular,
  Warning24Regular,
  Person24Regular
} from '@fluentui/react-icons';
import { useState, useMemo } from 'react';
import { YearlyHeatmap } from '@/components/ui/YearlyHeatmap';

export default function HabitDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { habits, friends, inviteToHabit, userId, habitReminders, setHabitReminder } = useAppStore();
  const habit = habits.find(h => h.id === id);
  
  const [searchFriend, setSearchFriend] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{msg: string, type: 's'|'e'} | null>(null);

  const participants = habit?.participants || [];

  const RANK_TITLES = [
    "DIOS DE LA GUERRA",
    "BESTIA INDOMABLE",
    "EXTERMINADOR",
    "TITÁN DE SANGRE",
    "MÁQUINA DE MATAR",
    "DEMONIO DEL HIERRO",
    "GLADIADOR DE ÉLITE",
    "CAZADOR DE ALMAS",
    "DESTRUCTOR",
    "MONSTRUO",
    "BÁRBARO",
    "SOLDADO RASO",
    "RECLUTA DÉBIL",
    "ESTORBO",
    "BASURA HUMANA"
  ];
  
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

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(searchFriend.toLowerCase()) && 
    !participants.some(p => p.id === f.id)
  );

  if (!habit) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <Warning24Regular className="text-neutral-800 mb-4" style={{ fontSize: 48 }} />
        <h1 className="text-content font-black text-xl uppercase tracking-tighter">Hábito no encontrado</h1>
        <button onClick={() => router.push('/')} className="mt-4 text-accent font-bold uppercase text-[10px] tracking-widest border-b border-accent pb-1">Volver al Dashboard</button>
    </div>
  );

  const handleInvite = async (friendId: string, name: string) => {
    const res = await inviteToHabit(habit.id, friendId);
    setFeedback({ msg: res.success ? `¡Reto enviado a ${name}!` : res.message, type: res.success ? 's' : 'e' });
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="min-h-screen bg-black text-content pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-line/5 p-6">
        <div className="flex items-center justify-between mb-4">
            <button onClick={() => router.push('/')} className="p-3 bg-surface rounded-2xl border border-line/5 active:scale-90 transition-all">
                <ArrowLeft24Regular />
            </button>
            <div className="flex -space-x-3 pr-2">
                {participants.map(p => (
                    <div key={p.id} className="w-10 h-10 rounded-xl border-2 border-black bg-surface-2 flex items-center justify-center text-sm shadow-xl overflow-hidden">
                        {p.avatar.startsWith('http') ? <img src={p.avatar} className="w-full h-full object-cover" /> : p.avatar}
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={async () => {
                        const btn = document.getElementById('sync-habit-btn');
                        btn?.classList.add('animate-spin');
                        await useAppStore.getState().initialize();
                        setTimeout(() => btn?.classList.remove('animate-spin'), 1000);
                    }}
                    className="p-3 bg-surface rounded-2xl border border-line/5 active:scale-95 transition-all text-muted hover:text-content"
                >
                    <ArrowClockwise24Regular id="sync-habit-btn" />
                </button>
                <button 
                    onClick={() => setIsInviteModalOpen(true)}
                    className="w-10 h-10 rounded-xl border-2 border-black bg-white text-black flex items-center justify-center shadow-xl active:scale-90 transition-all font-black"
                >
                    <Add24Filled />
                </button>
            </div>
        </div>
        <h1 className="text-4xl font-black tracking-tighter italic uppercase">{habit.title}</h1>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-sm">⏰</span>
          <input
            type="time"
            value={habitReminders[habit.id] || ''}
            onChange={(e) => {
              setHabitReminder(habit.id, e.target.value || null);
              if (e.target.value && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
            }}
            className="bg-surface border border-line/10 rounded-xl px-3 py-1.5 text-content font-black text-sm outline-none"
          />
          <span className="text-[10px] font-black text-muted uppercase tracking-widest">
            {habitReminders[habit.id] ? 'Recordatorio diario' : 'Sin recordatorio'}
          </span>
          {habitReminders[habit.id] && (
            <button onClick={() => setHabitReminder(habit.id, null)} className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Quitar</button>
          )}
        </div>
      </header>

      <main className="p-6 space-y-12">
        {/* PODIUM / RANKING */}
        <section>
            <div className="flex items-center gap-2 mb-6">
                <Trophy24Regular className="text-amber-500" />
                <h2 className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Podio de Guerreros</h2>
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
                            <span className={`text-lg font-black italic ${i === 0 ? 'text-amber-500' : 'text-muted'}`}>0{i + 1}</span>
                            <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-line/5 overflow-hidden flex items-center justify-center text-xl">
                                {p.avatar && p.avatar.startsWith('http') ? (
                                    <img src={p.avatar} className="w-full h-full object-cover" />
                                ) : (
                                    <Person24Regular className="text-muted" />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <h3 className="font-black text-content leading-none">
                                        {p.name === userId ? 'Tú' : p.name}
                                    </h3>
                                    {p.name.toLowerCase() === 'zzmillann' && (
                                        <span className="bg-amber-500/10 text-amber-500 text-[7px] font-black px-1 py-0.5 rounded-md border border-amber-500/20 uppercase tracking-[0.1em]">El Creador</span>
                                    )}
                                </div>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest italic ${i === 0 ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-white/10 text-muted'}`}>
                                    {(() => {
                                        const L = RANK_TITLES.length;
                                        const N = podium.length;
                                        if (N === 1) return RANK_TITLES[0];
                                        const pick = Math.floor((i / (N - 1)) * (L - 1));
                                        return RANK_TITLES[pick];
                                    })()}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end relative z-10">
                            <div className="flex items-baseline gap-1">
                                <span className={`text-2xl font-black ${i === 0 ? 'text-amber-400' : 'text-content'}`}>{p.totalCompletions}</span>
                                <Star24Regular className="text-amber-500 shadow-glow" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>

        {/* YEARLY GRAPHS PER PARTICIPANT */}
        <section className="space-y-12">
            <div className="flex items-center gap-2 px-1">
                <Calendar24Regular className="text-muted" />
                <h2 className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Gráficos de Combate (365d)</h2>
            </div>
            {participants.map((p, i) => (
                <div key={p.id} className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                         <div className="w-8 h-8 rounded-lg bg-surface border border-line/5 overflow-hidden flex items-center justify-center text-sm">
                            {p.avatar && p.avatar.startsWith('http') ? (
                                <img src={p.avatar} className="w-full h-full object-cover" />
                            ) : (
                                <Person24Regular className="text-muted" style={{ fontSize: 16 }} />
                            )}
                         </div>
                         <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <h4 className="font-black text-content text-sm uppercase tracking-tighter italic">{p.name === userId ? 'Tu Progreso' : `Progreso de ${p.name}`}</h4>
                                {p.name.toLowerCase() === 'zzmillann' && (
                                    <span className="bg-amber-500/10 text-amber-500 text-[7px] font-black px-1 py-0.5 rounded-md border border-amber-500/20 uppercase tracking-[0.1em]">El Creador</span>
                                )}
                            </div>
                         </div>
                    </div>
                    <YearlyHeatmap data={p.history} colorTheme={habit.colorTheme} startDate={habit.createdAt} />
                </div>
            ))}
        </section>
      </main>

      {/* INVITE MODAL */}
      <AnimatePresence>
        {isInviteModalOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
                <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }} className="bg-surface border border-line/10 w-full max-w-md rounded-[48px] p-8 shadow-3xl relative overflow-hidden">
                    <button onClick={() => setIsInviteModalOpen(false)} className="absolute top-6 right-6 text-muted p-2"><Dismiss24Regular /></button>
                    
                    <header className="mb-8">
                        <div className="w-16 h-16 bg-white rounded-3xl mb-4 flex items-center justify-center text-black shadow-xl">
                            <Share24Regular style={{ fontSize: 32 }} />
                        </div>
                        <h2 className="text-3xl font-black text-content italic uppercase tracking-tighter leading-none mb-1">Invitar al Reto</h2>
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest">Escoge a tus compañeros de armas</p>
                    </header>

                    <div className="relative mb-8">
                        <Search24Regular className="absolute left-6 top-1/2 -translate-y-1/2 text-muted" />
                        <input 
                            type="text" placeholder="Busca entre tus amigos..." value={searchFriend} onChange={e => setSearchFriend(e.target.value)}
                            className="w-full bg-black/40 border border-line/5 rounded-3xl pl-16 pr-6 py-6 text-content font-bold outline-none focus:border-line/10 transition-all text-sm"
                        />
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredFriends.length === 0 && <p className="text-center text-[10px] font-black text-muted uppercase py-10">No hay amigos disponibles para invitar</p>}
                        {filteredFriends.map(f => (
                            <div key={f.id} className="bg-black/20 border border-line/5 p-4 rounded-3xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center text-lg overflow-hidden border border-line/5 shadow-inner">
                                        {f.avatar?.startsWith('http') ? (
                                            <img src={f.avatar} className="w-full h-full object-cover" />
                                        ) : (
                                            <Person24Regular className="text-muted" />
                                        )}
                                    </div>
                                    <h4 className="font-black text-content">{f.name}</h4>
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
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 p-4 rounded-2xl text-[10px] font-black uppercase text-center tracking-widest ${feedback.type === 's' ? 'bg-accent text-content' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
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
