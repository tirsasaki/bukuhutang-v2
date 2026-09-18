import {
  ArrowDownLeft,
  CalendarDays,
  CircleDollarSign,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { formatDate, rupiah } from "@/lib/ledger/format";
import type { Customer, Debt } from "@/lib/ledger/types";

type Props = { customer: Customer; debts: Debt[] };

export function CustomerSummary({ customer, debts }: Props) {
  const openCount = debts.filter(
    (debt) => debt.amount > debt.paid_amount,
  ).length;
  return (
    <div className="grid gap-3 @xl:grid-cols-3">
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-secondary/70 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-secondary-foreground">
            Sisa piutang
          </p>
          <CircleDollarSign
            className="size-4 text-primary"
            aria-hidden="true"
          />
        </div>
        <p className="mt-3 break-words text-3xl font-bold tracking-tight text-primary tabular-nums">
          {rupiah.format(customer.balance)}
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-secondary-foreground">
          <span
            className={`size-1.5 rounded-full ${customer.balance > 0 ? "bg-amber-500" : "bg-emerald-600"}`}
          />
          {openCount
            ? `${openCount} catatan belum lunas`
            : "Seluruh catatan sudah lunas"}
        </p>
        {customer.credit_balance > 0 && (
          <p className="mt-3 border-t border-primary/10 pt-3 text-xs font-medium text-primary">
            Saldo tersimpan {rupiah.format(customer.credit_balance)}
          </p>
        )}
      </div>
      <div className="rounded-2xl border border-border/80 bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Piutang terakhir
          </p>
          <ReceiptText
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <p className="mt-3 text-xl font-bold tracking-tight">
          {customer.last_debt_at
            ? formatDate(customer.last_debt_at)
            : "Belum ada"}
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {customer.debt_count} catatan piutang tercatat
        </p>
      </div>
      <div className="rounded-2xl border border-border/80 bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Pembayaran terakhir
          </p>
          <WalletCards
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <p className="mt-3 break-words text-xl font-bold tracking-tight text-emerald-900 tabular-nums dark:text-emerald-300">
          {customer.last_payment_at
            ? rupiah.format(customer.last_payment_amount)
            : "Belum ada"}
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowDownLeft className="size-3.5" aria-hidden="true" />
          {customer.last_payment_at
            ? formatDate(customer.last_payment_at)
            : "Belum ada pembayaran tercatat"}
        </p>
      </div>
    </div>
  );
}
