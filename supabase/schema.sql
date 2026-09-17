begin;

create table if not exists public.customers (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_user_id text,
  name text not null check (char_length(name) between 1 and 100),
  phone text not null default '' check (char_length(phone) <= 30),
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table if not exists public.debt_items (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  customer_id text not null,
  amount bigint not null check (amount > 0),
  created_at timestamptz not null default now(),
  date date not null,
  invoice_no text not null default '',
  item text not null default '',
  cashier text not null default '',
  qty integer not null default 1 check (qty > 0),
  unique (id, owner_id),
  foreign key (customer_id, owner_id) references public.customers(id, owner_id) on delete cascade
);

create table if not exists public.payments (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  debt_item_id text not null,
  amount bigint not null check (amount > 0),
  paid_at timestamptz not null default now(),
  received_by text not null default '',
  foreign key (debt_item_id, owner_id) references public.debt_items(id, owner_id) on delete cascade
);

create table if not exists public.credit_transactions (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  customer_id text not null,
  amount bigint not null check (amount >= 0),
  note text not null default '',
  created_at timestamptz not null default now(),
  foreign key (customer_id, owner_id) references public.customers(id, owner_id) on delete cascade
);

create table if not exists public.import_batches (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null,
  exported_at text not null default '',
  imported_at timestamptz not null default now(),
  row_count integer not null default 0,
  unique (owner_id, fingerprint)
);

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

create index if not exists idx_customers_owner_name on public.customers(owner_id, name);
create index if not exists idx_debt_owner_customer on public.debt_items(owner_id, customer_id);
create index if not exists idx_debt_owner_date on public.debt_items(owner_id, date desc);
create index if not exists idx_payment_owner_debt on public.payments(owner_id, debt_item_id);
create index if not exists idx_credit_owner_customer on public.credit_transactions(owner_id, customer_id);
create unique index if not exists idx_cashiers_owner_name on public.cashiers(owner_id, lower(name));

alter table public.customers enable row level security;
alter table public.debt_items enable row level security;
alter table public.payments enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.import_batches enable row level security;
alter table public.cashiers enable row level security;

create policy "customers_owner_only" on public.customers for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "debt_items_owner_only" on public.debt_items for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "payments_owner_only" on public.payments for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "credit_transactions_owner_only" on public.credit_transactions for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "import_batches_owner_only" on public.import_batches for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "cashiers_owner_only" on public.cashiers for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.record_customer_payment(
  payment_customer_id text,
  payment_amount bigint,
  payment_received_by text default ''
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  debt record;
  remaining bigint := payment_amount;
  paid bigint;
  recorded_count integer := 0;
begin
  if auth.uid() is null or payment_amount <= 0 then
    raise exception 'Pembayaran tidak valid';
  end if;

  for debt in
    select d.id, d.amount - coalesce(sum(p.amount), 0) as outstanding
    from public.debt_items d
    left join public.payments p on p.debt_item_id = d.id and p.owner_id = auth.uid()
    where d.owner_id = auth.uid() and d.customer_id = payment_customer_id
    group by d.id, d.amount, d.date, d.created_at
    having d.amount - coalesce(sum(p.amount), 0) > 0
    order by d.date asc, d.created_at asc
  loop
    exit when remaining <= 0;
    paid := least(remaining, debt.outstanding);
    insert into public.payments (id, owner_id, debt_item_id, amount, paid_at, received_by)
    values (gen_random_uuid()::text, auth.uid(), debt.id, paid, now(), coalesce(payment_received_by, ''));
    remaining := remaining - paid;
    recorded_count := recorded_count + 1;
  end loop;

  return jsonb_build_object('recorded', recorded_count > 0, 'overpayment', remaining);
end;
$$;

revoke all on function public.record_customer_payment(text, bigint, text) from public, anon;
grant execute on function public.record_customer_payment(text, bigint, text) to authenticated;

commit;
