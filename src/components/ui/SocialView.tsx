'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search24Regular,
    PersonAdd24Regular,
    Fire24Filled,
    Star24Regular,
    Checkmark24Regular,
    Dismiss24Regular,
    People24Regular,
    Warning24Regular,
    Copy24Regular,
    Sparkle24Regular,
    PersonCheckmark24Regular,
    ArrowClockwise24Regular,
    Person24Regular
} from '@fluentui/react-icons';
import { useAppStore, Friend } from '@/store/useHabitStore';

export function SocialView() {
    const { userCode, friends, pendingRequests, outgoingRequests, habitInvitations, searchUsers, addFriendById, acceptFriendRequest, declineFriendRequest, acceptHabitInvitation, declineHabitInvitation } = useAppStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: string, name: string, avatar: string }[]>([]);
    const [feedback, setFeedback] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
    const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
    const [activeTab, setActiveTab] = useState<'friends' | 'pending' | 'search' | 'invites'>('friends');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        console.log("Current Friends in View:", friends);
    }, [friends]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setLoading(true);
                const results = await searchUsers(searchQuery);
                setSearchResults(results);
                setLoading(false);
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, searchUsers]);

    const handleAddFriend = async (id: string, name: string) => {
        const res = await addFriendById(id);
        setFeedback({ msg: res.success ? `Solicitud enviada a ${name}!` : res.message, type: res.success ? 'success' : 'error' });
        setTimeout(() => setFeedback(null), 3000);
    };

    return (
        <div className="pb-32 px-1">
            <header className="mb-8">
                <div className="flex flex-col gap-1 mb-6">
                    <p className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.2em]">Comunidad</p>
                    <div className="flex items-center justify-between">
                        <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">Gimnasio Social</h1>
                        <button
                            onClick={async () => {
                                const btn = document.getElementById('social-sync-btn');
                                btn?.classList.add('animate-spin');
                                await useAppStore.getState().initialize();
                                setTimeout(() => btn?.classList.remove('animate-spin'), 1000);
                            }}
                            className="p-3 bg-neutral-900 border border-white/5 rounded-2xl text-white active:scale-95 transition-all outline-none"
                            id="sync-btn-container"
                        >
                            <ArrowClockwise24Regular id="social-sync-btn" />
                        </button>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-2 mb-6 bg-neutral-900 p-1 rounded-2xl border border-white/5">
                    {[
                        { id: 'friends', label: `Amigos `, icon: People24Regular },
                        { id: 'search', label: `Buscar`, icon: Search24Regular },
                        { id: 'pending', label: `Social`, icon: PersonAdd24Regular },
                        { id: 'invites', label: `Hábitos`, icon: Sparkle24Regular }
                    ].map(tab => (
                        <button
                            key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 py-4 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${activeTab === tab.id ? 'bg-white text-black shadow-lg font-black' : 'text-neutral-500'}`}
                        >
                            <tab.icon />
                            {tab.label}
                            {(tab.id === 'pending' && pendingRequests.length > 0) || (tab.id === 'invites' && habitInvitations.length > 0) ? (
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                            ) : null}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid gap-4">
                <AnimatePresence mode="wait">
                    {activeTab === 'search' && (
                        <motion.div
                            key="search-view" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-4"
                        >
                            {/* SEARCH SECTION - COMPACT FOR MOBILE */}
                            <div className="bg-neutral-900 border border-white/5 p-5 rounded-[32px] space-y-6 relative min-h-[300px]">
                                <div className="space-y-4">
                                    <div className="relative">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-neutral-500">
                                            <Search24Regular />
                                        </div>
                                        <input 
                                            type="text" placeholder="Nombre de tu rival" 
                                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded-2xl pl-14 pr-5 py-5 text-white font-black tracking-widest outline-none focus:border-white/20 transition-all text-center text-sm uppercase placeholder:text-neutral-700"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <AnimatePresence>
                                            {loading && (
                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-4">
                                                    <div className="w-6 h-6 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                                                </motion.div>
                                            )}
                                            {!loading && searchResults.map((u) => (
                                                <motion.div
                                                    key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                    className="bg-black/40 border border-white/5 p-3 rounded-2xl flex items-center justify-between group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center border border-white/5 overflow-hidden">
                                                            {u.avatar.startsWith('http') ? <img src={u.avatar} className="w-full h-full object-cover" /> : <Person24Regular className="text-neutral-500" />}
                                                        </div>
                                                        <span className="font-black text-xs text-white italic uppercase">{u.name}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleAddFriend(u.id, u.name)}
                                                        className="p-3 bg-white text-black rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg"
                                                    >
                                                        <PersonAdd24Regular />
                                                    </button>
                                                </motion.div>
                                            ))}
                                            {!loading && searchQuery.length >= 2 && searchResults.length === 0 && (
                                                <p className="text-center text-[10px] font-black text-neutral-600 uppercase tracking-widest py-8">No se ha encontrado a ningún guerrero</p>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'friends' && (
                        <motion.div key="friends-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            {friends.length === 0 && (
                                <div className="text-center py-20 bg-neutral-900/40 rounded-[40px] border border-dashed border-neutral-800">
                                    <p className="text-neutral-600 font-bold uppercase text-[10px] tracking-[0.2em] mb-4 text-balance px-10">Agrega a tus amigos compartiendo tu perfil</p>
                                    <button onClick={() => setActiveTab('search')} className="text-white text-xs font-black uppercase tracking-widest border-b border-white pb-1">Ir al Buscador</button>
                                </div>
                            )}
                            {friends.map((friend) => (
                                <motion.div
                                    layout key={friend.id} onClick={() => setSelectedFriend(friend)}
                                    className="bg-neutral-900 border border-white/5 rounded-[32px] p-5 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center border border-white/5 text-xl overflow-hidden shadow-xl">
                                            {friend.avatar && friend.avatar.startsWith('http') ? (
                                                <img src={friend.avatar} className="w-full h-full object-cover" />
                                            ) : (
                                                <Person24Regular className="text-neutral-500" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-white tracking-tight">{friend.name}</h3>
                                            <div className="flex items-center gap-1 text-emerald-500">
                                                <People24Regular style={{ fontSize: 16 }} />
                                                <span className="text-[10px] font-black">{friend.friendCount || 0} amigos</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-1 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                                        <Fire24Filled className="text-orange-500" />
                                        <span className="text-xs font-black text-white">{friend.currentStreak || 0}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === 'invites' && (
                        <motion.div key="invites-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            {habitInvitations.length === 0 && (
                                <div className="text-center py-20 bg-neutral-900/40 rounded-[40px] border border-dashed border-neutral-800 text-neutral-600 font-bold uppercase text-[10px] tracking-[0.2em] px-10">Sin desafíos pendientes</div>
                            )}
                            {habitInvitations.map((invite) => (
                                <div key={invite.id} className="bg-neutral-900 border border-white/5 rounded-[32px] p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center border border-white/5 text-xl overflow-hidden shadow-xl">
                                            {invite.sender_avatar.startsWith('http') ? (
                                                <img src={invite.sender_avatar} className="w-full h-full object-cover" />
                                            ) : (
                                                <Person24Regular className="text-neutral-500" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-white tracking-tight leading-tight">{invite.sender_name}</h3>
                                            <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mt-1 italic group-hover:text-emerald-500 transition-colors">Reto: {invite.habit_title}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => declineHabitInvitation(invite.id)} className="p-3 bg-neutral-800 text-rose-500 rounded-xl"><Dismiss24Regular /></button>
                                        <button onClick={() => acceptHabitInvitation(invite.id)} className="p-3 bg-white text-black rounded-xl shadow-lg"><Checkmark24Regular /></button>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === 'pending' && (
                        <motion.div key="pending-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12">
                            {/* RECIBIDAS */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Solicitudes por Aceptar</h3>
                                    <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
                                </div>
                                <div className="bg-neutral-900/50 border border-white/5 rounded-[40px] overflow-hidden">
                                    {pendingRequests.length === 0 ? (
                                        <div className="py-12 text-center text-neutral-600 font-bold uppercase text-[9px] tracking-widest">No tienes peticiones nuevas</div>
                                    ) : (
                                        <table className="w-full">
                                            <tbody className="divide-y divide-white/5">
                                                {pendingRequests.map((req) => (
                                                    <tr key={req.id}>
                                                        <td className="p-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center border border-white/5 overflow-hidden">
                                                                    <Person24Regular className="text-neutral-500" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-white leading-none mb-1">{req.sender_name}</p>
                                                                    <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest italic">{req.sender_code}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            <div className="flex gap-2 justify-end">
                                                                <button onClick={() => declineFriendRequest(req.id)} className="w-10 h-10 flex items-center justify-center bg-neutral-800 text-rose-500 rounded-xl hover:bg-neutral-700 transition-all"><Dismiss24Regular /></button>
                                                                <button onClick={() => acceptFriendRequest(req.id)} className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-xl shadow-lg hover:scale-105 transition-all"><Checkmark24Regular /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>

                            {/* ENVIADAS */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Invitaciones un curso</h3>
                                    <span className="bg-neutral-800 text-neutral-400 text-[9px] font-black px-2 py-0.5 rounded-full">{(outgoingRequests || []).length}</span>
                                </div>
                                <div className="bg-neutral-900/30 border border-dashed border-white/5 rounded-[40px] overflow-hidden">
                                    {(outgoingRequests || []).length === 0 ? (
                                        <div className="py-12 text-center text-neutral-700 font-bold uppercase text-[9px] tracking-widest">No has enviado ninguna invitación</div>
                                    ) : (
                                        <div className="p-2 space-y-1">
                                            {(outgoingRequests || []).map((req) => (
                                                <div key={req.id} className="bg-black/20 p-5 rounded-[32px] flex items-center justify-between group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl border border-white/5 bg-neutral-900 flex items-center justify-center overflow-hidden">
                                                            <Person24Regular className="text-neutral-500" />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-neutral-300 leading-none mb-1">{req.receiver_name}</p>
                                                            <p className="text-[8px] font-black text-amber-500/80 uppercase tracking-widest animate-pulse italic">Pendiente de aprobación</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => declineFriendRequest(req.id)}
                                                        className="w-10 h-10 flex items-center justify-center text-neutral-600 hover:text-rose-500 transition-colors"
                                                        title="Cancelar invitación"
                                                    >
                                                        <Dismiss24Regular />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Feedback Toast */}
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed bottom-24 left-6 right-6 z-[300] p-5 rounded-[24px] border shadow-2xl flex items-center gap-4 ${feedback.type === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-neutral-900 border-rose-500/50 text-rose-500'}`}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${feedback.type === 'success' ? 'bg-white/20' : 'bg-rose-500/10'}`}>
                            {feedback.type === 'success' ? <Checkmark24Regular /> : <Warning24Regular />}
                        </div>
                        <p className="font-black uppercase tracking-widest text-[10px] flex-1">{feedback.msg}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Friend Modal Detail */}
            <AnimatePresence>
                {selectedFriend && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-neutral-900 border border-white/10 w-full max-w-sm rounded-[40px] p-8 relative shadow-2xl">
                            <button onClick={() => setSelectedFriend(null)} className="absolute top-6 right-6 text-neutral-400 group p-2 mb-2"><Dismiss24Regular /></button>

                            <div className="flex flex-col items-center mb-8">
                                <div className="w-20 h-20 rounded-3xl bg-neutral-800 flex items-center justify-center text-4xl font-black mb-4 border border-white/5 overflow-hidden shadow-2xl">
                                    {selectedFriend.avatar && selectedFriend.avatar.startsWith('http') ? (
                                        <img src={selectedFriend.avatar} className="w-full h-full object-cover" />
                                    ) : (
                                        <Person24Regular style={{ fontSize: 32 }} className="text-neutral-500" />
                                    )}
                                </div>
                                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1">{selectedFriend.name}</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-black/40 p-5 rounded-2xl border border-white/5 flex flex-col items-center">
                                    <Star24Regular className="text-emerald-500 mb-2" />
                                    <span className="text-2xl font-black text-white">{selectedFriend.totalCompletions}</span>
                                    <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Éxitos</span>
                                </div>
                                <div className="bg-black/40 p-5 rounded-2xl border border-white/5 flex flex-col items-center">
                                    <Fire24Filled className="text-orange-500 mb-2" />
                                    <span className="text-2xl font-black text-white">{selectedFriend.maxStreak}</span>
                                    <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Racha Récord</span>
                                </div>
                            </div>

                            {/* REMOVED HABIT LIST PER USER REQUEST */}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
