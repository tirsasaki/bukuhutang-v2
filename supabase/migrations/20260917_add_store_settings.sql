begin;

create table if not exists public.store_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Toko Anda' check (char_length(name) between 1 and 100),
  address text not null default '' check (char_length(address) <= 500),
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;
drop policy if exists "store_settings_owner_only" on public.store_settings;
create policy "store_settings_owner_only"
  on public.store_settings
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

commit;
