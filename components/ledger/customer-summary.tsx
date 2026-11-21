import { CircleDollarSign, ReceiptText, WalletCards } from "lucide-react";
import { formatDate, rupiah } from "@/lib/ledger/format";
import type { Customer } from "@/lib/ledger/types";

type Props = { customer: Customer; openCount: number };

/** Tiga KPI pelanggan: sisa piutang, piutang terakhir, pembayaran terakhir. */
export function CustomerSummary({ customer, openCount }: Props) {
  const unpaid = customer.balance > 0;
  return (
    <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-3">
      <div className="col-span-2 rounded-2xl border border-primary/20 bg-linear-150 from-secondary to-card px-[18px] py-4 @2xl:col-span-1 dark:border-brand/30 dark:from-[#172b33] dark:to-card">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>Sisa piutang</span>
          <CircleDollarSign className="size-4 text-primary" aria-hidden="true" />
        </div>
        <p className="mt-2.5 text-2xl font-extrabold tracking-tight break-words text-primary tabular-nums">
          {rupiah.format(customer.balance)}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span
            className={`size-1.5 shrink-0 rounded-full ${unpaid ? "bg-warning-dot" : "bg-success-dot"}`}
          />
          {openCount
            ? `${openCount} catatan belum lunas`
            : "Seluruh catatan sudah lunas"}
        </p>
        {customer.credit_balance > 0 && (
          <p className="mt-2.5 border-t border-dashed border-border pt-2 text-[11.5px] font-bold text-success-fg tabular-nums">
            Saldo kelebihan bayar: {rupiah.format(customer.credit_balance)}
          </p>
        )}
      </div>
      <div className="min-w-0 rounded-2xl border border-border bg-card px-4 py-4 @2xl:px-[18px]">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
          <span>Piutang terakhir</span>
          <ReceiptText className="size-[15px] shrink-0" aria-hidden="true" />
        </div>
        <p className="mt-2.5 text-lg font-extrabold tracking-tight @2xl:text-2xl">
          {customer.last_debt_at ? formatDate(customer.last_debt_at) : "Belum ada"}
        </p>
        <p className="mt-2 text-[11.5px] text-muted-foreground">
          {customer.debt_count} transaksi tercatat
        </p>
      </div>
      <div className="min-w-0 rounded-2xl border border-border bg-card px-4 py-4 @2xl:px-[18px]">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
          <span>Pembayaran terakhir</span>
          <WalletCards className="size-3.5 shrink-0" aria-hidden="true" />
        </div>
        <p className="mt-2.5 text-lg font-extrabold tracking-tight break-words text-success-fg tabular-nums @2xl:text-2xl">
          {customer.last_payment_at
            ? rupiah.format(customer.last_payment_amount)
            : "Belum ada"}
        </p>
        <p className="mt-2 text-[11.5px] text-muted-foreground">
          {customer.last_payment_at
            ? formatDate(customer.last_payment_at)
            : "Belum ada pembayaran"}
        </p>
      </div>
    </div>
  );
}
