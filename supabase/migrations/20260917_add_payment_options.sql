begin;

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
  remaining bigint;
  paid bigint;
  total_outstanding bigint := 0;
  requested_amount bigint := 0;
  recorded_count integer := 0;
  settled_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Pengguna belum masuk';
  end if;

  perform 1 from public.customers
  where id = payment_customer_id and owner_id = auth.uid()
  for update;
  if not found then
    raise exception 'Pelanggan tidak ditemukan';
  end if;

  select coalesce(sum(open_debt.outstanding), 0)
  into total_outstanding
  from (
    select d.amount - coalesce(sum(p.amount), 0) as outstanding
    from public.debt_items d
    left join public.payments p on p.debt_item_id = d.id and p.owner_id = auth.uid()
    where d.owner_id = auth.uid() and d.customer_id = payment_customer_id
    group by d.id, d.amount
    having d.amount - coalesce(sum(p.amount), 0) > 0
  ) open_debt;

  if total_outstanding <= 0 then
    return jsonb_build_object('recorded', false, 'paidAmount', 0, 'remainingBalance', 0, 'settledCount', 0);
  end if;

  requested_amount := case when payment_amount = 0 then total_outstanding else payment_amount end;
  if requested_amount <= 0 or requested_amount > total_outstanding then
    raise exception 'Nominal pembayaran harus antara 1 dan sisa piutang';
  end if;
  remaining := requested_amount;

  for debt in
    select d.id, d.amount - coalesce(sum(p.amount), 0) as outstanding
    from public.debt_items d
    left join public.payments p on p.debt_item_id = d.id and p.owner_id = auth.uid()
    where d.owner_id = auth.uid() and d.customer_id = payment_customer_id
    group by d.id, d.amount, d.date, d.created_at
    having d.amount - coalesce(sum(p.amount), 0) > 0
    order by d.date asc, d.created_at asc, d.id asc
  loop
    exit when remaining <= 0;
    paid := least(remaining, debt.outstanding);
    insert into public.payments (id, owner_id, debt_item_id, amount, paid_at, received_by)
    values (gen_random_uuid()::text, auth.uid(), debt.id, paid, now(), coalesce(payment_received_by, ''));
    remaining := remaining - paid;
    recorded_count := recorded_count + 1;
    if paid = debt.outstanding then settled_count := settled_count + 1; end if;
  end loop;

  return jsonb_build_object(
    'recorded', recorded_count > 0,
    'paidAmount', requested_amount - remaining,
    'remainingBalance', total_outstanding - (requested_amount - remaining),
    'settledCount', settled_count
  );
end;
$$;

revoke all on function public.record_customer_payment(text, bigint, text) from public, anon;
grant execute on function public.record_customer_payment(text, bigint, text) to authenticated;

commit;
