begin;

alter table public.payments add column if not exists source text not null default 'cash';
alter table public.payments drop constraint if exists payments_source_check;
alter table public.payments add constraint payments_source_check check (source in ('cash', 'credit'));
alter table public.credit_transactions drop constraint if exists credit_transactions_amount_check;

create or replace function public.settle_customer_debts(
  payment_customer_id text,
  payment_received_amount bigint,
  payment_received_by text default ''
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  debt record;
  debt_remaining bigint;
  paid bigint;
  total_outstanding bigint := 0;
  available_credit bigint := 0;
  credit_used bigint := 0;
  credit_remaining bigint := 0;
  cash_required bigint := 0;
  cash_remaining bigint := 0;
  overpayment bigint := 0;
begin
  if auth.uid() is null or payment_received_amount < 0 then raise exception 'Pembayaran tidak valid'; end if;
  perform 1 from public.customers where id = payment_customer_id and owner_id = auth.uid() for update;
  if not found then raise exception 'Pelanggan tidak ditemukan'; end if;

  select coalesce(sum(open_debt.outstanding), 0) into total_outstanding
  from (
    select d.amount - coalesce(sum(p.amount), 0) as outstanding
    from public.debt_items d
    left join public.payments p on p.debt_item_id = d.id and p.owner_id = auth.uid()
    where d.owner_id = auth.uid() and d.customer_id = payment_customer_id
    group by d.id, d.amount
    having d.amount - coalesce(sum(p.amount), 0) > 0
  ) open_debt;
  if total_outstanding <= 0 then raise exception 'Pelanggan tidak mempunyai piutang terbuka'; end if;

  select greatest(coalesce(sum(amount), 0), 0) into available_credit
  from public.credit_transactions where owner_id = auth.uid() and customer_id = payment_customer_id;
  credit_used := least(available_credit, total_outstanding);
  cash_required := total_outstanding - credit_used;
  if payment_received_amount < cash_required then raise exception 'Uang diterima belum mencukupi untuk melunasi semua piutang'; end if;
  overpayment := payment_received_amount - cash_required;
  credit_remaining := credit_used;
  cash_remaining := cash_required;

  for debt in
    select d.id, d.amount - coalesce(sum(p.amount), 0) as outstanding
    from public.debt_items d
    left join public.payments p on p.debt_item_id = d.id and p.owner_id = auth.uid()
    where d.owner_id = auth.uid() and d.customer_id = payment_customer_id
    group by d.id, d.amount, d.date, d.created_at
    having d.amount - coalesce(sum(p.amount), 0) > 0
    order by d.date asc, d.created_at asc, d.id asc
  loop
    debt_remaining := debt.outstanding;
    if credit_remaining > 0 then
      paid := least(credit_remaining, debt_remaining);
      insert into public.payments (id, owner_id, debt_item_id, amount, paid_at, received_by, source)
      values (gen_random_uuid()::text, auth.uid(), debt.id, paid, now(), 'Saldo kelebihan bayar', 'credit');
      credit_remaining := credit_remaining - paid;
      debt_remaining := debt_remaining - paid;
    end if;
    if debt_remaining > 0 then
      paid := least(cash_remaining, debt_remaining);
      insert into public.payments (id, owner_id, debt_item_id, amount, paid_at, received_by, source)
      values (gen_random_uuid()::text, auth.uid(), debt.id, paid, now(), coalesce(payment_received_by, ''), 'cash');
      cash_remaining := cash_remaining - paid;
    end if;
  end loop;

  if credit_used > 0 then
    insert into public.credit_transactions (id, owner_id, customer_id, amount, note, created_at)
    values (gen_random_uuid()::text, auth.uid(), payment_customer_id, -credit_used, 'Pemakaian saldo kelebihan bayar', now());
  end if;
  if overpayment > 0 then
    insert into public.credit_transactions (id, owner_id, customer_id, amount, note, created_at)
    values (gen_random_uuid()::text, auth.uid(), payment_customer_id, overpayment, 'Kelebihan pembayaran pelunasan', now());
  end if;

  return jsonb_build_object('recorded', true, 'paidAmount', cash_required, 'receivedAmount', payment_received_amount, 'overpayment', overpayment, 'creditUsed', credit_used, 'remainingBalance', 0);
end;
$$;

revoke all on function public.settle_customer_debts(text, bigint, text) from public, anon;
grant execute on function public.settle_customer_debts(text, bigint, text) to authenticated;

commit;
