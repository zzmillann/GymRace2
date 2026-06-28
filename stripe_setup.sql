-- Columnas necesarias para el estado Pro gestionado por Stripe.
-- Ejecútalo en el SQL Editor de Supabase.

alter table profiles add column if not exists is_pro boolean default false;
alter table profiles add column if not exists subscription_plan text default 'free';
alter table profiles add column if not exists pro_until timestamptz;
