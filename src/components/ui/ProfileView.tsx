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
  Person24Regular,
  Camera24Regular
} from '@fluentui/react-icons';
import { useAppStore } from '@/store/useHabitStore';

export function ProfileView({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { userCode, userName, userAvatar, updateProfile, uploadAvatar, signOut, habits } = useAppStore();
  const [newName, setNewName] = useState(userName);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{t: string, type: 's'|'e'} | null>(null);

  const totalStreak = habits.reduce((acc, h) => acc + h.streak, 0);

  const handleUpdate = async () => {
    setLoading(true);
    setMsg(null);
    const res = await updateProfile(newName, userAvatar);
    if (res.success) {
      setMsg({ t: '¡Perfil actualizado!', type: 's' });
      setTimeout(() => setMsg(null), 2000);
    } else {
      setMsg({ t: res.error || 'Error al actualizar', type: 'e' });
    }
    setLoading(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const res = await uploadAvatar(file);
    if (res.success && res.url) {
        setMsg({ t: '¡Imagen subida!', type: 's' });
    } else {
        setMsg({ t: res.error || 'Error al subir imagen', type: 'e' });
    }
    setLoading(false);
  };

  const isImage = userAvatar && userAvatar.startsWith('http');

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
            className="bg-neutral-900 border border-white/10 w-full max-w-sm rounded-[40px] p-8 relative shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -mr-16 -mt-16" />
            
            <button onClick={onClose} className="absolute top-6 right-6 text-neutral-400 group p-2 mb-2 hover:text-white transition-colors">
                <Dismiss24Regular />
            </button>

            <header className="flex flex-col items-center mb-8">
                <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                    <div className="w-24 h-24 rounded-[32px] bg-neutral-800 border-2 border-white/10 flex items-center justify-center text-5xl shadow-2xl transition-transform group-hover:scale-105 overflow-hidden">
                        {isImage ? (
                            <img src={userAvatar} className="w-full h-full object-cover" alt="Profile" />
                        ) : (
                            <Person24Regular style={{ fontSize: 40 }} className="text-neutral-500" />
                        )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-white text-black p-2 rounded-xl shadow-lg">
                        <Camera24Regular style={{ fontSize: 16 }} />
                    </div>
                    <input 
                        id="avatar-upload" type="file" accept="image/*" 
                        className="hidden" onChange={handleFileChange}
                    />
                </div>
                <h2 className="text-2xl font-black text-white mt-4 tracking-tighter uppercase italic">Tu Leyenda</h2>
            </header>

            <div className="space-y-6">
                <div>
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1 mb-2 block">Nombre de Guerrero</label>
                    <input 
                        type="text" value={newName} onChange={e => setNewName(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-white/20"
                    />
                </div>

                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-[8px] font-black text-neutral-600 uppercase tracking-widest">Código de Invitación</p>
                        <p className="text-lg font-black text-white tracking-widest font-mono italic">{userCode}</p>
                    </div>
                    <button onClick={copyCode} className={`p-3 rounded-xl transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-neutral-800 text-white'}`}>
                        {copied ? <Checkmark24Regular /> : <Copy24Regular />}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-neutral-800/50 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
                        <Trophy24Regular className="text-amber-500 mb-1" />
                        <span className="text-xl font-black text-white">{totalStreak}</span>
                        <span className="text-[8px] font-black text-neutral-500 uppercase">Racha Total</span>
                    </div>
                    <div className="bg-neutral-800/50 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
                        <Checkmark24Regular className="text-emerald-500 mb-1" />
                        <span className="text-xl font-black text-white">{habits.length}</span>
                        <span className="text-[8px] font-black text-neutral-500 uppercase">Hábitos</span>
                    </div>
                </div>

                {msg && (
                    <p className={`text-center text-[10px] font-black uppercase ${msg.type === 's' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {msg.t}
                    </p>
                )}

                <div className="flex gap-4">
                    <button 
                        onClick={handleUpdate} disabled={loading}
                        className="flex-1 bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all outline-none"
                    >
                        <Save24Regular /> {loading ? '...' : 'Guardar'}
                    </button>
                    <button 
                        onClick={signOut}
                        className="px-4 bg-neutral-800 text-rose-500 rounded-2xl hover:bg-neutral-700 transition-all outline-none"
                    >
                        <ArrowExit24Regular />
                    </button>
                </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
