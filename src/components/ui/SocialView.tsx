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
    Share24Regular,
    Sparkle24Regular,
    PersonCheckmark24Regular,
    ArrowClockwise24Regular,
    Person24Regular,
    Trophy24Regular
} from '@fluentui/react-icons';
import { useAppStore, Friend } from '@/store/useHabitStore';

export function SocialView() {
    const { userCode, friends, pendingRequests, outgoingRequests, habitInvitations, searchUsers, addFriendById, acceptFriendRequest, declineFriendRequest, acceptHabitInvitation, declineHabitInvitation, getGlobalLeaderboard, refreshFriendsNowPlaying, getUserDetails } = useAppStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: string, name: string, avatar: string }[]>([]);
    const [feedback, setFeedback] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
    const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
    const [activeTab, setActiveTab] = useState<'friends' | 'pending' | 'search' | 'invites'>('friends');
    const [leaderboard, setLeaderboard] = useState<{ id: string, name: string, avatar: string, totalCompletions: number }[]>([]);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [userDetails, setUserDetails] = useState<any | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [requestedIds, setRequestedIds] = useState<string[]>([]);

    useEffect(() => {
        if (isLeaderboardOpen) {
            getGlobalLeaderboard().then(setLeaderboard);
        }
    }, [isLeaderboardOpen, getGlobalLeaderboard]);

    // Música de los amigos en vivo (aunque tú no tengas Spotify vinculado)
    useEffect(() => {
        refreshFriendsNowPlaying();
        const id = setInterval(() => refreshFriendsNowPlaying(), 20000);
        return () => clearInterval(id);
    }, [refreshFriendsNowPlaying]);

    const openUserDetails = async (id: string) => {
        setDetailsLoading(true);
        setUserDetails({ id, loading: true });
        const d = await getUserDetails(id);
        setDetailsLoading(false);
        if (d) setUserDetails(d); else setUserDetails(null);
    };

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
        if (res.success) setRequestedIds(prev => prev.includes(id) ? prev : [...prev, id]);
        setFeedback({ msg: res.success ? `Solicitud enviada a ${name}!` : res.message, type: res.success ? 'success' : 'error' });
        setTimeout(() => setFeedback(null), 3000);
    };

    const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/?add=${userCode}` : '';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=12&data=${encodeURIComponent(inviteLink)}`;

    const copyInvite = () => {
        navigator.clipboard?.writeText(inviteLink);
        setFeedback({ msg: '¡Enlace de invitación copiado!', type: 'success' });
        setTimeout(() => setFeedback(null), 2500);
    };

    const shareInvite = async () => {
        if (typeof navigator !== 'undefined' && (navigator as any).share) {
            try { await (navigator as any).share({ title: 'GymRace', text: '¡Únete y añádeme en GymRace! 💪', url: inviteLink }); } catch {}
        } else {
            copyInvite();
        }
    };

    return (
        <div className="pb-32 px-1">
            <header className="mb-8">
                <div className="flex flex-col gap-1 mb-6">
                    <p className="text-muted text-[10px] font-black uppercase tracking-[0.2em]">Comunidad</p>
                    <div className="flex items-center justify-between">
                        <h1 className="text-4xl font-black tracking-tighter text-content uppercase italic">Social</h1>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsLeaderboardOpen(true)}
                                className="p-3 bg-surface border border-line/5 rounded-2xl text-amber-500 active:scale-95 transition-all outline-none"
                            >
                                <Trophy24Regular />
                            </button>
                            <button
                                onClick={async () => {
                                    const btn = document.getElementById('social-sync-btn');
                                    btn?.classList.add('animate-spin');
                                    await useAppStore.getState().initialize();
                                    setTimeout(() => btn?.classList.remove('animate-spin'), 1000);
                                }}
                                className="p-3 bg-surface border border-line/5 rounded-2xl text-content active:scale-95 transition-all outline-none"
                                id="sync-btn-container"
                            >
                                <ArrowClockwise24Regular id="social-sync-btn" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-2 mb-6 bg-surface p-1 rounded-2xl border border-line/5">
                    {[
                        { id: 'friends', label: `Amigos `, icon: People24Regular },
                        { id: 'search', label: `Buscar`, icon: Search24Regular },
                        { id: 'pending', label: `Social`, icon: PersonAdd24Regular },
                        { id: 'invites', label: `Hábitos`, icon: Sparkle24Regular }
                    ].map(tab => (
                        <button
                            key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 py-4 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${activeTab === tab.id ? 'bg-white text-black shadow-lg font-black' : 'text-muted'}`}
                        >
                            <tab.icon />
                            <span>{tab.label}</span>
                            {(tab.id === 'pending' && pendingRequests.length > 0) || (tab.id === 'invites' && habitInvitations.length > 0) ? (
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                            ) : null}
                        </button>
                    ))}
                </div>
            </header>

            {/* Leaderboard Modal */}
            <AnimatePresence>
                {isLeaderboardOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-surface border border-line/10 w-full max-w-sm rounded-[40px] p-8 relative shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
                            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
                            
                            <button onClick={() => setIsLeaderboardOpen(false)} className="absolute top-6 right-6 p-2 bg-surface-2 rounded-xl text-muted hover:text-content transition-colors z-20">
                                <Dismiss24Regular />
                            </button>

                            <div className="flex flex-col items-center mb-10 z-10">
                                <Trophy24Regular className="text-amber-500 text-5xl mb-2 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" style={{ fontSize: 48 }} />
                                <h2 className="text-2xl font-black text-content uppercase tracking-tighter italic">Salón de la Fama</h2>
                                <p className="text-[10px] font-black text-muted uppercase tracking-widest mt-1">Global Top {leaderboard.length}</p>
                            </div>

                            <div className="flex-1 overflow-y-auto hide-scrollbar">
                                {/* Podium UI */}
                                {leaderboard.length >= 3 && (
                                    <div className="flex justify-center items-end gap-2 mb-10 mt-12 pb-4 border-b border-line/5">
                                        {/* 2nd Place */}
                                        <div className="flex flex-col items-center gap-3 w-20">
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-2xl bg-surface-2 border-2 border-slate-400/30 overflow-hidden shadow-xl flex items-center justify-center">
                                                    {leaderboard[1].avatar?.startsWith('http') ? (
                                                        <img src={leaderboard[1].avatar} className="w-full h-full object-cover" alt="2nd" />
                                                    ) : (
                                                        <span className="text-2xl">{leaderboard[1].avatar || '👤'}</span>
                                                    )}
                                                </div>
                                                <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-slate-400 text-black text-[10px] font-black rounded-lg flex items-center justify-center border-2 border-neutral-900">2</div>
                                            </div>
                                            <div className="text-center flex flex-col items-center">
                                                <p className="text-[10px] font-black text-content truncate w-20">{leaderboard[1].name}</p>
                                                {leaderboard[1].name.toLowerCase() === 'zzmillann' && (
                                                    <span className="bg-amber-500/10 text-amber-500 text-[6px] font-black px-1 py-0.5 rounded-md border border-amber-500/20 uppercase tracking-tighter mb-1">El Creador</span>
                                                )}
                                                <p className="text-[9px] font-black text-slate-400">{leaderboard[1].totalCompletions}</p>
                                            </div>
                                        </div>

                                        {/* 1st Place */}
                                        <div className="flex flex-col items-center gap-3 w-24">
                                            <div className="relative -mt-12">
                                                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute -top-10 left-1/2 -translate-x-1/2 text-amber-500">
                                                    <Sparkle24Regular style={{ fontSize: 28 }} />
                                                </motion.div>
                                                <div className="w-20 h-20 rounded-[32px] bg-surface-2 border-4 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.3)] overflow-hidden flex items-center justify-center">
                                                    {leaderboard[0].avatar?.startsWith('http') ? (
                                                        <img src={leaderboard[0].avatar} className="w-full h-full object-cover" alt="1st" />
                                                    ) : (
                                                        <span className="text-4xl">{leaderboard[0].avatar || '👤'}</span>
                                                    )}
                                                </div>
                                                <div className="absolute -bottom-2 -right-2 w-9 h-9 bg-amber-500 text-black text-[12px] font-black rounded-xl flex items-center justify-center border-4 border-neutral-900">1</div>
                                            </div>
                                            <div className="text-center flex flex-col items-center">
                                                <p className="text-xs font-black text-content truncate w-24">{leaderboard[0].name}</p>
                                                {leaderboard[0].name.toLowerCase() === 'zzmillann' && (
                                                    <span className="bg-amber-500/10 text-amber-500 text-[6px] font-black px-1 py-0.5 rounded-md border border-amber-500/20 uppercase tracking-tighter mb-1">El Creador</span>
                                                )}
                                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{leaderboard[0].totalCompletions} Éxitos</p>
                                            </div>
                                        </div>

                                        {/* 3rd Place */}
                                        <div className="flex flex-col items-center gap-3 w-20">
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-2xl bg-surface-2 border-2 border-amber-700/30 overflow-hidden shadow-xl flex items-center justify-center">
                                                    {leaderboard[2].avatar?.startsWith('http') ? (
                                                        <img src={leaderboard[2].avatar} className="w-full h-full object-cover" alt="3rd" />
                                                    ) : (
                                                        <span className="text-2xl">{leaderboard[2].avatar || '👤'}</span>
                                                    )}
                                                </div>
                                                <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-amber-700 text-black text-[10px] font-black rounded-lg flex items-center justify-center border-2 border-neutral-900">3</div>
                                            </div>
                                            <div className="text-center flex flex-col items-center">
                                                <p className="text-[10px] font-black text-content truncate w-20">{leaderboard[2].name}</p>
                                                {leaderboard[2].name.toLowerCase() === 'zzmillann' && (
                                                    <span className="bg-amber-500/10 text-amber-500 text-[6px] font-black px-1 py-0.5 rounded-md border border-amber-500/20 uppercase tracking-tighter mb-1">El Creador</span>
                                                )}
                                                <p className="text-[9px] font-black text-amber-700">{leaderboard[2].totalCompletions}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Rest of Leaderboard */}
                                <div className="space-y-3 px-2">
                                    {leaderboard.slice(3).map((entry, idx) => (
                                        <div key={entry.id} className="bg-white/5 border border-line/5 rounded-2xl p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] font-black text-muted w-4">#{idx + 4}</span>
                                                <div className="w-10 h-10 rounded-xl bg-surface-2 overflow-hidden border border-line/10 flex items-center justify-center">
                                                     {entry.avatar?.startsWith('http') ? (
                                                         <img src={entry.avatar} className="w-full h-full object-cover" alt={entry.name} />
                                                     ) : (
                                                         <span className="text-xl">{entry.avatar || '👤'}</span>
                                                     )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-black text-content text-sm tracking-tight">{entry.name}</p>
                                                        {entry.name.toLowerCase() === 'zzmillann' && (
                                                            <span className="bg-amber-500/10 text-amber-500 text-[7px] font-black px-1 py-0.5 rounded-md border border-amber-500/20 uppercase tracking-[0.1em]">El Creador</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-black text-content">{entry.totalCompletions}</span>
                                                <Star24Regular className="text-amber-500" style={{ fontSize: 14 }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid gap-4">
                <AnimatePresence mode="wait">
                    {activeTab === 'search' && (
                        <motion.div
                            key="search-view" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-4"
                        >
                            {/* SEARCH SECTION - COMPACT FOR MOBILE */}
                            <div className="bg-surface border border-line/5 p-5 rounded-[32px] space-y-6 relative min-h-[300px]">
                                <div className="space-y-4">
                                    <div className="relative">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-muted">
                                            <Search24Regular />
                                        </div>
                                        <input 
                                            type="text" placeholder="Nombre de tu rival" 
                                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full bg-black border border-line/10 rounded-2xl pl-14 pr-5 py-5 text-content font-black tracking-widest outline-none focus:border-line/20 transition-all text-center text-sm uppercase placeholder:text-muted"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <AnimatePresence>
                                            {loading && (
                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-4">
                                                    <div className="w-6 h-6 border-2 border-line/10 border-t-white rounded-full animate-spin" />
                                                </motion.div>
                                            )}
                                            {!loading && searchResults.map((u) => (
                                                <motion.div
                                                    key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                    className="bg-black/40 border border-line/5 p-3 rounded-2xl flex items-center justify-between group"
                                                >
                                                    <button onClick={() => openUserDetails(u.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left active:scale-[0.98] transition-transform">
                                                        <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center border border-line/5 overflow-hidden flex-shrink-0">
                                                            {u.avatar.startsWith('http') ? <img src={u.avatar} className="w-full h-full object-cover" /> : <Person24Regular className="text-muted" />}
                                                        </div>
                                                        <span className="font-black text-xs text-content italic uppercase truncate">{u.name}</span>
                                                    </button>
                                                    {requestedIds.includes(u.id) ? (
                                                        <div className="p-3 bg-accent text-black rounded-xl shadow-lg flex-shrink-0 ml-2">
                                                            <Checkmark24Regular />
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAddFriend(u.id, u.name)}
                                                            className="p-3 bg-white text-black rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg flex-shrink-0 ml-2"
                                                        >
                                                            <PersonAdd24Regular />
                                                        </button>
                                                    )}
                                                </motion.div>
                                            ))}
                                            {!loading && searchQuery.length >= 2 && searchResults.length === 0 && (
                                                <p className="text-center text-[10px] font-black text-muted uppercase tracking-widest py-8">No se ha encontrado a ningún guerrero</p>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                            {/* INVITE: enlace + QR (debajo del buscador) */}
                            <div className="bg-surface border border-line/5 p-6 rounded-[32px] flex flex-col items-center gap-4">
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Invita a un guerrero</p>
                                    <p className="text-[9px] font-bold text-muted/70 mt-1">Comparte tu enlace o que escaneen tu QR</p>
                                </div>
                                <div className="bg-white p-3 rounded-3xl shadow-xl">
                                    <img src={qrUrl} alt="QR de invitación" width={160} height={160} className="w-40 h-40 rounded-xl" />
                                </div>
                                <div className="w-full grid grid-cols-2 gap-2">
                                    <button onClick={copyInvite} className="bg-surface-2 text-content py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <Copy24Regular style={{ fontSize: 16 }} /> Copiar
                                    </button>
                                    <button onClick={shareInvite} className="bg-white text-black py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <Share24Regular style={{ fontSize: 16 }} /> Compartir
                                    </button>
                                </div>
                                <p className="text-[9px] font-bold text-muted">o tu código: <span className="text-content font-black tracking-widest italic">{userCode}</span></p>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'friends' && (
                        <motion.div key="friends-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            {friends.length === 0 && (
                                <div className="text-center py-20 bg-surface/40 rounded-[40px] border border-dashed border-line/10">
                                    <p className="text-muted font-bold uppercase text-[10px] tracking-[0.2em] mb-4 text-balance px-10">Agrega a tus amigos compartiendo tu perfil</p>
                                    <button onClick={() => setActiveTab('search')} className="text-content text-xs font-black uppercase tracking-widest border-b border-white pb-1">Ir al Buscador</button>
                                </div>
                            )}
                            {friends.map((friend) => (
                                <motion.div
                                    layout key={friend.id} onClick={() => setSelectedFriend(friend)}
                                    className="bg-surface border border-line/5 rounded-[32px] p-5 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center border border-line/5 text-xl overflow-hidden shadow-xl">
                                            {friend.avatar && friend.avatar.startsWith('http') ? (
                                                <img src={friend.avatar} className="w-full h-full object-cover" />
                                            ) : (
                                                <Person24Regular className="text-muted" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-black text-content tracking-tight leading-none">{friend.name}</h3>
                                                {friend.name.toLowerCase() === 'zzmillann' && (
                                                    <span className="bg-amber-500/10 text-amber-500 text-[7px] font-black px-1.5 py-0.5 rounded-md border border-amber-500/20 uppercase tracking-widest">El Creador</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-accent">
                                                <People24Regular style={{ fontSize: 16 }} />
                                                <span className="text-[10px] font-black">{friend.friendCount || 0} amigos</span>
                                            </div>
                                            {friend.spotifyTrack && (
                                                <div className="flex items-center gap-1.5 mt-1.5 text-[#1DB954]">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-pulse flex-shrink-0" />
                                                    <span className="text-[10px] font-bold truncate max-w-[150px]">{friend.spotifyTrack} · {friend.spotifyArtist}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-1 bg-black/40 px-3 py-1.5 rounded-xl border border-line/5">
                                        <Fire24Filled className="text-orange-500" />
                                        <span className="text-xs font-black text-content">{friend.currentStreak || 0}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === 'invites' && (
                        <motion.div key="invites-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            {habitInvitations.length === 0 && (
                                <div className="text-center py-20 bg-surface/40 rounded-[40px] border border-dashed border-line/10 text-muted font-bold uppercase text-[10px] tracking-[0.2em] px-10">Sin desafíos pendientes</div>
                            )}
                            {habitInvitations.map((invite) => (
                                <div key={invite.id} className="bg-surface border border-line/5 rounded-[32px] p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center border border-line/5 text-xl overflow-hidden shadow-xl">
                                            {invite.sender_avatar.startsWith('http') ? (
                                                <img src={invite.sender_avatar} className="w-full h-full object-cover" />
                                            ) : (
                                                <Person24Regular className="text-muted" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-content tracking-tight leading-tight">{invite.sender_name}</h3>
                                            <p className="text-[9px] font-black text-muted uppercase tracking-widest mt-1 italic group-hover:text-accent transition-colors">Reto: {invite.habit_title}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => declineHabitInvitation(invite.id)} className="p-3 bg-surface-2 text-rose-500 rounded-xl"><Dismiss24Regular /></button>
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
                                    <h3 className="text-[10px] font-black text-muted uppercase tracking-widest">Solicitudes por Aceptar</h3>
                                    <span className="bg-accent text-content text-[9px] font-black px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
                                </div>
                                <div className="bg-surface/50 border border-line/5 rounded-[40px] overflow-hidden">
                                    {pendingRequests.length === 0 ? (
                                        <div className="py-12 text-center text-muted font-bold uppercase text-[9px] tracking-widest">No tienes peticiones nuevas</div>
                                    ) : (
                                        <table className="w-full">
                                            <tbody className="divide-y divide-white/5">
                                                {pendingRequests.map((req) => (
                                                    <tr key={req.id}>
                                                        <td className="p-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center border border-line/5 overflow-hidden">
                                                                    <Person24Regular className="text-muted" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-content leading-none mb-1">{req.sender_name}</p>
                                                                    <p className="text-[8px] font-black text-muted uppercase tracking-widest italic">{req.sender_code}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            <div className="flex gap-2 justify-end">
                                                                <button onClick={() => declineFriendRequest(req.id)} className="w-10 h-10 flex items-center justify-center bg-surface-2 text-rose-500 rounded-xl hover:bg-surface-2 transition-all"><Dismiss24Regular /></button>
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
                                    <h3 className="text-[10px] font-black text-muted uppercase tracking-widest">Invitaciones un curso</h3>
                                    <span className="bg-surface-2 text-muted text-[9px] font-black px-2 py-0.5 rounded-full">{(outgoingRequests || []).length}</span>
                                </div>
                                <div className="bg-surface/30 border border-dashed border-line/5 rounded-[40px] overflow-hidden">
                                    {(outgoingRequests || []).length === 0 ? (
                                        <div className="py-12 text-center text-muted font-bold uppercase text-[9px] tracking-widest">No has enviado ninguna invitación</div>
                                    ) : (
                                        <div className="p-2 space-y-1">
                                            {(outgoingRequests || []).map((req) => (
                                                <div key={req.id} className="bg-black/20 p-5 rounded-[32px] flex items-center justify-between group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl border border-line/5 bg-surface flex items-center justify-center overflow-hidden">
                                                            <Person24Regular className="text-muted" />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-muted leading-none mb-1">{req.receiver_name}</p>
                                                            <p className="text-[8px] font-black text-amber-500/80 uppercase tracking-widest animate-pulse italic">Pendiente de aprobación</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => declineFriendRequest(req.id)}
                                                        className="w-10 h-10 flex items-center justify-center text-muted hover:text-rose-500 transition-colors"
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
                        className={`fixed bottom-24 left-6 right-6 z-[300] p-5 rounded-[24px] border shadow-2xl flex items-center gap-4 ${feedback.type === 'success' ? 'bg-accent border-accent text-content' : 'bg-surface border-rose-500/50 text-rose-500'}`}
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
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-surface border border-line/10 w-full max-w-sm rounded-[40px] p-8 relative shadow-2xl">
                            <button onClick={() => setSelectedFriend(null)} className="absolute top-6 right-6 text-muted group p-2 mb-2"><Dismiss24Regular /></button>

                            <div className="flex flex-col items-center mb-8">
                                <div className="w-20 h-20 rounded-3xl bg-surface-2 flex items-center justify-center text-4xl font-black mb-4 border border-line/5 overflow-hidden shadow-2xl">
                                    {selectedFriend.avatar && selectedFriend.avatar.startsWith('http') ? (
                                        <img src={selectedFriend.avatar} className="w-full h-full object-cover" />
                                    ) : (
                                        <Person24Regular style={{ fontSize: 32 }} className="text-muted" />
                                    )}
                                </div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-2xl font-black text-content italic uppercase tracking-tighter">{selectedFriend.name}</h2>
                                    {selectedFriend.name.toLowerCase() === 'zzmillann' && (
                                        <span className="bg-amber-500/10 text-amber-500 text-[9px] font-black px-2 py-1 rounded-lg border border-amber-500/20 uppercase tracking-widest">El Creador</span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-black/40 p-5 rounded-2xl border border-line/5 flex flex-col items-center">
                                    <Star24Regular className="text-accent mb-2" />
                                    <span className="text-2xl font-black text-content">{selectedFriend.totalCompletions}</span>
                                    <span className="text-[8px] font-black text-muted uppercase tracking-widest">Éxitos</span>
                                </div>
                                <div className="bg-black/40 p-5 rounded-2xl border border-line/5 flex flex-col items-center">
                                    <Fire24Filled className="text-orange-500 mb-2" />
                                    <span className="text-2xl font-black text-content">{selectedFriend.maxStreak}</span>
                                    <span className="text-[8px] font-black text-muted uppercase tracking-widest">Racha Récord</span>
                                </div>
                            </div>

                            {selectedFriend.spotifyTrack && (
                                <div className="bg-[#1DB954]/10 border border-[#1DB954]/20 rounded-2xl p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#1DB954]/20 flex items-center justify-center text-lg flex-shrink-0">🎧</div>
                                    <div className="min-w-0">
                                        <p className="text-[8px] font-black text-[#1DB954] uppercase tracking-widest mb-0.5">{selectedFriend.spotifyPlaying ? '● Ahora suena' : 'Última escucha'}</p>
                                        <p className="text-content font-black text-sm truncate">{selectedFriend.spotifyTrack}</p>
                                        <p className="text-muted text-[11px] font-bold truncate">{selectedFriend.spotifyArtist}</p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Detalles de un perfil buscado */}
            <AnimatePresence>
                {userDetails && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[450] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-surface border border-line/10 w-full max-w-sm rounded-[40px] p-8 relative shadow-2xl">
                            <button onClick={() => setUserDetails(null)} className="absolute top-6 right-6 text-muted p-2"><Dismiss24Regular /></button>

                            {(userDetails.loading || detailsLoading) ? (
                                <div className="flex justify-center py-16">
                                    <div className="w-8 h-8 border-2 border-line/10 border-t-white rounded-full animate-spin" />
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col items-center mb-8">
                                        <div className="w-20 h-20 rounded-3xl bg-surface-2 flex items-center justify-center text-4xl font-black mb-4 border border-line/5 overflow-hidden shadow-2xl">
                                            {userDetails.avatar?.startsWith('http') ? <img src={userDetails.avatar} className="w-full h-full object-cover" /> : <Person24Regular style={{ fontSize: 32 }} className="text-muted" />}
                                        </div>
                                        <h2 className="text-2xl font-black text-content italic uppercase tracking-tighter">{userDetails.name}</h2>
                                        <p className="text-[9px] font-black text-muted uppercase tracking-widest italic mt-1">{userDetails.code}</p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        <div className="bg-black/40 p-4 rounded-2xl border border-line/5 flex flex-col items-center">
                                            <People24Regular className="text-accent mb-1" />
                                            <span className="text-xl font-black text-content">{userDetails.friendCount}</span>
                                            <span className="text-[7px] font-black text-muted uppercase tracking-widest text-center">Amigos</span>
                                        </div>
                                        <div className="bg-black/40 p-4 rounded-2xl border border-line/5 flex flex-col items-center">
                                            <Fire24Filled className="text-orange-500 mb-1" />
                                            <span className="text-xl font-black text-content">{userDetails.maxStreak}</span>
                                            <span className="text-[7px] font-black text-muted uppercase tracking-widest text-center">Racha Récord</span>
                                        </div>
                                        <div className="bg-black/40 p-4 rounded-2xl border border-line/5 flex flex-col items-center">
                                            <Star24Regular className="text-amber-500 mb-1" />
                                            <span className="text-xl font-black text-content">{userDetails.totalCompletions}</span>
                                            <span className="text-[7px] font-black text-muted uppercase tracking-widest text-center">Éxitos</span>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-r from-amber-500/15 to-transparent border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 mb-6">
                                        <Trophy24Regular className="text-amber-500" style={{ fontSize: 28 }} />
                                        <div>
                                            <p className="text-[8px] font-black text-amber-500/80 uppercase tracking-widest">Top mundial</p>
                                            <p className="text-2xl font-black text-content italic">#{userDetails.rank}</p>
                                        </div>
                                    </div>

                                    {requestedIds.includes(userDetails.id) ? (
                                        <div className="w-full bg-accent/15 text-accent border border-accent/30 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2">
                                            <Checkmark24Regular /> Solicitud enviada
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleAddFriend(userDetails.id, userDetails.name)}
                                            className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
                                        >
                                            <PersonAdd24Regular /> Añadir amigo
                                        </button>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
