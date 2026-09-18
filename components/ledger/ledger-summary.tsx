"use client";
import {
  ArrowDownToLine,
  CircleDollarSign,
  Clock3,
  WalletCards,
} from "lucide-react";

import { asNumber, rupiah } from "@/lib/ledger/format";
import type { LedgerData } from "@/lib/ledger/types";
type Props = {
  data: LedgerData;
  openBalance: number;
  needsFollowUp: number;
  paidThisMonth: number;
};
export function LedgerSummary({
  data,
  openBalance,
  needsFollowUp,
  paidThisMonth,
}: Props) {
  const summaryCards = [
    [
      "Total belum lunas",
      rupiah.format(openBalance),
      CircleDollarSign,
      `${needsFollowUp} pelanggan`,
    ],
    [
      "Perlu ditagih",
      String(needsFollowUp),
      Clock3,
      needsFollowUp ? "Masih memiliki saldo" : "Semua lunas",
    ],
    [
      "Pembayaran bulan ini",
      rupiah.format(paidThisMonth),
      WalletCards,
      `${data.payments.filter((p) => p.source !== "credit" && p.paid_at.slice(0, 7) === new Date().toISOString().slice(0, 7)).length} transaksi`,
    ],
    [
      "Catatan dipulihkan",
      String(asNumber(data.importSummary?.row_count)),
      ArrowDownToLine,
      `${asNumber(data.importSummary?.import_count)} berkas cadangan`,
    ],
  ] as const;

  return (
    <section className="grid border-b border-border bg-card px-4 py-3 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
      {summaryCards.map(([label, value, Icon, note]) => (
        <div
          key={label}
          className="flex items-center gap-3 border-border px-2 py-2 first:pl-0 lg:border-r lg:px-5 lg:first:pl-0 lg:last:border-r-0"
        >
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-muted-foreground">
              {label}
            </p>
            <p className="truncate text-lg font-bold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{note}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
