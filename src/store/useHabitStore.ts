import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, subDays } from 'date-fns';
import { supabase } from '@/lib/supabase';

// --- TYPES ---
export interface Habit {
  id: string; title: string; colorTheme: string;
  history: Record<string, boolean>;
  streak: number; maxStreak: number; createdAt: string;
  isShared?: boolean;
  participants?: { id: string; name: string; avatar: string; streak: number; history: Record<string, boolean> }[];
}

export interface HabitInvitation {
  id: string; habit_id: string; habit_title: string;
  sender_id: string; sender_name: string; sender_avatar: string;
}

export interface Exercise { id: string; name: string; muscle: string; weightHistory: number[]; }
export interface Book { id: string; title: string; author: string; pages: number; readPages: number; }
export interface Friend {
  id: string; name: string; code: string; avatar?: string;
  habits: { title: string; streak: number; color: string }[];
  totalCompletions: number;
  maxStreak: number;
  currentStreak: number;
  friendCount: number;
  // Spotify "ahora suena"
  spotifyTrack?: string;
  spotifyArtist?: string;
  spotifyPlaying?: boolean;
}

export interface SpotifyState {
  connected: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number; // epoch ms
}

export interface NowPlayingState { track: string; artist: string; isPlaying: boolean; albumArt?: string; }

// --- FREEMIUM / SUBSCRIPTION ---
// Límite del plan gratuito. Cuenta hábitos + ejercicios + libros.
// Al intentar crear el item nº (FREE_ACTIVITY_LIMIT + 1) salta el paywall.
// 👉 Cambia este único número para ajustar cuántas actividades son gratis.
export const FREE_ACTIVITY_LIMIT = 3;

export type SubscriptionPlan = 'free' | 'weekly' | 'monthly' | 'quarterly';

export interface AppSettings {
  // Notificaciones
  pushEnabled: boolean;
  dailyReminder: boolean;
  reminderTime: string; // 'HH:mm'
  streakAlerts: boolean;
  weeklySummary: boolean;
  socialNotifs: boolean;
  // Apariencia
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  language: 'es' | 'en';
  // Unidades y preferencias
  weightUnit: 'kg' | 'lb';
  weekStart: 'monday' | 'sunday';
  dateFormat: 'dmy' | 'mdy';
  hapticFeedback: boolean;
  soundEffects: boolean;
  // Privacidad
  publicProfile: boolean;
  showInLeaderboard: boolean;
  shareProgress: boolean;
  allowInvites: 'everyone' | 'friends' | 'none';
  // Datos (Pro)
  cloudSync: boolean;
  autoBackup: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  pushEnabled: false,
  dailyReminder: false,
  reminderTime: '20:00',
  streakAlerts: true,
  weeklySummary: true,
  socialNotifs: true,
  theme: 'dark',
  accentColor: 'emerald',
  language: 'es',
  weightUnit: 'kg',
  weekStart: 'monday',
  dateFormat: 'dmy',
  hapticFeedback: true,
  soundEffects: false,
  publicProfile: true,
  showInLeaderboard: true,
  shareProgress: true,
  allowInvites: 'everyone',
  cloudSync: false,
  autoBackup: false,
};

interface AppState {
  // User Info
  userId: string | null;
  userCode: string;
  userName: string;
  userAvatar: string; // Emoji or asset path
  initialized: boolean;

