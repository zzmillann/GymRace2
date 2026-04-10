'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft24Regular } from '@fluentui/react-icons';

export default function SettingsPage() {
  const router = useRouter();
  const [cardNumber, setCardNumber] = useState('');
  const [cvc, setCvc] = useState('');
  const [pin, setPin] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const formatCard = (val: string) => {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-neutral-950 p-6 pt-12">
      <header className="flex items-center gap-4 mb-10">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-neutral-900 border border-white/5 rounded-2xl flex items-center justify-center text-white active:scale-95 transition-all"
        >
          <ArrowLeft24Regular />
        </button>
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Ajustes</h1>
      </header>

      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-neutral-900 border border-white/5 rounded-[40px] p-8 space-y-6"
          >
            {/* Fake card preview */}
            <motion.div
              animate={{ rotateY: [0, 2, -2, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 rounded-[28px] p-6 relative overflow-hidden h-44 flex flex-col justify-between shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-purple-500/10" />
              <div className="flex justify-between items-start">
                <p className="text-white font-black text-lg tracking-widest italic">GYMRACE</p>
                <div className="w-10 h-10 rounded-full bg-amber-400/80 -mr-2 relative">
                  <div className="w-10 h-10 rounded-full bg-amber-600/80 absolute -right-3 top-0" />
                </div>
              </div>
              <div>
                <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Número de tarjeta</p>
                <p className="text-white font-black text-lg tracking-[0.2em]">
                  {cardNumber || '•••• •••• •••• ••••'}
                </p>
              </div>
            </motion.div>

            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center italic">
              "Te lo juro que no se queda en la base de datos<br/>
              y me voy a comprar un viaje a las islas mauricio<br/>
              para montar en avestruz" 🦒
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-2">
                  Nº de Tarjeta
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={formatCard(cardNumber)}
                  onChange={e => setCardNumber(e.target.value.replace(/\s/g, ''))}
                  className="w-full bg-neutral-950 border border-white/5 rounded-2xl px-6 py-4 text-white font-black tracking-widest outline-none focus:border-white/20 transition-all text-center"
                  maxLength={19}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-2">
                    CVC
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="•••"
                    value={cvc}
                    onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    className="w-full bg-neutral-950 border border-white/5 rounded-2xl px-4 py-4 text-white font-black tracking-widest outline-none focus:border-white/20 transition-all text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-2">
                    PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    placeholder="••••"
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full bg-neutral-950 border border-white/5 rounded-2xl px-4 py-4 text-white font-black tracking-widest outline-none focus:border-white/20 transition-all text-center"
                  />
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl mt-2"
              >
                Financiar el Avestruz 🦒
              </motion.button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-900 border border-white/5 rounded-[40px] p-10 flex flex-col items-center gap-6 text-center"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.3, 1] }}
              transition={{ duration: 0.8 }}
              className="text-7xl"
            >
              😈
            </motion.div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">
              Avestruz Conseguido
            </h2>
            <p className="text-neutral-500 text-sm font-bold leading-relaxed">
              Nah, es broma.<br />
              <span className="text-white font-black">No se guarda absolutamente nada.</span><br />
              Aunque si de verdad quieres financiar el viaje...<br />
              <span className="text-emerald-500 font-black">completa tus hábitos.</span>
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className="bg-white text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest"
            >
              Volver
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
