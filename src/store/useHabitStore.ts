import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, subDays, startOfWeek, startOfMonth, startOfDay } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { loadLocalAvatar as readLocalAvatar, saveLocalAvatar, clearLocalAvatar as wipeLocalAvatar } from '@/lib/localAvatar';

// --- Guardia contra pisar cambios locales ---
// initialize() tarda un rato (una decena de consultas seguidas). Si el usuario
// marca un hábito mientras está en vuelo, la respuesta llega con la foto vieja
// y machacaba el tick optimista: "le doy, se pone, y desaparece". Anotamos por
// hábito cuántas escrituras hay en curso y cuándo acabó la última; al fusionar
// con el servidor, si hay algo en curso o acabó después de arrancar la carga,
// manda lo local.
const inflightWrites = new Map<string, number>();
const lastSettledWrite = new Map<string, number>();
const hasFreshLocalEdit = (habitId: string, fetchStartedAt: number) =>
  (inflightWrites.get(habitId) ?? 0) > 0 || (lastSettledWrite.get(habitId) ?? 0) > fetchStartedAt;

// Una sola carga a la vez: si ya hay un initialize() corriendo, reutilizamos
// su promesa en vez de lanzar otra tanda de consultas que se pisen entre sí.
let initializeInFlight: Promise<void> | null = null;

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
export interface RouteRec { id: number; coords: [number, number][]; distance_m: number; duration_s: number; created_at: string; }
export interface Book { id: string; title: string; author: string; pages: number; readPages: number; }
export interface Friend {
  id: string; name: string; code: string; avatar?: string;
  habits: { title: string; streak: number; color: string }[];
  totalCompletions: number;
  maxStreak: number;
  currentStreak: number;
  friendCount: number;
  frame?: string;
  // Spotify "ahora suena"
  spotifyTrack?: string;
  spotifyArtist?: string;
  spotifyPlaying?: boolean;
  spotifyAlbumArt?: string;
  spotifyUrl?: string;
}

export interface SpotifyState {
  connected: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number; // epoch ms
}

export interface NowPlayingState { track: string; artist: string; isPlaying: boolean; albumArt?: string; url?: string; }

// --- FREEMIUM / SUBSCRIPTION ---
// Límite del plan gratuito. Cuenta hábitos + ejercicios + libros.
// Al intentar crear el item nº (FREE_ACTIVITY_LIMIT + 1) salta el paywall.
// 👉 Cambia este único número para ajustar cuántas actividades son gratis.
export const FREE_ACTIVITY_LIMIT = 3;

/**
 * Interruptor del modelo de pago.
 *
 * En false (ahora): todo el mundo es Pro, sin límite de actividades y sin que
 * llegue a aparecer el paywall. La lógica de suscripción, Stripe y los planes
 * sigue intacta debajo — solo está desactivada.
 *
 * Para volver a cobrar, poner esto en true. No hace falta tocar nada más:
 * el límite, el paywall y la pantalla de planes reviven solos.
 */
export const PAYWALL_ENABLED = false;

export type SubscriptionPlan = 'free' | 'weekly' | 'monthly' | 'quarterly';

/**
 * Cuenta del creador: siempre Pro, sin pasar por el paywall.
 * Provisional — lo suyo es marcar is_pro = true en su fila de `profiles`:
 *   update profiles set is_pro = true, subscription_plan = 'monthly'
 *   where lower(user_name) = 'zzmillann';
 * Mientras tanto, esto lo resuelve en el cliente.
 */
export const CREATOR_USERNAME = 'zzmillann';
export const isCreator = (name?: string) =>
  (name || '').trim().toLowerCase() === CREATOR_USERNAME;

/** Primera letra en mayúscula, respetando el resto de lo que escriba el usuario. */
const capitalize = (t?: string) => {
  const v = (t || '').trim();
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : '';
};

