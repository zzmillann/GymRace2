'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useHabitStore';
import { getCurrentlyPlaying, refreshAccessToken } from '@/lib/spotify';

/**
 * Si el usuario tiene Spotify vinculado, sondea cada 25 s la canción actual,
 * la guarda en su perfil de Supabase y la expone en el store (nowPlaying)
 * para que sus amigos la vean "en directo".
 */
export function SpotifySync() {
  const connected = useAppStore((s) => s.spotify.connected);
  const userId = useAppStore((s) => s.userId);
  const busy = useRef(false);

  useEffect(() => {
    if (!connected || !userId) return;

    const tick = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const store = useAppStore.getState();
        let { accessToken, refreshToken, expiresAt } = store.spotify;

        // Refresca el token si está a punto de caducar
        if (!accessToken || Date.now() > expiresAt - 60_000) {
          if (!refreshToken) { busy.current = false; return; }
          const tok = await refreshAccessToken(refreshToken);
          if (tok.access_token) {
            store.setSpotifyTokens(tok.access_token, tok.refresh_token || null, tok.expires_in || 3600);
            accessToken = tok.access_token;
          } else {
            busy.current = false;
            return;
          }
        }

        const np = await getCurrentlyPlaying(accessToken!);
        store.setNowPlaying(np);
        await store.pushNowPlaying(np);
      } catch {
        /* silencioso */
      } finally {
        busy.current = false;
      }
    };

    tick();
    const id = setInterval(tick, 25_000);
    return () => clearInterval(id);
  }, [connected, userId]);

  return null;
}
