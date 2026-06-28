// Integración con Spotify usando OAuth PKCE (sin secreto, 100% cliente).
// Requiere NEXT_PUBLIC_SPOTIFY_CLIENT_ID y registrar el redirect URI
// `<origin>/spotify-callback` en el Dashboard de Spotify.

// El Client ID de Spotify es público (PKCE no usa secreto), así que se puede
// dejar aquí como valor por defecto. Una variable de entorno lo sobreescribe.
const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '4c62a512afca47048b952baa48e5bdac';
const SCOPES = 'user-read-currently-playing user-read-playback-state';

export const spotifyEnabled = () => !!CLIENT_ID;
export const spotifyRedirectUri = () =>
  typeof window !== 'undefined' ? `${window.location.origin}/spotify-callback` : '';

function base64url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let str = '';
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomVerifier(): string {
  const a = new Uint8Array(64);
  crypto.getRandomValues(a);
  return base64url(a.buffer).slice(0, 100);
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain));
}

export async function beginSpotifyAuth() {
  const verifier = randomVerifier();
  localStorage.setItem('spotify_verifier', verifier);
  const challenge = base64url(await sha256(verifier));
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: spotifyRedirectUri(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export interface SpotifyTokens { access_token: string; refresh_token?: string; expires_in: number; error?: string; }

export async function exchangeCode(code: string): Promise<SpotifyTokens> {
  const verifier = localStorage.getItem('spotify_verifier') || '';
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: spotifyRedirectUri(),
    code_verifier: verifier,
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return res.json();
}

export interface NowPlaying { track: string; artist: string; isPlaying: boolean; albumArt?: string; url?: string; }

export async function getCurrentlyPlaying(accessToken: string): Promise<NowPlaying | null> {
  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 204 || res.status >= 400) return null; // 204 = nada sonando
  const data = await res.json().catch(() => null);
  if (!data || !data.item) return null;
  return {
    track: data.item.name,
    artist: (data.item.artists || []).map((a: any) => a.name).join(', '),
    isPlaying: !!data.is_playing,
    albumArt: data.item.album?.images?.[0]?.url,
    url: data.item.external_urls?.spotify,
  };
}
