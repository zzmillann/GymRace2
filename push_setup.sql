-- Notificaciones push (llegan con la app cerrada). Ejecuta en Supabase → SQL Editor.

-- 1) Suscripciones push: una por dispositivo/navegador.
create table if not exists push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_push_subs_user on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

drop policy if exists "own push subs" on push_subscriptions;
create policy "own push subs" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Guardar la suscripción del dispositivo para el usuario con sesión. Si el
-- dispositivo era de otra cuenta, pasa a la actual (la RLS no lo dejaría).
create or replace function save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into push_subscriptions (endpoint, user_id, p256dh, auth)
  select p_endpoint, auth.uid(), p_p256dh, p_auth
  where auth.uid() is not null
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, updated_at = now();
$$;
grant execute on function save_push_subscription(text, text, text) to authenticated;

-- 2) Cuándo avisar a cada usuario (copia de sus ajustes; lo lee el cron).
create table if not exists notification_prefs (
  user_id         uuid primary key references profiles(id) on delete cascade,
  timezone        text not null default 'Europe/Madrid',
  daily_reminder  boolean default false,
  reminder_time   text default '20:00',
  habit_reminders jsonb default '{}'::jsonb,  -- { habitId: 'HH:mm' }
  social_notifs   boolean default true,
  last_sent       jsonb default '{}'::jsonb,  -- { daily | habitId: 'yyyy-MM-dd' } (lo escribe el cron)
  updated_at      timestamptz default now()
);

alter table notification_prefs enable row level security;

drop policy if exists "own notification prefs" on notification_prefs;
create policy "own notification prefs" on notification_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) Marca de "ya avisado" en solicitudes e invitaciones. Lo que ya existía
--    se marca como avisado para no mandar de golpe avisos antiguos.
alter table friendships add column if not exists push_sent boolean;
update friendships set push_sent = true where push_sent is null;
alter table friendships alter column push_sent set default false;
alter table friendships alter column push_sent set not null;

alter table habit_invitations add column if not exists push_sent boolean;
update habit_invitations set push_sent = true where push_sent is null;
alter table habit_invitations alter column push_sent set default false;
alter table habit_invitations alter column push_sent set not null;
