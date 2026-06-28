'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { exchangeCode } from '@/lib/spotify';
import { useAppStore } from '@/store/useHabitStore';

export default function SpotifyCallback() {
  const router = useRouter();
  const setSpotifyTokens = useAppStore((s) => s.setSpotifyTokens);
  const [msg, setMsg] = useState('Conectando con Spotify…');

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');
      if (error) { setMsg('Conexión cancelada'); setTimeout(() => router.replace('/'), 1500); return; }
      if (!code) { router.replace('/'); return; }
      try {
        const tok = await exchangeCode(code);
        if (tok.access_token) {
          setSpotifyTokens(tok.access_token, tok.refresh_token || null, tok.expires_in || 3600);
          // Guardamos el refresh token (tabla privada) para el sondeo del servidor
          if (tok.refresh_token) await useAppStore.getState().saveSpotifyRefresh(tok.refresh_token);
          setMsg('¡Spotify conectado! 🎵');
        } else {
          setMsg('No se pudo conectar con Spotify');
        }
      } catch {
        setMsg('No se pudo conectar con Spotify');
      }
      setTimeout(() => router.replace('/'), 1200);
    };
    run();
  }, [router, setSpotifyTokens]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full border-4 border-[#1DB954]/30 border-t-[#1DB954] animate-spin mb-6" />
      <p className="text-content font-black uppercase tracking-widest text-sm">{msg}</p>
    </div>
  );
}
