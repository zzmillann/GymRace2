import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '4c62a512afca47048b952baa48e5bdac';

// Sondea Spotify para TODOS los usuarios vinculados y guarda su "ahora suena".
// Pensado para ejecutarse por cron cada ~1 min (Vercel Cron o cron-job.org).
export async function GET(req: NextRequest) {
  // Protección opcional por secreto (Authorization: Bearer X  ó  ?key=X)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') || '';
    const key = req.nextUrl.searchParams.get('key') || '';
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  if (!supabaseAdmin) return NextResponse.json({ error: 'no_service_role' }, { status: 503 });

  const { data: tokens } = await supabaseAdmin
    .from('spotify_tokens')
    .select('user_id, refresh_token')
    .not('refresh_token', 'is', null);

  const results = await Promise.all((tokens || []).map(async (t) => {
    try {
      // 1) refrescar access token
      const tokRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: 'refresh_token',
          refresh_token: t.refresh_token as string,
        }),
      });
      const tok = await tokRes.json();
      if (!tok.access_token) return 0;
      if (tok.refresh_token && tok.refresh_token !== t.refresh_token) {
        await supabaseAdmin!.from('spotify_tokens').update({ refresh_token: tok.refresh_token }).eq('user_id', t.user_id);
      }

      // 2) canción actual
      const npRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      });
      let track: string | null = null, artist: string | null = null, isPlaying = false;
      if (npRes.status === 200) {
        const d = await npRes.json().catch(() => null);
        if (d && d.item) {
          track = d.item.name;
          artist = (d.item.artists || []).map((a: any) => a.name).join(', ');
          isPlaying = !!d.is_playing;
        }
      }

      // 3) guardar en su perfil (público)
      await supabaseAdmin!.from('profiles').update({
        spotify_track: track,
        spotify_artist: artist,
        spotify_is_playing: isPlaying,
        spotify_updated: new Date().toISOString(),
      }).eq('id', t.user_id);
      return 1;
    } catch {
      return 0;
    }
  }));

  const updated = results.filter(Boolean).length;
  return NextResponse.json({ ok: true, polled: (tokens || []).length, updated });
}