export interface AppSettings {
  // Notificaciones
  pushEnabled: boolean;
  dailyReminder: boolean;
  reminderTime: string; // 'HH:mm'
  streakAlerts: boolean;
  weeklySummary: boolean;
  socialNotifs: boolean;
  // Apariencia
  theme: 'dark' | 'light' | 'system' | 'midnight';
  accentColor: string;
  palette: string;      // estilo de color (ver src/lib/palettes.ts)
  confetti: boolean;   // confeti al completar un hábito
  language: 'es' | 'en';
  // Unidades y preferencias
  weightUnit: 'kg' | 'lb';
  bodyWeightKg: number; // peso corporal, para estimar calorías en las rutas
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
  theme: 'light',
  accentColor: 'bronze',
  palette: 'locodea',
  confetti: true,
  language: 'es',
  weightUnit: 'kg',
  bodyWeightKg: 70,
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
  userFrame: string;  // cosmético del avatar
  initialized: boolean;

  // Auth Actions
  initialize: () => Promise<void>;
  /** Carga real desde Supabase; usar initialize(), que deduplica llamadas concurrentes */
  loadFromServer: () => Promise<void>;
  signUp: (email: string, pass: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (identifier: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (name: string, avatar: string) => Promise<{ success: boolean; error?: string }>;
  setProfileFrame: (frame: string) => Promise<void>;
  uploadAvatar: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;
  /** Foto de perfil guardada en el dispositivo (IndexedDB). Al pintarse manda sobre userAvatar. */
  localAvatar: string | null;
  loadLocalAvatar: () => Promise<void>;
  setLocalAvatarFile: (file: File) => Promise<{ success: boolean; error?: string }>;
  clearLocalAvatar: () => Promise<void>;

  // Habits
  habits: Habit[];
  habitInvitations: HabitInvitation[];
  addHabit: (habit: Partial<Habit>) => Promise<string | undefined>;
  habitReminders: Record<string, string>; // habitId -> 'HH:mm'
  setHabitReminder: (habitId: string, time: string | null) => void;
  toggleHabitToday: (id: string, userIdOverride?: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;

  // Shared Habits
  inviteToHabit: (habitId: string, friendId: string) => Promise<{ success: boolean; message: string }>;
  acceptHabitInvitation: (invitationId: string) => Promise<{ success: boolean; message: string }>;
  /** Unirse a un reto desde un enlace compartido (y hacerse amigo de quien invita) */
  joinHabitByLink: (habitId: string, inviterCode?: string) => Promise<{ success: boolean; message: string; title?: string }>;
  /** Datos del reto para pintar la invitación antes de entrar */
  getHabitPreview: (habitId: string) => Promise<{ id: string; title: string; owner: string; ownerAvatar: string; members: number } | null>;
  declineHabitInvitation: (invitationId: string) => Promise<{ success: boolean; message: string }>;

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
  getProfileByCode: (code: string) => Promise<{ id: string; name: string; avatar: string; code: string } | null>;
  getUserDetails: (id: string) => Promise<{ id: string; name: string; code: string; avatar: string; friendCount: number; totalCompletions: number; maxStreak: number; rank: number } | null>;
  logProfileView: (profileId: string) => Promise<void>;
  getProfileViewers: () => Promise<{ id: string; name: string; avatar: string; when: string }[]>;
  saveRoute: (coords: [number, number][], distanceM: number, durationS: number) => Promise<void>;
  getRoutes: () => Promise<RouteRec[]>;
  deleteRoute: (id: number) => Promise<void>;
  logStudy: (minutes: number) => Promise<void>;
  getStudyStats: () => Promise<{ today: number; week: number; month: number }>;
  getStudyRanking: () => Promise<{ id: string; name: string; avatar: string; minutes: number }[]>;
  addFriendByCode: (code: string) => Promise<{ success: boolean; message: string }>;
  addFriendById: (id: string) => Promise<{ success: boolean; message: string }>;
  acceptFriendRequest: (requestId: string) => Promise<{ success: boolean; message: string }>;
  declineFriendRequest: (requestId: string) => Promise<{ success: boolean; message: string }>;
  removeFriend: (id: string) => Promise<{ success: boolean; message: string }>;
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
  saveSpotifyRefresh: (refresh: string | null) => Promise<void>;
  disconnectSpotify: () => void;
  setNowPlaying: (np: NowPlayingState | null) => void;
  pushNowPlaying: (np: NowPlayingState | null) => Promise<void>;
  refreshSocial: () => Promise<void>;
  refreshFriendsNowPlaying: () => Promise<void>;
}

const generateUserCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      userId: null, userCode: '', userName: '', userAvatar: '👤', userFrame: 'none', pendingRequests: [], outgoingRequests: [], habitInvitations: [], initialized: false,
      setProfileFrame: async (frame) => {
        set({ userFrame: frame });
        const uid = get().userId;
        if (uid) { try { await supabase.from('profiles').update({ profile_frame: frame }).eq('id', uid); } catch { /* columna aún sin crear */ } }
      },
      activeTab: 'habits', setActiveTab: (activeTab) => set({ activeTab }),
      activeGymMuscle: 'Pecho', setActiveGymMuscle: (activeGymMuscle) => set({ activeGymMuscle }),

      // --- Freemium / Subscription ---
      isPro: false,
      subscriptionPlan: 'free',
      paywall: { open: false, reason: '' },
      settings: DEFAULT_SETTINGS,
      openPaywall: (reason = '') => {
        if (!PAYWALL_ENABLED) return;   // desactivado: no molestamos con el muro
        set({ paywall: { open: true, reason } });
      },
      closePaywall: () => set({ paywall: { open: false, reason: '' } }),
      activatePro: (plan) => set({ isPro: true, subscriptionPlan: plan, paywall: { open: false, reason: '' } }),
      cancelPro: () => set({ isPro: false, subscriptionPlan: 'free' }),
      restorePro: async () => {
        // En producción aquí se validaría el recibo con la App Store / Stripe.
        if (!PAYWALL_ENABLED) return true;
        return get().isPro || isCreator(get().userName);
      },
      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      getActivityCount: () => {
        const s = get();
        return s.habits.length + s.exercises.length + s.books.length;
      },
      canCreateActivity: () => {
        const s = get();
        if (!PAYWALL_ENABLED) return true;
        return s.isPro || isCreator(s.userName) || s.getActivityCount() < FREE_ACTIVITY_LIMIT;
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
      saveSpotifyRefresh: async (refresh) => {
        const uid = get().userId;
        if (!uid || !refresh) return;
        // Tabla privada (RLS): el servidor la usa para sondear aunque la app esté cerrada.
        await supabase.from('spotify_tokens').upsert(
          { user_id: uid, refresh_token: refresh, updated: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      },
      disconnectSpotify: async () => {
        set({ spotify: { connected: false, accessToken: null, refreshToken: null, expiresAt: 0 }, nowPlaying: null });
        const uid = get().userId;
        if (uid) {
          await supabase.from('profiles').update({
            spotify_track: null, spotify_artist: null, spotify_is_playing: false,
          }).eq('id', uid);
          await supabase.from('spotify_tokens').delete().eq('user_id', uid);
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
          spotify_album_art: np?.albumArt || null,
          spotify_track_url: np?.url || null,
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
      refreshFriendsNowPlaying: async () => {
        const friends = get().friends;
        if (!friends.length) return;
        const ids = friends.map((f) => f.id);
        const { data } = await supabase
          .from('profiles')
          .select('id, spotify_track, spotify_artist, spotify_is_playing, spotify_album_art, spotify_track_url, spotify_updated')
          .in('id', ids);
        if (!data) return;
        const byId = new Map<string, any>(data.map((p: any) => [p.id, p]));
        set({
          friends: get().friends.map((f) => {
            const p = byId.get(f.id);
            const fresh = p?.spotify_updated && (Date.now() - new Date(p.spotify_updated).getTime() < 5 * 60 * 1000);
            return {
              ...f,
              spotifyTrack: fresh ? p.spotify_track : undefined,
              spotifyArtist: fresh ? p.spotify_artist : undefined,
              spotifyPlaying: fresh ? p.spotify_is_playing : false,
              spotifyAlbumArt: fresh ? p.spotify_album_art : undefined,
              spotifyUrl: fresh ? p.spotify_track_url : undefined,
            };
          }),
        });
      },

      initialize: async () => {
        if (initializeInFlight) return initializeInFlight;
        initializeInFlight = (async () => {
          try { await get().loadFromServer(); } finally { initializeInFlight = null; }
        })();
        return initializeInFlight;
      },

      loadFromServer: async () => {
        // Momento en que arranca la carga: todo cambio local posterior gana
        // frente a lo que devuelva el servidor (ver hasFreshLocalEdit).
        const fetchStartedAt = Date.now();
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
            .select('id, user_name, user_code, avatar_url, total_completions, friends_list, profile_frame, spotify_track, spotify_artist, spotify_is_playing, spotify_album_art, spotify_track_url, spotify_updated')
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

          // Migración puntual: los hábitos guardados antes de la regla de
          // capitalizar siguen en minúscula en la base. Los normalizamos una vez.
          const needFix = (allHabitsRaw || []).filter(
            (h: any) => h?.title && h.title !== capitalize(h.title),
          );
          if (needFix.length) {
            Promise.all(
              needFix.map((h: any) =>
                supabase.from('habits').update({ title: capitalize(h.title) }).eq('id', h.id),
              ),
            ).catch(() => { /* si falla, al menos se ve bien en la app */ });
          }

          set({
            userId: currentUserId,
            userCode: profile.user_code,
            userName: profile.user_name,
            userAvatar: profile.avatar_url || '👤',
            userFrame: profile.profile_frame || 'none',
            initialized: true,
            // Estado Pro real desde Supabase (lo marca el webhook de Stripe)
            isPro: !PAYWALL_ENABLED || profile.is_pro || isCreator(profile.user_name),
            subscriptionPlan: profile.subscription_plan || (isCreator(profile.user_name) ? 'monthly' : 'free'),
            habits: (allHabitsRaw || []).map((h: any) => {
              if (!h) return null;
              const myPart = (participantsRaw || []).find((p: any) => p.habit_id === h.id && p.user_id === currentUserId);
              // Si el usuario ha tocado este hábito mientras cargábamos, lo
              // local es más nuevo que la foto del servidor: no lo pisamos.
              const local = hasFreshLocalEdit(h.id, fetchStartedAt)
                ? get().habits.find((x) => x.id === h.id)
                : undefined;
              return {
                // capitalize también al leer: los hábitos creados antes de esta
                // regla siguen guardados en minúscula (ver migración más abajo)
                id: h.id, title: capitalize(h.title), colorTheme: h.color_theme,
                // Individual progress for shared habits
                history: local ? local.history : (myPart?.history || h.history || {}),
                streak: local ? local.streak : (myPart?.streak || h.streak || 0),
                maxStreak: local ? Math.max(local.maxStreak || 0, h.max_streak || 0) : h.max_streak,
                createdAt: h.created_at,
                isShared: (participantsRaw || []).filter((p: any) => p.habit_id === h.id).length > 1,
                participants: (participantsRaw || []).filter((p: any) => p.habit_id === h.id).map((p: any) => {
                    if (!p) return null;
                    const mine = local && p.user_id === currentUserId;
                    return {
                        id: p.user_id, 
                        name: p.profiles?.user_name || 'Desconocido', 
                        avatar: p.profiles?.avatar_url || '👤',
                        streak: mine ? local.streak : (p.streak || 0),
                        history: mine ? local.history : (p.history || {})
                    };
                }).filter((x): x is NonNullable<typeof x> => x !== null)
              };
            }).filter((x): x is NonNullable<typeof x> => x !== null)
              // Orden fijo por fecha de creación. Sin ORDER BY, Postgres devolvía
              // las filas en orden físico y el hábito recién marcado (fila
              // actualizada) cambiaba de sitio en cada recarga.
              .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''))),
            pendingRequests: (socialPending || []).map((p: any) => {
              if (!p) return null;
              return {
                id: p.id, sender_name: p.profiles?.user_name || 'Alguien', sender_code: p.profiles?.user_code || '---', sender_id: p.user_id
              };
            }).filter((x): x is NonNullable<typeof x> => x !== null),
            outgoingRequests: (outgoing || []).map((o: any) => {
              if (!o) return null;
              return {
                id: o.id, receiver_name: o.profiles?.user_name || 'Desconocido', receiver_id: o.friend_id
              };
            }).filter((x): x is NonNullable<typeof x> => x !== null),
            habitInvitations: (hInvites || []).map((i: any) => {
                if (!i) return null;
                return {
                    id: i.id, habit_id: i.habit_id, habit_title: i.habits?.title || 'Hábito',
                    sender_id: i.sender_id, sender_name: i.profiles?.user_name || 'Alguien', sender_avatar: i.profiles?.avatar_url || '👤'
                };
            }).filter((x): x is NonNullable<typeof x> => x !== null),
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
                    frame: p.profile_frame || 'none',
                    spotifyTrack: spotifyFresh ? p.spotify_track : undefined,
                    spotifyArtist: spotifyFresh ? p.spotify_artist : undefined,
                    spotifyPlaying: spotifyFresh ? p.spotify_is_playing : false,
                    spotifyAlbumArt: spotifyFresh ? p.spotify_album_art : undefined,
                    spotifyUrl: spotifyFresh ? p.spotify_track_url : undefined,
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

      // --- Foto de perfil local (sin Supabase) ---
      localAvatar: null,
      loadLocalAvatar: async () => {
        const v = await readLocalAvatar();
        if (v) set({ localAvatar: v });
      },
      setLocalAvatarFile: async (file) => {
        try {
          const url = await saveLocalAvatar(file);
          set({ localAvatar: url });
          return { success: true };
        } catch (e) {
          return { success: false, error: e instanceof Error ? e.message : 'No se pudo guardar la foto' };
        }
      },
      clearLocalAvatar: async () => {
        set({ localAvatar: null });
        await wipeLocalAvatar();
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
          title: capitalize(habit.title) || 'Nuevo hábito',
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
        return hId;
      },

      habitReminders: {},
      setHabitReminder: (habitId, time) => set((state) => {
        const next = { ...state.habitReminders };
        if (time) next[habitId] = time; else delete next[habitId];
        return { habitReminders: next };
      }),

      inviteToHabit: async (habitId, friendId) => {
        if (!get().userId) return { success: false, message: 'No logueado' };

        // Si ya está dentro del reto no tiene sentido invitarle (puede haber
        // entrado por enlace desde otro sitio)
        const { data: already } = await supabase
          .from('habit_participants')
          .select('user_id')
          .eq('habit_id', habitId)
          .eq('user_id', friendId)
          .maybeSingle();

        if (already) return { success: false, message: 'Ya está en el reto.' };

        // maybeSingle y no single: sin filas, single devuelve error 406 y
        // ensuciaba la consola en el caso normal
        const { data: existing } = await supabase
          .from('habit_invitations')
          .select('id')
          .eq('habit_id', habitId)
          .eq('receiver_id', friendId)
          .eq('status', 'pending')
          .maybeSingle();

        if (existing) return { success: false, message: 'Ya tiene una invitación.' };

        // Antes se ignoraba el error del insert y siempre se respondía
        // "enviada": si RLS lo bloqueaba, al otro no le llegaba nada y nadie
        // se enteraba.
        const { error } = await supabase.from('habit_invitations').insert([
          { habit_id: habitId, sender_id: get().userId, receiver_id: friendId }
        ]);

        if (error) {
          if (error.code === '23505') return { success: false, message: 'Ya le has invitado.' };
          return { success: false, message: 'No se pudo enviar la invitación. Inténtalo de nuevo.' };
        }

        return { success: true, message: '¡Invitación enviada!' };
      },

      getHabitPreview: async (habitId) => {
        const { data: h } = await supabase
          .from('habits').select('id, title, user_id').eq('id', habitId).single();
        if (!h) return null;
        const { data: owner } = await supabase
          .from('profiles').select('user_name, avatar_url').eq('id', h.user_id).single();
        const { count } = await supabase
          .from('habit_participants').select('*', { count: 'exact', head: true }).eq('habit_id', habitId);
        return {
          id: h.id,
          title: capitalize(h.title),
          owner: owner?.user_name || 'Alguien',
          ownerAvatar: owner?.avatar_url || '',
          members: count || 1,
        };
      },

      joinHabitByLink: async (habitId, inviterCode) => {
        const uid = get().userId;
        if (!uid) return { success: false, message: 'Necesitas iniciar sesión' };

        const { data: h } = await supabase
          .from('habits').select('id, title, user_id').eq('id', habitId).single();
        if (!h) return { success: false, message: 'Ese reto ya no existe' };

        // 1. Entrar al reto (upsert: si ya estaba dentro, no duplica)
        const { error } = await supabase.from('habit_participants').upsert(
          [{ habit_id: habitId, user_id: uid }],
          { onConflict: 'habit_id,user_id' },
        );
        if (error) return { success: false, message: 'No se pudo entrar al reto' };

        // 2. Amistad automática con quien te invitó: el enlace ya es la
        //    aceptación por ambas partes, así que la damos por aceptada.
        const inviterId = inviterCode
          ? (await get().getProfileByCode(inviterCode))?.id
          : h.user_id;

        if (inviterId && inviterId !== uid) {
          await supabase.from('friendships').upsert(
            [
              { user_id: uid, friend_id: inviterId, status: 'accepted' },
              { user_id: inviterId, friend_id: uid, status: 'accepted' },
            ],
            { onConflict: 'user_id,friend_id' },
          );
        }

        await get().initialize();
        return { success: true, message: '¡Dentro!', title: capitalize(h.title) };
      },

      acceptHabitInvitation: async (invitationId) => {
        const invite = get().habitInvitations.find(i => i.id === invitationId);
        if (!invite || !get().userId) return { success: false, message: 'Invitación no encontrada' };

        // 1. Entrar al reto. Si esto falla no seguimos: marcar la invitación
        //    como aceptada sin estar dentro dejaría al usuario fuera y sin
        //    forma de volver a intentarlo.
        const { error: joinErr } = await supabase.from('habit_participants').upsert(
          [{ habit_id: invite.habit_id, user_id: get().userId }],
          { onConflict: 'habit_id,user_id' },
        );
        if (joinErr) return { success: false, message: 'No se pudo entrar al reto. Inténtalo de nuevo.' };

        // 2. Marcar la invitación como aceptada
        await supabase.from('habit_invitations').update({ status: 'accepted' }).eq('id', invitationId);

        // La quitamos ya de la lista para que la pantalla responda al momento
        set((state) => ({
          habitInvitations: state.habitInvitations.filter((i) => i.id !== invitationId),
        }));

        await get().initialize();
        return { success: true, message: `Te has unido a "${capitalize(invite.habit_title)}"` };
      },

      declineHabitInvitation: async (invitationId) => {
        const { error } = await supabase.from('habit_invitations').delete().eq('id', invitationId);
        if (error) return { success: false, message: 'No se pudo rechazar. Inténtalo de nuevo.' };
        set(state => ({ habitInvitations: state.habitInvitations.filter(i => i.id !== invitationId) }));
        return { success: true, message: 'Invitación rechazada' };
      },

      /**
       * Borra un reto. Estaba declarado en la interfaz pero sin implementar
       * (de ahí el error de tipos que arrastraba el proyecto).
       *
       * Si el reto es mío lo elimino entero, y la cascada de la base se lleva
       * participantes e invitaciones. Si soy un invitado, solo me salgo: no
       * puedo borrarle el reto a los demás.
       */
      deleteHabit: async (id) => {
        const uid = get().userId;
        if (!uid) return;

        const { data: h } = await supabase
          .from('habits').select('user_id').eq('id', id).single();

        if (h?.user_id === uid) {
          await supabase.from('habit_participants').delete().eq('habit_id', id);
          await supabase.from('habits').delete().eq('id', id);
        } else {
          await supabase.from('habit_participants')
            .delete().eq('habit_id', id).eq('user_id', uid);
        }

        set((state) => ({ habits: state.habits.filter((x) => x.id !== id) }));
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
        
        // Marcamos la escritura en curso ANTES del set optimista: así una carga
        // que termine entre medias no nos pisa el tick.
        inflightWrites.set(id, (inflightWrites.get(id) ?? 0) + 1);

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
        } finally {
          inflightWrites.set(id, Math.max(0, (inflightWrites.get(id) ?? 1) - 1));
          lastSettledWrite.set(id, Date.now());
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

      getProfileByCode: async (code) => {
        const normalized = code.trim().toUpperCase();
        if (!normalized) return null;
        const { data } = await supabase
          .from('profiles')
          .select('id, user_name, avatar_url, user_code')
          .eq('user_code', normalized)
          .single();
        if (!data) return null;
        return { id: data.id, name: data.user_name, avatar: data.avatar_url || '👤', code: data.user_code };
      },

      logProfileView: async (profileId) => {
        const uid = get().userId;
        if (!uid || !profileId || uid === profileId) return;
        try { await supabase.from('profile_views').insert({ viewer_id: uid, profile_id: profileId }); } catch { /* tabla aún sin crear */ }
      },
      getProfileViewers: async () => {
        const uid = get().userId;
        if (!uid) return [];
        const { data } = await supabase
          .from('profile_views')
          .select('viewer_id, created_at, profiles!profile_views_viewer_id_fkey(user_name, avatar_url)')
          .eq('profile_id', uid)
          .order('created_at', { ascending: false })
          .limit(50);
        if (!data) return [];
        const seen = new Set<string>();
        const out: { id: string; name: string; avatar: string; when: string }[] = [];
        for (const v of data as any[]) {
          if (seen.has(v.viewer_id)) continue;
          seen.add(v.viewer_id);
          out.push({ id: v.viewer_id, name: v.profiles?.user_name || 'Alguien', avatar: v.profiles?.avatar_url || '👤', when: v.created_at });
        }
        return out;
      },

      saveRoute: async (coords, distanceM, durationS) => {
        const uid = get().userId;
        if (!uid || coords.length < 2) return;
        try { await supabase.from('routes').insert({ user_id: uid, coords, distance_m: Math.round(distanceM), duration_s: Math.round(durationS) }); } catch { /* tabla aún sin crear */ }
      },
      getRoutes: async () => {
        const uid = get().userId;
        if (!uid) return [];
        const { data } = await supabase.from('routes').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(50);
        return (data || []) as RouteRec[];
      },
      deleteRoute: async (id) => {
        try { await supabase.from('routes').delete().eq('id', id); } catch { /* noop */ }
      },
      logStudy: async (minutes) => {
        const uid = get().userId;
        if (!uid || minutes <= 0) return;
        try { await supabase.from('study_sessions').insert({ user_id: uid, minutes: Math.round(minutes) }); } catch { /* tabla aún sin crear */ }
      },
      getStudyStats: async () => {
        const uid = get().userId;
        if (!uid) return { today: 0, week: 0, month: 0 };
        const monthStart = startOfMonth(new Date()).toISOString();
        const { data } = await supabase
          .from('study_sessions')
          .select('minutes, created_at')
          .eq('user_id', uid)
          .gte('created_at', monthStart);
        const ws = startOfWeek(new Date(), { weekStartsOn: 1 });
        const ds = startOfDay(new Date());
        let today = 0, week = 0, month = 0;
        (data || []).forEach((s: any) => {
          const d = new Date(s.created_at);
          month += s.minutes;
          if (d >= ws) week += s.minutes;
          if (d >= ds) today += s.minutes;
        });
        return { today, week, month };
      },
      getStudyRanking: async () => {
        const uid = get().userId;
        if (!uid) return [];
        const ids = [uid, ...get().friends.map((f) => f.id)];
        const ws = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
        const { data } = await supabase
          .from('study_sessions')
          .select('user_id, minutes')
          .in('user_id', ids)
          .gte('created_at', ws);
        const sums = new Map<string, number>();
        (data || []).forEach((s: any) => sums.set(s.user_id, (sums.get(s.user_id) || 0) + s.minutes));
        const people = [
          { id: uid, name: get().userName, avatar: get().userAvatar },
          ...get().friends.map((f) => ({ id: f.id, name: f.name, avatar: f.avatar || '👤' })),
        ];
        return people.map((p) => ({ ...p, minutes: sums.get(p.id) || 0 })).sort((a, b) => b.minutes - a.minutes);
      },

      getUserDetails: async (id) => {
        const { data: p } = await supabase
          .from('profiles')
          .select('id, user_name, user_code, avatar_url, total_completions, friends_list')
          .eq('id', id).single();
        if (!p) return null;

        const { data: owned } = await supabase.from('habits').select('max_streak, streak').eq('user_id', id);
        const { data: part } = await supabase.from('habit_participants').select('streak').eq('user_id', id);
        const streaks = [
          ...(owned || []).map((h: any) => h.max_streak),
          ...(owned || []).map((h: any) => h.streak),
          ...(part || []).map((h: any) => h.streak),
        ].filter((n) => typeof n === 'number');
        const maxStreak = streaks.length ? Math.max(...streaks) : 0;

        // Ranking mundial: nº de perfiles con más completados + 1
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gt('total_completions', p.total_completions || 0);
        const rank = (count || 0) + 1;

        return {
          id: p.id, name: p.user_name, code: p.user_code, avatar: p.avatar_url || '👤',
          friendCount: (p.friends_list || []).length,
          totalCompletions: p.total_completions || 0,
          maxStreak, rank,
        };
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
        if (!req || !get().userId) return { success: false, message: 'Solicitud no encontrada' };

        // 1. Aceptar la solicitud entrante. Si falla, paramos aquí: crear solo
        //    el lado recíproco dejaría la amistad a medias.
        const { error: accErr } = await supabase
          .from('friendships').update({ status: 'accepted' }).eq('id', requestId);
        if (accErr) return { success: false, message: 'No se pudo aceptar. Inténtalo de nuevo.' };

        // 2. Lado recíproco (upsert para no chocar con el índice único)
        await supabase.from('friendships').upsert(
          [{ user_id: get().userId, friend_id: req.sender_id, status: 'accepted' }],
          { onConflict: 'user_id,friend_id' },
        );

        // 3. Copia en profiles.friends_list. Es un respaldo: si falla, la
        //    amistad ya es válida, así que no bloqueamos por esto.
        try {
          await supabase.rpc('add_friend_to_list', { user_a: get().userId, user_b: req.sender_id });
        } catch { /* respaldo opcional */ }

        // Quitamos la solicitud de la lista al momento
        set((state) => ({ pendingRequests: state.pendingRequests.filter((r) => r.id !== requestId) }));

        await get().initialize();
        return { success: true, message: `Ahora sois amigos` };
      },

      declineFriendRequest: async (requestId) => {
        const { error } = await supabase.from('friendships').delete().eq('id', requestId);
        if (error) return { success: false, message: 'No se pudo rechazar. Inténtalo de nuevo.' };
        set(state => ({
          pendingRequests: state.pendingRequests.filter(r => r.id !== requestId),
          outgoingRequests: state.outgoingRequests.filter(r => r.id !== requestId)
        }));
        return { success: true, message: 'Solicitud rechazada' };
      },

      getGlobalLeaderboard: async () => {
        // Solo entra quien tenga actividad: antes salían cuentas con 0
        // completadas y el ranking se llenaba de gente que no ha hecho nada.
        const { data, error } = await supabase
          .from('profiles')
          .select('id, user_name, avatar_url, total_completions')
          .gt('total_completions', 0)
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
      /**
       * Eliminar amigo. Antes solo lo quitaba del estado local: al recargar
       * la app el amigo volvía porque en la base seguía la amistad.
       * Ahora borra las dos filas (la mía y la suya).
       */
      removeFriend: async (id) => {
        const uid = get().userId;
        if (!uid) return { success: false, message: 'No has iniciado sesión' };

        const prev = get().friends;
        // Optimista: desaparece de la lista al instante
        set((state) => ({ friends: state.friends.filter((f) => f.id !== id) }));

        const a = await supabase.from('friendships').delete().eq('user_id', uid).eq('friend_id', id);
        const b = await supabase.from('friendships').delete().eq('user_id', id).eq('friend_id', uid);

        if (a.error && b.error) {
          set({ friends: prev });   // no se borró nada: lo devolvemos
          return { success: false, message: 'No se pudo eliminar. Inténtalo de nuevo.' };
        }
        return { success: true, message: 'Amigo eliminado' };
      }
    }),
    {
      name: 'gymrace-persistent-store-v7',
      // v1: pasa a todo el mundo al sistema de diseño Locodea bronce
      // (tema claro, acento bronce, paleta oscura "Locodea") una sola vez.
      version: 1,
      migrate: (persisted, version) => {
        const s = persisted as { settings?: Record<string, unknown> } | undefined;
        if (version < 1 && s?.settings) {
          s.settings = { ...s.settings, theme: 'light', accentColor: 'bronze', palette: 'locodea' };
        }
        return s as never;
      },
      // La pestaña activa no se guarda: al abrir la app siempre se entra por
      // Hábitos, no por donde se quedó la última vez.
      onRehydrateStorage: () => (state) => {
        if (state) state.activeTab = 'habits';
      },
      // La foto local vive en IndexedDB (ver lib/localAvatar): no la
      // duplicamos en el localStorage del store.
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'localAvatar')) as typeof s,
    }
  )
);
