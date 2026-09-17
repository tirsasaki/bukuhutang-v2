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

create table if not exists public.invoice_counters (
  owner_id uuid not null references auth.users(id) on delete cascade,
  invoice_date date not null,
  last_number integer not null default 0,
  primary key (owner_id, invoice_date)
);

create table if not exists public.invoices (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  customer_id text not null,
  invoice_no text not null,
  date date not null,
  cashier text not null default '',
  total_amount bigint not null check (total_amount > 0),
  created_at timestamptz not null default now(),
  unique (id, owner_id),
  unique (owner_id, invoice_no),
  foreign key (customer_id, owner_id) references public.customers(id, owner_id) on delete cascade
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
  unit_price bigint,
  wholesale_price bigint,
  price_mode text not null default 'retail' check (price_mode in ('retail', 'wholesale')),
  invoice_id text,
  unique (id, owner_id),
  foreign key (customer_id, owner_id) references public.customers(id, owner_id) on delete cascade,
  foreign key (invoice_id, owner_id) references public.invoices(id, owner_id) on delete cascade
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
create index if not exists idx_debt_owner_invoice on public.debt_items(owner_id, invoice_id);
create index if not exists idx_invoices_owner_date on public.invoices(owner_id, date desc);
create index if not exists idx_payment_owner_debt on public.payments(owner_id, debt_item_id);
create index if not exists idx_credit_owner_customer on public.credit_transactions(owner_id, customer_id);
create unique index if not exists idx_cashiers_owner_name on public.cashiers(owner_id, lower(name));

alter table public.customers enable row level security;
alter table public.invoice_counters enable row level security;
alter table public.invoices enable row level security;
alter table public.debt_items enable row level security;
alter table public.payments enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.import_batches enable row level security;
alter table public.cashiers enable row level security;

create policy "customers_owner_only" on public.customers for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "invoice_counters_owner_only" on public.invoice_counters for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "invoices_owner_only" on public.invoices for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
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

create or replace function public.create_debt_invoice(
  invoice_customer_id text,
  invoice_date date,
  invoice_cashier text,
  invoice_items jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  item_record jsonb;
  item_name text;
  item_qty integer;
  retail_price bigint;
  gross_price bigint;
  selected_price bigint;
  selected_mode text;
  invoice_sequence integer;
  generated_invoice_no text;
  generated_invoice_id text := gen_random_uuid()::text;
  invoice_total bigint := 0;
begin
  if auth.uid() is null then
    raise exception 'Pengguna belum masuk';
  end if;
  if invoice_date is null or jsonb_typeof(invoice_items) <> 'array' or jsonb_array_length(invoice_items) < 1 or jsonb_array_length(invoice_items) > 50 then
    raise exception 'Isi nota tidak valid';
  end if;
  if not exists (select 1 from public.customers where id = invoice_customer_id and owner_id = auth.uid()) then
    raise exception 'Pelanggan tidak ditemukan';
  end if;
  if btrim(coalesce(invoice_cashier, '')) = '' or not exists (
    select 1 from public.cashiers where owner_id = auth.uid() and name = invoice_cashier and is_active
  ) then
    raise exception 'Kasir tidak ditemukan atau sudah dinonaktifkan';
  end if;

  for item_record in select value from jsonb_array_elements(invoice_items)
  loop
    item_name := btrim(coalesce(item_record->>'item', ''));
    item_qty := coalesce((item_record->>'qty')::integer, 0);
    retail_price := coalesce((item_record->>'unitPrice')::bigint, 0);
    gross_price := coalesce((item_record->>'wholesalePrice')::bigint, 0);
    selected_mode := case when item_record->>'priceMode' = 'wholesale' then 'wholesale' else 'retail' end;
    selected_price := case when selected_mode = 'wholesale' then gross_price else retail_price end;
    if item_name = '' or item_qty <= 0 or retail_price <= 0 or selected_price <= 0 then
      raise exception 'Lengkapi nama barang, jumlah, dan harga setiap barang';
    end if;
    invoice_total := invoice_total + (item_qty::bigint * selected_price);
  end loop;

  insert into public.invoice_counters (owner_id, invoice_date, last_number)
  values (auth.uid(), invoice_date, 1)
  on conflict (owner_id, invoice_date)
  do update set last_number = public.invoice_counters.last_number + 1
  returning last_number into invoice_sequence;

  generated_invoice_no := 'INV-' || to_char(invoice_date, 'YYYYMMDD') || '-' || lpad(invoice_sequence::text, 4, '0');

  insert into public.invoices (id, owner_id, customer_id, invoice_no, date, cashier, total_amount)
  values (generated_invoice_id, auth.uid(), invoice_customer_id, generated_invoice_no, invoice_date, coalesce(invoice_cashier, ''), invoice_total);

  for item_record in select value from jsonb_array_elements(invoice_items)
  loop
    item_name := btrim(item_record->>'item');
    item_qty := (item_record->>'qty')::integer;
    retail_price := (item_record->>'unitPrice')::bigint;
    gross_price := coalesce((item_record->>'wholesalePrice')::bigint, 0);
    selected_mode := case when item_record->>'priceMode' = 'wholesale' then 'wholesale' else 'retail' end;
    selected_price := case when selected_mode = 'wholesale' then gross_price else retail_price end;
    insert into public.debt_items (
      id, owner_id, customer_id, amount, created_at, date, invoice_no, item, cashier, qty,
      unit_price, wholesale_price, price_mode, invoice_id
    ) values (
      gen_random_uuid()::text, auth.uid(), invoice_customer_id, item_qty::bigint * selected_price, now(), invoice_date,
      generated_invoice_no, item_name, coalesce(invoice_cashier, ''), item_qty, retail_price,
      nullif(gross_price, 0), selected_mode, generated_invoice_id
    );
  end loop;

  return jsonb_build_object(
    'invoiceNo', generated_invoice_no,
    'invoiceId', generated_invoice_id,
    'total', invoice_total,
    'itemCount', jsonb_array_length(invoice_items)
  );
end;
$$;

revoke all on function public.create_debt_invoice(text, date, text, jsonb) from public, anon;
grant execute on function public.create_debt_invoice(text, date, text, jsonb) to authenticated;

commit;
