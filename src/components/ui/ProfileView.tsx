'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dismiss24Regular, 
  ArrowExit24Regular, 
  Copy24Regular, 
  Checkmark24Regular, 
  Save24Regular, 
  Trophy24Regular,
  Person24Regular
} from '@fluentui/react-icons';
import { useAppStore } from '@/store/useHabitStore';
import { Wrapped } from './Wrapped';

const AVATAR_SEEDS = [
  'Felix', 'Aneka', 'Abigail', 'Aiden', 'George', 'Jack', 'Jasper', 'Jordan', 'Kingston', 'Lulu', 
  'Misty', 'Peanut', 'Rocco', 'Shadow', 'Tiger', 'Zoe', 'Cookie', 'Max', 'Buddy', 'Lucky'
];

export function ProfileView({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { userCode, userName, userAvatar, updateProfile, signOut, habits, getProfileViewers } = useAppStore();
  const [newName, setNewName] = useState(userName);
  const [selectedAvatar, setSelectedAvatar] = useState(userAvatar);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{t: string, type: 's'|'e'} | null>(null);
  const [wrappedOpen, setWrappedOpen] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewers, setViewers] = useState<{ id: string; name: string; avatar: string; when: string }[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);

  const openViewers = async () => {
    setViewersOpen(true);
    setViewersLoading(true);
    const list = await getProfileViewers();
    setViewers(list);
    setViewersLoading(false);
  };

  const totalStreak = habits.reduce((acc, h) => acc + h.streak, 0);

  const handleUpdate = async () => {
    setLoading(true);
    setMsg(null);
    const res = await updateProfile(newName, selectedAvatar);
    if (res.success) {
      setMsg({ t: '¡Perfil actualizado!', type: 's' });
      setTimeout(() => setMsg(null), 2000);
    } else {
      setMsg({ t: res.error || 'Error al actualizar', type: 'e' });
    }
    setLoading(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(userCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className="bg-surface border border-line/10 w-full max-w-sm rounded-[40px] p-8 relative shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -mr-16 -mt-16" />
            
            <button onClick={onClose} className="absolute top-6 right-6 text-muted group p-2 mb-2 hover:text-content transition-colors">
                <Dismiss24Regular />
            </button>

            <header className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 rounded-[32px] bg-surface-2 border-2 border-line/10 flex items-center justify-center text-5xl shadow-2xl overflow-hidden mb-4">
                    {selectedAvatar && selectedAvatar.startsWith('http') ? (
                        <img src={selectedAvatar} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                        <Person24Regular style={{ fontSize: 40 }} className="text-muted" />
                    )}
                </div>

                <div className="w-full">
                  <p className="text-[8px] font-black text-muted uppercase tracking-widest text-center mb-3">Elige tu Avatar</p>
                  <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar -mx-2 px-2">
                    {AVATAR_SEEDS.map((seed) => {
                      const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
                      const isSelected = selectedAvatar === url;
                      return (
                        <button
                          key={seed}
                          onClick={() => setSelectedAvatar(url)}
                          className={`flex-shrink-0 w-12 h-12 rounded-xl border-2 transition-all overflow-hidden ${isSelected ? 'border-accent scale-110 shadow-lg' : 'border-line/5 opacity-40 hover:opacity-100'}`}
                        >
                          <img src={url} className="w-full h-full bg-surface-2" alt={seed} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <h2 className="text-2xl font-black text-content mt-1 tracking-tighter uppercase italic">Tu Leyenda</h2>
            </header>

            <div className="space-y-6">
                <div>
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1 mb-2 block">Nombre de Guerrero</label>
                    <input 
                        type="text" value={newName} onChange={e => setNewName(e.target.value)}
                        className="w-full bg-black/40 border border-line/5 rounded-2xl px-5 py-4 text-content font-bold outline-none focus:border-line/20"
                    />
                </div>

                <div className="bg-black/40 border border-line/5 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-[8px] font-black text-muted uppercase tracking-widest">Código de Invitación</p>
                        <p className="text-lg font-black text-content tracking-widest font-mono italic">{userCode}</p>
                    </div>
                    <button onClick={copyCode} className={`p-3 rounded-xl transition-all ${copied ? 'bg-accent text-content' : 'bg-surface-2 text-content'}`}>
                        {copied ? <Checkmark24Regular /> : <Copy24Regular />}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-2/50 p-4 rounded-2xl border border-line/5 flex flex-col items-center">
                        <Trophy24Regular className="text-amber-500 mb-1" />
                        <span className="text-xl font-black text-content">{totalStreak}</span>
                        <span className="text-[8px] font-black text-muted uppercase">Racha Total</span>
                    </div>
                    <div className="bg-surface-2/50 p-4 rounded-2xl border border-line/5 flex flex-col items-center">
                        <Checkmark24Regular className="text-accent mb-1" />
                        <span className="text-xl font-black text-content">{habits.length}</span>
                        <span className="text-[8px] font-black text-muted uppercase">Hábitos</span>
                    </div>
                </div>

                {msg && (
                    <p className={`text-center text-[10px] font-black uppercase ${msg.type === 's' ? 'text-accent' : 'text-rose-500'}`}>
                        {msg.t}
                    </p>
                )}

                <button
                    onClick={() => setWrappedOpen(true)}
                    className="w-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
                >
                    📊 Mi Wrapped del mes
                </button>

                <button
                    onClick={openViewers}
                    className="w-full bg-surface-2 text-content py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 active:scale-95 transition-all border border-line/5"
                >
                    👀 Quién ha visto tu perfil
                </button>

                <div className="flex gap-4 pb-4">
                    <button 
                        onClick={handleUpdate} disabled={loading}
                        className="flex-1 bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all outline-none"
                    >
                        <Save24Regular /> {loading ? '...' : 'Guardar'}
                    </button>
                    <button 
                        onClick={signOut}
                        className="px-4 bg-surface-2 text-rose-500 rounded-2xl hover:bg-surface-2 transition-all outline-none"
                    >
                        <ArrowExit24Regular />
                    </button>
                </div>
            </div>
          </motion.div>

          <Wrapped isOpen={wrappedOpen} onClose={() => setWrappedOpen(false)} />

          {/* Quién te ha visto */}
          <AnimatePresence>
            {viewersOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-surface border border-line/10 w-full max-w-sm rounded-[40px] p-7 relative shadow-2xl max-h-[80vh] flex flex-col">
                  <button onClick={() => setViewersOpen(false)} className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center bg-surface-2 rounded-xl text-muted text-lg font-bold">✕</button>
                  <div className="flex items-center gap-2 mb-5">
                    <span className="text-xl">👀</span>
                    <h2 className="text-lg font-black text-content uppercase tracking-tighter italic">Quién te ha visto</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2">
                    {viewersLoading ? (
                      <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-line/10 border-t-white rounded-full animate-spin" /></div>
                    ) : viewers.length === 0 ? (
                      <p className="text-center text-muted font-bold uppercase text-[10px] tracking-widest py-12">Aún no te ha visto nadie 👻</p>
                    ) : viewers.map((v) => (
                      <div key={v.id} className="flex items-center gap-3 bg-black/30 border border-line/5 rounded-2xl p-3">
                        <div className="w-10 h-10 rounded-xl bg-surface-2 overflow-hidden flex items-center justify-center border border-line/5">
                          {v.avatar?.startsWith('http') ? <img src={v.avatar} className="w-full h-full object-cover" /> : <Person24Regular className="text-muted" />}
                        </div>
                        <span className="font-black text-content text-sm italic uppercase">{v.name}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
