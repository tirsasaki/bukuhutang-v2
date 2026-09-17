begin;

create table if not exists public.cashiers (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  phone text not null default '' check (char_length(phone) <= 30),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create unique index if not exists idx_cashiers_owner_name on public.cashiers(owner_id, lower(name));

alter table public.cashiers enable row level security;

create policy "cashiers_owner_only"
  on public.cashiers
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

commit;
