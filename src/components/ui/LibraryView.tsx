'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Book as BookIcon, User, Trash2, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/store/useHabitStore';

export function LibraryView() {
  const { books, addBook, updateReadPages, deleteBook } = useAppStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newPages, setNewPages] = useState('');
  const [updatePagesVal, setUpdatePagesVal] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newPages) return;
    addBook(newTitle, newAuthor || 'Anónimo', Number(newPages));
    setNewTitle('');
    setNewAuthor('');
    setNewPages('');
    setIsAddModalOpen(false);
  };

  const handleUpdatePages = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBookId || !updatePagesVal) return;
    updateReadPages(editingBookId, Number(updatePagesVal));
    setUpdatePagesVal('');
    setEditingBookId(null);
  };

  return (
    <div className="pb-32 px-1">
      <header className="mb-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col gap-1">
            <p className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.2em]">Conocimiento</p>
            <h1 className="text-4xl font-black tracking-tighter text-white">Biblioteca</h1>
          </div>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsAddModalOpen(true)}
            className="p-3 bg-white text-black rounded-2xl shadow-xl shadow-white/5"
          >
            <Plus size={24} strokeWidth={3} />
          </motion.button>
        </div>
      </header>

      <div className="grid gap-6">
        <AnimatePresence mode="popLayout">
          {books.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-neutral-600 font-bold uppercase text-[10px] tracking-widest">
                Tu biblioteca está vacía
            </motion.div>
          )}

          {books.map((book) => {
            const progress = Math.min(100, Math.round((book.readPages / book.pages) * 100));
            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={book.id}
                className="bg-neutral-900 border border-white/5 rounded-[40px] p-8 relative overflow-hidden shadow-2xl"
              >
                <button 
                  onClick={() => { if(confirm('¿Eliminar libro?')) deleteBook(book.id) }} 
                  className="absolute top-6 right-6 text-neutral-700 hover:text-red-500 transition-colors p-2"
                >
                  <Trash2 size={18} />
                </button>

                <div className="flex gap-6 mb-8">
                  <div className="w-20 h-28 bg-neutral-800 rounded-xl flex items-end justify-center border border-white/5 shadow-inner relative overflow-hidden flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <BookIcon size={32} className="text-neutral-600 mb-6" />
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${progress}%` }}
                        className="absolute bottom-0 left-0 right-0 bg-white/20 backdrop-blur-sm pointer-events-none"
                      />
                  </div>
                  <div>
                      <h3 className="text-2xl font-black text-white leading-tight mb-2">{book.title}</h3>
                      <div className="flex items-center gap-2 text-neutral-500">
                        <User size={12} />
                        <span className="text-xs font-bold uppercase tracking-tighter">{book.author}</span>
                      </div>
                      {progress === 100 && (
                        <div className="mt-4 flex items-center gap-2 text-emerald-500">
                            <CheckCircle2 size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Completado</span>
                        </div>
                      )}
                  </div>
                </div>

                {/* Progress Visual */}
                <div className="mb-8">
                    <div className="flex justify-between items-end mb-3">
                        <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Progreso de lectura</span>
                        <span className="text-2xl font-black text-white tabular-nums">{progress}%</span>
                    </div>
                    <div className="h-4 bg-black/40 rounded-full relative overflow-hidden border border-white/5">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-neutral-500">
                        <span className="text-xl font-black text-white">{book.readPages}</span>
                        <span className="text-[10px] font-black uppercase opacity-40">/ {book.pages} pág</span>
                    </div>
                    <button 
                        onClick={() => {
                            setEditingBookId(book.id);
                            setUpdatePagesVal(book.readPages.toString());
                        }}
                        className="bg-neutral-800 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-neutral-700 active:scale-95 transition-all"
                    >
                        Actualizar
                    </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Modal Añadir Libro */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="bg-neutral-900 border border-white/10 w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] p-8 pb-12 sm:pb-8 relative shadow-2xl">
              <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-tighter">Añadir Libro</h2>
              <form onSubmit={handleAdd} className="flex flex-col gap-4 text-white">
                <input autoFocus placeholder="Título" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="bg-neutral-950 border border-white/5 rounded-2xl px-6 py-5 font-bold outline-none focus:border-white/20" />
                <input placeholder="Autor" value={newAuthor} onChange={e => setNewAuthor(e.target.value)} className="bg-neutral-950 border border-white/5 rounded-2xl px-6 py-5 font-bold outline-none focus:border-white/20" />
                <input type="number" placeholder="Páginas totales" value={newPages} onChange={e => setNewPages(e.target.value)} className="bg-neutral-950 border border-white/5 rounded-2xl px-6 py-5 font-bold outline-none focus:border-white/20" />
                <button type="submit" className="bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest mt-4">Guardar en Biblioteca</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Actualizar Páginas */}
      <AnimatePresence>
        {editingBookId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="bg-neutral-900 border border-white/10 w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] p-8 pb-12 sm:pb-8 relative">
              <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter text-center">Progreso</h2>
              <p className="text-center text-neutral-500 text-xs font-bold mb-8 uppercase tracking-widest">¿Por qué página vas?</p>
              <form onSubmit={handleUpdatePages} className="flex flex-col gap-4 text-center">
                <input type="number" autoFocus placeholder="00" value={updatePagesVal} onChange={e => setUpdatePagesVal(e.target.value)} className="bg-transparent text-white text-7xl font-black text-center outline-none mb-4" />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setEditingBookId(null)} className="flex-1 bg-neutral-800 text-white py-5 rounded-2xl font-black uppercase tracking-widest">Atrás</button>
                  <button type="submit" className="flex-1 bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl">Actualizar</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
