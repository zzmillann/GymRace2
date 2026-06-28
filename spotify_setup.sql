-- 1) Estado "ahora suena" (público: lo leen tus amigos). Ejecuta en Supabase.
alter table profiles add column if not exists spotify_track text;
alter table profiles add column if not exists spotify_artist text;
alter table profiles add column if not exists spotify_is_playing boolean default false;
alter table profiles add column if not exists spotify_updated timestamptz;

-- 2) Tabla privada de refresh tokens (cada usuario solo ve el suyo).
--    El sondeo del servidor (service_role) la lee saltándose la RLS.
create table if not exists spotify_tokens (
  user_id uuid primary key references profiles(id) on delete cascade,
  refresh_token text,
  updated timestamptz default now()
);

alter table spotify_tokens enable row level security;

drop policy if exists "own spotify tokens" on spotify_tokens;
create policy "own spotify tokens" on spotify_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
