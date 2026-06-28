-- Columnas para el estado "ahora suena" de Spotify.
-- Ejecútalo en el SQL Editor de Supabase.

alter table profiles add column if not exists spotify_track text;
alter table profiles add column if not exists spotify_artist text;
alter table profiles add column if not exists spotify_is_playing boolean default false;
alter table profiles add column if not exists spotify_updated timestamptz;
