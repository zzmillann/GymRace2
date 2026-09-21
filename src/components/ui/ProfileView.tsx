'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dismiss24Regular, 
  ArrowExit24Regular, 
  Checkmark24Regular, 
  Save24Regular, 
  Trophy24Regular,
  Person24Regular,
  Camera24Regular
} from '@fluentui/react-icons';
import { useAppStore } from '@/store/useHabitStore';
import { Wrapped } from './Wrapped';
import { FramedAvatar, FRAMES, type FrameId } from './FramedAvatar';

const AVATAR_SEEDS = [
  'Felix', 'Aneka', 'Abigail', 'Aiden', 'George', 'Jack', 'Jasper', 'Jordan', 'Kingston', 'Lulu', 
  'Misty', 'Peanut', 'Rocco', 'Shadow', 'Tiger', 'Zoe', 'Cookie', 'Max', 'Buddy', 'Lucky'
];

export function ProfileView({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { userName, userAvatar, userFrame, setProfileFrame, updateProfile, signOut, habits, localAvatar, setLocalAvatarFile, clearLocalAvatar } = useAppStore();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<FrameId>((userFrame as FrameId) || 'none');
  const [newName, setNewName] = useState(userName);
  const [selectedAvatar, setSelectedAvatar] = useState(userAvatar);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{t: string, type: 's'|'e'} | null>(null);
  const [wrappedOpen, setWrappedOpen] = useState(false);

  // El modal vive montado todo el tiempo, así que los valores iniciales de
  // useState se quedan con lo que hubiera al arrancar la app: los recargamos
  // al abrir.
  //
  // Solo depende de isOpen a propósito. Con userFrame en las dependencias,
  // elegir un marco relanzaba el efecto y pisaba el avatar que estabas
  // probando con el que había guardado.
  useEffect(() => {
    if (!isOpen) return;
    const s = useAppStore.getState();
    setNewName(s.userName);
    setSelectedAvatar(s.userAvatar);
    setSelectedFrame((s.userFrame as FrameId) || 'none');
    setMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-app/95 backdrop-blur-xl"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className="bg-surface border border-line/10 w-full max-w-sm rounded-[40px] p-8 relative shadow-2xl max-h-[88vh] overflow-y-auto hide-scrollbar overscroll-contain"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -mr-16 -mt-16" />
            
            <button onClick={onClose} className="absolute top-6 right-6 text-muted group p-2 mb-2 hover:text-content transition-colors">
                <Dismiss24Regular />
            </button>

            <header className="flex flex-col items-center mb-6">
                <div className="mb-4">
                    <FramedAvatar src={localAvatar || selectedAvatar} frame={selectedFrame} size={96} />
                </div>

                {/* Selector de marco */}
                <div className="w-full mb-4">
                  <p className="text-[11px] font-medium text-muted tracking-tight text-center mb-3">Marco / Aura</p>
                  <div className="flex gap-2 overflow-x-auto pb-3 hide-scrollbar -mx-2 px-2">
                    {FRAMES.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => { setSelectedFrame(f.id); setProfileFrame(f.id); }}
                        className={`flex-shrink-0 px-3 py-2 rounded-xl border-2 transition-all flex items-center gap-1.5 ${selectedFrame === f.id ? 'border-accent bg-accent/10' : 'border-line/5 opacity-50 hover:opacity-100'}`}
                      >
                        <span className="text-sm">{f.emoji}</span>
                        <span className="text-[11px] font-medium text-content tracking-tighter">{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full">
                  <p className="text-[11px] font-medium text-muted tracking-tight text-center mb-3">Elige tu Avatar</p>
                  <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar -mx-2 px-2">
                    {/* Tu propia foto: se guarda en el dispositivo (IndexedDB), sin pasar por Supabase */}
                    <label
                      title="Subir foto"
                      className={`flex-shrink-0 w-12 h-12 rounded-full border-2 overflow-hidden flex items-center justify-center cursor-pointer transition-all ${
                        localAvatar ? 'border-accent scale-110 shadow-lg' : 'border-dashed border-line/30 text-muted hover:text-content'
                      } ${photoBusy ? 'opacity-50 animate-pulse' : ''}`}
                    >
                      <input
                        type="file" accept="image/*" className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (!f) return;
                          setPhotoBusy(true);
                          const r = await setLocalAvatarFile(f);
                          setPhotoBusy(false);
                          if (!r.success) setMsg({ t: r.error || 'No se pudo guardar la foto', type: 'e' });
                        }}
                      />
                      {localAvatar
                        ? <img src={localAvatar} className="w-full h-full object-cover" alt="" />
                        : <Camera24Regular style={{ fontSize: 20 }} />}
                    </label>
                    {AVATAR_SEEDS.map((seed) => {
                      const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
                      const isSelected = !localAvatar && selectedAvatar === url;
                      return (
                        <button
                          key={seed}
                          onClick={() => { setSelectedAvatar(url); if (localAvatar) clearLocalAvatar(); }}
                          className={`flex-shrink-0 w-12 h-12 rounded-full border-2 transition-all overflow-hidden ${isSelected ? 'border-accent scale-110 shadow-lg' : 'border-line/5 opacity-40 hover:opacity-100'}`}
                        >
                          <img src={url} className="w-full h-full bg-surface-2" alt={seed} loading="lazy" decoding="async" />
                        </button>
                      );
                    })}
                  </div>
                  {localAvatar && (
                    <button
                      onClick={() => clearLocalAvatar()}
                      className="block mx-auto -mt-1 mb-2 text-[11px] font-medium text-rose-400 tracking-tight"
                    >
                      Quitar mi foto
                    </button>
                  )}
                </div>

                <h2 className="text-2xl font-semibold text-content mt-1 tracking-tighter">Tu Leyenda</h2>
            </header>

            <div className="space-y-6">
                <div>
                    <label className="text-[10px] font-medium text-muted tracking-tight ml-1 mb-2 block">Nombre de Guerrero</label>
                    <input 
                        type="text" value={newName} onChange={e => setNewName(e.target.value)}
                        className="w-full bg-app/40 border border-line/5 rounded-2xl px-5 py-4 text-content font-medium outline-none focus:border-line/20"
                    />
                </div>


                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-2/50 p-4 rounded-2xl border border-line/5 flex flex-col items-center">
                        <Trophy24Regular className="text-amber-500 mb-1" />
                        <span className="text-xl font-semibold text-content">{totalStreak}</span>
                        <span className="text-[11px] font-medium text-muted">Racha Total</span>
                    </div>
                    <div className="bg-surface-2/50 p-4 rounded-2xl border border-line/5 flex flex-col items-center">
                        <Checkmark24Regular className="text-accent mb-1" />
                        <span className="text-xl font-semibold text-content">{habits.length}</span>
                        <span className="text-[11px] font-medium text-muted">Hábitos</span>
                    </div>
                </div>

                {msg && (
                    <p className={`text-center text-[10px] font-medium ${msg.type === 's' ? 'text-accent' : 'text-rose-500'}`}>
                        {msg.t}
                    </p>
                )}

                <button
                    onClick={() => setWrappedOpen(true)}
                    className="w-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 text-white py-4 rounded-2xl font-medium tracking-tight text-[11px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
                >
                    📊 Mi Wrapped del mes
                </button>

                <div className="flex gap-4 pb-4">
                    <button 
                        onClick={handleUpdate} disabled={loading}
                        className="flex-1 bg-white text-black py-4 rounded-2xl font-medium tracking-tight text-[10px] flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all outline-none"
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


        </motion.div>
      )}
    </AnimatePresence>
  );
}