  // Auth Actions
  initialize: () => Promise<void>;
  signUp: (email: string, pass: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (identifier: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (name: string, avatar: string) => Promise<{ success: boolean; error?: string }>;
  uploadAvatar: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;

  // Habits
  habits: Habit[];
  habitInvitations: HabitInvitation[];
  addHabit: (habit: Partial<Habit>) => Promise<void>;
  toggleHabitToday: (id: string, userIdOverride?: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;

  // Shared Habits
  inviteToHabit: (habitId: string, friendId: string) => Promise<{ success: boolean; message: string }>;
  acceptHabitInvitation: (invitationId: string) => Promise<void>;
  declineHabitInvitation: (invitationId: string) => Promise<void>;

  // Gym
  exercises: Exercise[];
  activeGymMuscle: string;
  setActiveGymMuscle: (muscle: string) => void;
  addExercise: (name: string, muscle: string, initialWeight: number) => void;
  updateWeight: (id: string, newWeight: number) => void;
  deleteExercise: (id: string) => void;

  // Library
  books: Book[];
  addBook: (title: string, author: string, pages: number) => void;
  updateReadPages: (id: string, pages: number) => void;
  deleteBook: (id: string) => void;

  // Social
  friends: Friend[];
  pendingRequests: { id: string; sender_name: string; sender_code: string; sender_id: string }[];
  outgoingRequests: { id: string; receiver_name: string; receiver_id: string }[];
  searchUsers: (query: string) => Promise<{ id: string; name: string; avatar: string }[]>;
  addFriendByCode: (code: string) => Promise<{ success: boolean; message: string }>;
  addFriendById: (id: string) => Promise<{ success: boolean; message: string }>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (id: string) => void;
  getGlobalLeaderboard: () => Promise<{ id: string; name: string; avatar: string; totalCompletions: number }[]>;

  // Navigation
  activeTab: 'habits' | 'gym' | 'library' | 'social';
  setActiveTab: (tab: 'habits' | 'gym' | 'library' | 'social') => void;

  // --- Freemium / Subscription ---
  isPro: boolean;
  subscriptionPlan: SubscriptionPlan;
  paywall: { open: boolean; reason: string };
  settings: AppSettings;
  openPaywall: (reason?: string) => void;
  closePaywall: () => void;
  activatePro: (plan: SubscriptionPlan) => void;
  cancelPro: () => void;
  restorePro: () => Promise<boolean>;
  updateSettings: (patch: Partial<AppSettings>) => void;
  getActivityCount: () => number;
  canCreateActivity: () => boolean;

  // --- Spotify ---
  spotify: SpotifyState;
  nowPlaying: NowPlayingState | null;
  setSpotifyTokens: (accessToken: string, refreshToken: string | null, expiresIn: number) => void;
  disconnectSpotify: () => void;
  setNowPlaying: (np: NowPlayingState | null) => void;
  pushNowPlaying: (np: NowPlayingState | null) => Promise<void>;
  refreshSocial: () => Promise<void>;
}

const generateUserCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      userId: null, userCode: '', userName: '', userAvatar: '👤', pendingRequests: [], outgoingRequests: [], habitInvitations: [], initialized: false,
      activeTab: 'habits', setActiveTab: (activeTab) => set({ activeTab }),
      activeGymMuscle: 'Pecho', setActiveGymMuscle: (activeGymMuscle) => set({ activeGymMuscle }),

      // --- Freemium / Subscription ---
      isPro: false,
      subscriptionPlan: 'free',
      paywall: { open: false, reason: '' },
      settings: DEFAULT_SETTINGS,
      openPaywall: (reason = '') => set({ paywall: { open: true, reason } }),
      closePaywall: () => set({ paywall: { open: false, reason: '' } }),
      activatePro: (plan) => set({ isPro: true, subscriptionPlan: plan, paywall: { open: false, reason: '' } }),
      cancelPro: () => set({ isPro: false, subscriptionPlan: 'free' }),
      restorePro: async () => {
        // En producción aquí se validaría el recibo con la App Store / Stripe.
        return get().isPro;
      },
      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      getActivityCount: () => {
        const s = get();
        return s.habits.length + s.exercises.length + s.books.length;
      },
      canCreateActivity: () => {
        const s = get();
        return s.isPro || s.getActivityCount() < FREE_ACTIVITY_LIMIT;
      },

      // --- Spotify ---
      spotify: { connected: false, accessToken: null, refreshToken: null, expiresAt: 0 },
      nowPlaying: null,
      setSpotifyTokens: (accessToken, refreshToken, expiresIn) => set((state) => ({
        spotify: {
          connected: true,
          accessToken,
          // Spotify no siempre devuelve refresh_token al refrescar: conservamos el anterior.
          refreshToken: refreshToken || state.spotify.refreshToken,
          expiresAt: Date.now() + expiresIn * 1000,
        },
      })),
      disconnectSpotify: async () => {
        set({ spotify: { connected: false, accessToken: null, refreshToken: null, expiresAt: 0 }, nowPlaying: null });
        const uid = get().userId;
        if (uid) {
          await supabase.from('profiles').update({
            spotify_track: null, spotify_artist: null, spotify_is_playing: false,
          }).eq('id', uid);
        }
      },
      setNowPlaying: (np) => set({ nowPlaying: np }),
      pushNowPlaying: async (np) => {
        const uid = get().userId;
        if (!uid) return;
        await supabase.from('profiles').update({
          spotify_track: np?.track || null,
          spotify_artist: np?.artist || null,
          spotify_is_playing: np?.isPlaying || false,
          spotify_updated: new Date().toISOString(),
        }).eq('id', uid);
      },
      refreshSocial: async () => {
        const uid = get().userId;
        if (!uid) return;
        const { data: socialPending } = await supabase
          .from('friendships')
          .select('id, user_id, profiles!friendships_user_id_fkey(user_name, user_code)')
          .eq('friend_id', uid).eq('status', 'pending');
        const { data: hInvites } = await supabase
          .from('habit_invitations')
          .select('*, habits(title), profiles!habit_invitations_sender_id_fkey(user_name, avatar_url)')
          .eq('receiver_id', uid).eq('status', 'pending');
        set({
          pendingRequests: (socialPending || []).map((p: any) => ({
            id: p.id, sender_name: p.profiles?.user_name || 'Alguien',
            sender_code: p.profiles?.user_code || '---', sender_id: p.user_id,
          })),
          habitInvitations: (hInvites || []).map((i: any) => ({
            id: i.id, habit_id: i.habit_id, habit_title: i.habits?.title || 'Hábito',
            sender_id: i.sender_id, sender_name: i.profiles?.user_name || 'Alguien',
            sender_avatar: i.profiles?.avatar_url || '👤',
          })),
        });
      },

      initialize: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          set({ initialized: true, userId: null });
          return;
        }

        const currentUserId = session.user.id;
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUserId).single();

        if (profile) {
          // 1. Fetch habits where user is participant
          const { data: pData } = await supabase
            .from('habit_participants')
            .select('habit:habits(*)')
            .eq('user_id', currentUserId);

          const allHabitsRaw = (pData || []).map(p => (p as any).habit).filter(Boolean);
          const allHabitIds = allHabitsRaw.map((h: any) => h?.id).filter(Boolean);

          // 2. Fetch all participants for these habits (Including their individual history/streak)
          const { data: participantsRaw } = allHabitIds.length > 0 ? await supabase
              .from('habit_participants')
              .select('habit_id, user_id, history, streak, profiles:profiles!habit_participants_user_id_fkey(user_name, avatar_url)')
              .in('habit_id', allHabitIds) : { data: [] };

          // 3. Fetch habit invitations & social
          const { data: hInvites } = await supabase
              .from('habit_invitations')
              .select('*, habits(title), profiles!habit_invitations_sender_id_fkey(user_name, avatar_url)')
              .eq('receiver_id', currentUserId).eq('status', 'pending');

          const { data: socialPending } = await supabase
            .from('friendships')
            .select('id, user_id, profiles!friendships_user_id_fkey(user_name, user_code)')
            .eq('friend_id', currentUserId).eq('status', 'pending');

          const { data: outgoing } = await supabase
            .from('friendships')
            .select('id, friend_id, profiles!friendships_friend_id_fkey(user_name)')
            .eq('user_id', currentUserId).eq('status', 'pending');

          // --- ULTIMATE SYMMETRIC FRIENDS FETCH ---
          // Step 1: Search for ANY accepted friendship where I am involved (Sender or Receiver)
          const { data: fships } = await supabase
            .from('friendships')
            .select('user_id, friend_id')
            .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
            .eq('status', 'accepted');

          // Step 2: Get Friend IDs from my profile's manual list (Plan B)
          const { data: profBase } = await supabase.from('profiles').select('friends_list').eq('id', currentUserId).single();

          // Merge all IDs
          const friendIdsFromTable = (fships || []).map(f => f.user_id === currentUserId ? f.friend_id : f.user_id);
          const friendIdsFromArray = profBase?.friends_list || [];
          const friendIds = Array.from(new Set([...friendIdsFromTable, ...friendIdsFromArray]));

          // Step 3: Get Friend Profiles (Basic fetch for reliability)
          const { data: fProfiles } = friendIds.length > 0 ? await supabase
            .from('profiles')
            .select('id, user_name, user_code, avatar_url, total_completions, friends_list, spotify_track, spotify_artist, spotify_is_playing, spotify_updated')
            .in('id', friendIds) : { data: [] };

          // Step 4: Get Friends' Habits (Owned & Participated)
          const { data: fOwnedHabits } = friendIds.length > 0 ? await supabase
            .from('habits')
            .select('user_id, title, streak, max_streak')
            .in('user_id', friendIds) : { data: [] };

          const { data: fParticipatedHabits } = friendIds.length > 0 ? await supabase
            .from('habit_participants')
            .select('user_id, streak, habits(title, max_streak)')
            .in('user_id', friendIds) : { data: [] };

          set({
            userId: currentUserId,
            userCode: profile.user_code,
            userName: profile.user_name,
            userAvatar: profile.avatar_url || '👤',
            initialized: true,
            // Estado Pro real desde Supabase (lo marca el webhook de Stripe)
            isPro: profile.is_pro || false,
            subscriptionPlan: profile.subscription_plan || 'free',
            habits: (allHabitsRaw || []).map((h: any) => {
              if (!h) return null;
              const myPart = (participantsRaw || []).find((p: any) => p.habit_id === h.id && p.user_id === currentUserId);
              return {
                id: h.id, title: h.title, colorTheme: h.color_theme, 
                // Individual progress for shared habits
                history: myPart?.history || h.history || {},
                streak: myPart?.streak || h.streak || 0,
                maxStreak: h.max_streak, createdAt: h.created_at,
                isShared: (participantsRaw || []).filter((p: any) => p.habit_id === h.id).length > 1,
                participants: (participantsRaw || []).filter((p: any) => p.habit_id === h.id).map((p: any) => {
                    if (!p) return null;
                    return {
                        id: p.user_id, 
                        name: p.profiles?.user_name || 'Desconocido', 
                        avatar: p.profiles?.avatar_url || '👤',
                        streak: p.streak || 0,
                        history: p.history || {}
                    };
                }).filter(Boolean)
              };
            }).filter(Boolean),
            pendingRequests: (socialPending || []).map((p: any) => {
              if (!p) return null;
              return {
                id: p.id, sender_name: p.profiles?.user_name || 'Alguien', sender_code: p.profiles?.user_code || '---', sender_id: p.user_id
              };
            }).filter(Boolean),
            outgoingRequests: (outgoing || []).map((o: any) => {
              if (!o) return null;
              return {
                id: o.id, receiver_name: o.profiles?.user_name || 'Desconocido', receiver_id: o.friend_id
              };
            }).filter(Boolean),
            habitInvitations: (hInvites || []).map((i: any) => {
                if (!i) return null;
                return {
                    id: i.id, habit_id: i.habit_id, habit_title: i.habits?.title || 'Hábito',
                    sender_id: i.sender_id, sender_name: i.profiles?.user_name || 'Alguien', sender_avatar: i.profiles?.avatar_url || '👤'
                };
            }).filter(Boolean),
            friends: (fProfiles || []).map((p: any) => {
                const owned = (fOwnedHabits || []).filter(h => h.user_id === p.id);
                const participated = (fParticipatedHabits || []).filter(h => h.user_id === p.id);
                
                const allStreaks = [
                    ...owned.map(h => h.streak),
                    ...participated.map(h => h.streak)
                ];
                
                const allMaxStreaks = [
                    ...owned.map(h => h.max_streak),
                    ...participated.map(h => (h as any).habits?.max_streak)
                ];
                
                // "Ahora suena" solo si la actualización es reciente (< 5 min)
                const spotifyFresh = p.spotify_updated && (Date.now() - new Date(p.spotify_updated).getTime() < 5 * 60 * 1000);

                return {
                    id: p.id, name: p.user_name, code: p.user_code,
                    avatar: p.avatar_url, totalCompletions: p.total_completions || 0,
                    habits: [], // Simplified per user request
                    maxStreak: allMaxStreaks.length > 0 ? Math.max(...allMaxStreaks.filter(Boolean)) : 0,
                    currentStreak: allStreaks.length > 0 ? Math.max(...allStreaks) : 0,
                    friendCount: (p.friends_list || []).length,
                    spotifyTrack: spotifyFresh ? p.spotify_track : undefined,
                    spotifyArtist: spotifyFresh ? p.spotify_artist : undefined,
                    spotifyPlaying: spotifyFresh ? p.spotify_is_playing : false,
                };
            })
          });
        } else {
          set({ initialized: true, userId: currentUserId });
        }
      },

      signUp: async (email, password, name) => {
        // Check if username is taken
        const { data: existing } = await supabase.from('profiles').select('id').eq('user_name', name).single();
        if (existing) return { success: false, error: 'Este nombre de usuario ya está ocupado' };

        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) return { success: false, error: authError.message };
        if (!authData.user) return { success: false, error: 'Error al crear usuario' };

        const code = generateUserCode();
        const randomSeeds = ['Hugo', 'Felix', 'Aneka', 'Abigail', 'Aiden'];
        const randomAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeeds[Math.floor(Math.random() * randomSeeds.length)]}`;
        
        const { error: profError } = await supabase.from('profiles').insert([
          { id: authData.user.id, user_code: code, user_name: name, avatar_url: randomAvatar, email_internal: email }
        ]);
        if (profError) return { success: false, error: profError.message };

        await get().initialize();
        return { success: true };
      },

      signIn: async (username, password) => {
        // 1. Lookup email by username
        const { data: profile, error: lookupError } = await supabase
          .from('profiles')
          .select('email_internal')
          .eq('user_name', username)
          .single();

        if (lookupError || !profile?.email_internal) {
          return { success: false, error: 'Nombre de usuario no encontrado' };
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: profile.email_internal,
          password
        });

        if (error) return { success: false, error: error.message };

        const { data: fullProfile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        if (fullProfile) {
          set({ userId: data.user.id, userCode: fullProfile.user_code, userName: fullProfile.user_name, userAvatar: fullProfile.avatar_url || '👤' });
          // Fully initialize to get friends, shared habits, etc.
          await get().initialize();
        }
        return { success: true };
      },

      updateProfile: async (name, avatar) => {
        if (!get().userId) return { success: false, error: 'No autorizado' };

        const { error } = await supabase.from('profiles').update({
          user_name: name,
          avatar_url: avatar
        }).eq('id', get().userId);

        if (error) {
          if (error.code === '23505') return { success: false, error: 'Nombre de usuario ya ocupado' };
          return { success: false, error: error.message };
        }

        set({ userName: name, userAvatar: avatar });
        return { success: true };
      },

      uploadAvatar: async (file) => {
        if (!get().userId) return { success: false, error: 'No autorizado' };

        const fileExt = file.name.split('.').pop();
        const fileName = `${get().userId}-${Math.random()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file);

        if (uploadError) return { success: false, error: uploadError.message };

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        await get().updateProfile(get().userName, publicUrl);
        return { success: true, url: publicUrl };
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ userId: null, userCode: '', userName: '', habits: [] });
      },

      resetPassword: async (identifier) => {
        const id = identifier.trim();
        if (!id) return { success: false, error: 'Introduce tu usuario o email' };

        // El login es por nombre de usuario; Supabase necesita el email real.
        let email = id;
        if (!id.includes('@')) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email_internal')
            .eq('user_name', id)
            .single();
          if (!profile?.email_internal) {
            return { success: false, error: 'No encontramos ninguna cuenta con ese usuario' };
          }
          email = profile.email_internal;
        }

        const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) return { success: false, error: error.message };
        return { success: true };
      },

      updatePassword: async (newPassword) => {
        if (newPassword.length < 6) return { success: false, error: 'Mínimo 6 caracteres' };
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) return { success: false, error: error.message };
        return { success: true };
      },

      habits: [],
      addHabit: async (habit) => {
        if (!get().userId) return;
        if (!get().canCreateActivity()) {
          get().openPaywall('Has alcanzado el límite de actividades del plan gratuito.');
          return;
        }
        const hId = crypto.randomUUID();
        const newHabit: Habit = {
          id: hId,
          title: habit.title || 'Nuevo Hábito',
          colorTheme: habit.colorTheme || 'emerald',
          history: {},
          streak: 0,
          maxStreak: 0,
          createdAt: format(new Date(), 'yyyy-MM-dd'),
          isShared: false,
          participants: [{ id: get().userId!, name: get().userName, avatar: get().userAvatar, streak: 0, history: {} }]
        };

        set((state) => ({ habits: [...state.habits, newHabit] }));

        await supabase.from('habits').insert([{
          id: hId, user_id: get().userId, title: newHabit.title, color_theme: newHabit.colorTheme,
          history: newHabit.history, streak: newHabit.streak, max_streak: newHabit.maxStreak, created_at: newHabit.createdAt
        }]);

        await supabase.from('habit_participants').insert([{ habit_id: hId, user_id: get().userId }]);
      },

      inviteToHabit: async (habitId, friendId) => {
        if (!get().userId) return { success: false, message: 'No logueado' };

        const { data: existing } = await supabase
          .from('habit_invitations')
          .select('id')
          .eq('habit_id', habitId)
          .eq('receiver_id', friendId)
          .eq('status', 'pending')
          .single();

        if (existing) return { success: false, message: 'Ya tiene una invitación.' };

        await supabase.from('habit_invitations').insert([
          { habit_id: habitId, sender_id: get().userId, receiver_id: friendId }
        ]);

        return { success: true, message: '¡Invitación enviada!' };
      },

      acceptHabitInvitation: async (invitationId) => {
        const invite = get().habitInvitations.find(i => i.id === invitationId);
        if (!invite || !get().userId) return;

        // 1. Add as participant
        await supabase.from('habit_participants').upsert([
          { habit_id: invite.habit_id, user_id: get().userId }
        ], { onConflict: 'habit_id,user_id' });

        // 2. Update invitation
        await supabase.from('habit_invitations').update({ status: 'accepted' }).eq('id', invitationId);

        // 3. Refresh
        await get().initialize();
      },

      declineHabitInvitation: async (invitationId) => {
        await supabase.from('habit_invitations').delete().eq('id', invitationId);
        set(state => ({ habitInvitations: state.habitInvitations.filter(i => i.id !== invitationId) }));
      },

      toggleHabitToday: async (id) => {
        const habitToUpdate = get().habits.find(h => h.id === id);
        if (!habitToUpdate || !get().userId) return;

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const newHistory = { ...habitToUpdate.history };
        
        // Toggle today
        if (newHistory[todayStr]) delete newHistory[todayStr];
        else newHistory[todayStr] = true;

        // Calculate Streak
        let currentStreak = 0;
        // Check consecutive days starting from today and going backwards
        for (let i = 0; i < 365; i++) {
          const dStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
          if (newHistory[dStr]) currentStreak++;
          else {
              // If today is not done, the streak might have been broken, but we only stop 
              // the count if we already started counting or if it's not today.
              if (i === 0 && !newHistory[todayStr]) continue; 
              break;
          }
        }

        const newMaxStreak = Math.max(habitToUpdate.maxStreak, currentStreak);
        
        // Update Local State first for instant feedback (Root + Participants list)
        set(state => ({
          habits: state.habits.map(h => {
              if (h.id === id) {
                  return { 
                      ...h, 
                      history: newHistory, 
                      streak: currentStreak, 
                      maxStreak: newMaxStreak,
                      participants: (h.participants || []).map(p => 
                          p.id === get().userId ? { ...p, streak: currentStreak, history: newHistory } : p
                      )
                  };
              }
              return h;
          })
        }));

        try {
          // 1. Update individual progress (ALWAYS allowed in participants table)
          await supabase
            .from('habit_participants')
            .update({ history: newHistory, streak: currentStreak })
            .eq('habit_id', id)
            .eq('user_id', get().userId);

          // 2. Update habits table (Only if I am the owner)
          await supabase.from('habits').update({ 
            history: newHistory, 
            streak: currentStreak, 
            max_streak: newMaxStreak 
          }).eq('id', id).eq('user_id', get().userId);

          // 3. Update total completions
          const total = get().habits.reduce((acc, h) => acc + Object.values(h.history).filter(v => v).length, 0);
          await supabase.from('profiles').update({ total_completions: total }).eq('id', get().userId);
        } catch (err) {
          console.error("Sync error:", err);
        }
      },

      exercises: [],
      addExercise: (name, muscle, initialWeight) => {
        if (!get().canCreateActivity()) {
          get().openPaywall('Has alcanzado el límite de actividades del plan gratuito.');
          return;
        }
        set((state) => ({
          exercises: [...state.exercises, { id: Date.now().toString(), name, muscle, weightHistory: [initialWeight] }]
        }));
      },
      updateWeight: (id, newWeight) => set((state) => ({
        exercises: state.exercises.map(ex => ex.id === id ? { ...ex, weightHistory: [...ex.weightHistory, newWeight] } : ex)
      })),
      deleteExercise: (id) => set((state) => ({ exercises: state.exercises.filter(ex => ex.id !== id) })),

      books: [],
      addBook: (title, author, pages) => {
        if (!get().canCreateActivity()) {
          get().openPaywall('Has alcanzado el límite de actividades del plan gratuito.');
          return;
        }
        set((state) => ({ books: [...state.books, { id: Date.now().toString(), title, author, pages, readPages: 0 }] }));
      },
      updateReadPages: (id, readPages) => set((state) => ({ books: state.books.map(b => b.id === id ? { ...b, readPages } : b) })),
      deleteBook: (id) => set((state) => ({ books: state.books.filter(b => b.id !== id) })),

      friends: [],
      searchUsers: async (query) => {
        if (!query || query.length < 2) return [];
        const { data } = await supabase
          .from('profiles')
          .select('id, user_name, avatar_url')
          .ilike('user_name', `%${query}%`)
          .neq('id', get().userId)
          .limit(10);

        return data?.map(d => ({ id: d.id, name: d.user_name, avatar: d.avatar_url || '👤' })) || [];
      },

      addFriendById: async (targetId) => {
        if (!get().userId) return { success: false, message: "No logueado" };
        if (get().userId === targetId) return { success: false, message: "No puedes agregarte a ti mismo" };

        // Comprehensive symmetric check: row (Me, Them) OR row (Them, Me)
        const { data: existing1 } = await supabase.from('friendships').select('id, status').eq('user_id', get().userId).eq('friend_id', targetId).maybeSingle();
        const { data: existing2 } = await supabase.from('friendships').select('id, status').eq('user_id', targetId).eq('friend_id', get().userId).maybeSingle();

        if (existing1 || existing2) {
          const status = (existing1?.status || existing2?.status);
          return {
            success: false,
            message: status === 'accepted' ? "Ya sois amigos." : "Ya hay una solicitud pendiente entre vosotros."
          };
        }

        const { error } = await supabase.from('friendships').insert([
          { user_id: get().userId, friend_id: targetId, status: 'pending' }
        ]);

        if (error) {
          if (error.code === '23505') return { success: false, message: "Ya has enviado esta solicitud." };
          return { success: false, message: "Error: " + error.message };
        }

        await get().initialize();
        return { success: true, message: "¡Solicitud enviada!" };
      },

      addFriendByCode: async (code) => {
        const normalizedCode = code.trim().toUpperCase();
        if (normalizedCode === get().userCode) return { success: false, message: "Eres tú, crack." };
        const { data: profile, error } = await supabase.from('profiles').select('*').eq('user_code', normalizedCode).single();
        if (error || !profile) return { success: false, message: "Guerrero no encontrado." };

        return get().addFriendById(profile.id);
      },

      acceptFriendRequest: async (requestId) => {
        const req = get().pendingRequests.find(r => r.id === requestId);
        if (!req || !get().userId) return;

        // 1. Mark incoming as accepted
        await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId);

        // 2. Create reciprocal (UPSERT to avoid unique constraint errors)
        await supabase.from('friendships').upsert([
          { user_id: get().userId, friend_id: req.sender_id, status: 'accepted' }
        ], { onConflict: 'user_id,friend_id' });

        // 3. Sync to profiles.friends_list for backup robustness
        await supabase.rpc('add_friend_to_list', { user_a: get().userId, user_b: req.sender_id });

        await get().initialize();
      },

      declineFriendRequest: async (requestId) => {
        const { error } = await supabase.from('friendships').delete().eq('id', requestId);
        if (!error) {
          set(state => ({
            pendingRequests: state.pendingRequests.filter(r => r.id !== requestId),
            outgoingRequests: state.outgoingRequests.filter(r => r.id !== requestId)
          }));
        }
      },

      getGlobalLeaderboard: async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, user_name, avatar_url, total_completions')
          .order('total_completions', { ascending: false })
          .limit(10);
        
        if (error) return [];
        return data.map(p => ({
          id: p.id,
          name: p.user_name,
          avatar: p.avatar_url,
          totalCompletions: p.total_completions || 0
        }));
      },
      removeFriend: (id) => set(state => ({ friends: state.friends.filter(f => f.id !== id) }))
    }),
    { name: 'gymrace-persistent-store-v7' }
  )
);
