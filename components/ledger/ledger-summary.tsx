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
    {
      label: "Total belum lunas",
      value: rupiah.format(openBalance),
      icon: CircleDollarSign,
      note: `${needsFollowUp} pelanggan belum lunas`,
      tone: "border-primary/15 bg-secondary/60",
      iconTone: "bg-primary/10 text-primary",
      valueTone: "text-primary",
    },
    {
      label: "Perlu ditagih",
      value: String(needsFollowUp),
      icon: Clock3,
      note: needsFollowUp
        ? "Pelanggan dengan sisa piutang"
        : "Semua pelanggan sudah lunas",
      tone: "border-border/80 bg-card",
      iconTone: "bg-amber-50 text-amber-700",
      valueTone: "text-foreground",
    },
    {
      label: "Pembayaran bulan ini",
      value: rupiah.format(paidThisMonth),
      icon: WalletCards,
      note: `${data.payments.filter((payment) => payment.source !== "credit" && payment.paid_at.slice(0, 7) === new Date().toISOString().slice(0, 7)).length} alokasi pembayaran tunai`,
      tone: "border-border/80 bg-card",
      iconTone: "bg-emerald-50 text-emerald-700",
      valueTone: "text-emerald-800",
    },
    {
      label: "Catatan dipulihkan",
      value: String(asNumber(data.importSummary?.row_count)),
      icon: ArrowDownToLine,
      note: `${asNumber(data.importSummary?.import_count)} berkas cadangan diimpor`,
      tone: "border-border/80 bg-card",
      iconTone: "bg-sky-50 text-sky-700",
      valueTone: "text-foreground",
    },
  ];

  return (
    <section
      aria-label="Ringkasan buku piutang"
      className="shrink-0 border-b border-border/70 bg-muted/20 px-4 py-4 lg:px-6"
    >
      <dl className="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map(
          ({ label, value, icon: Icon, note, tone, iconTone, valueTone }) => (
            <div
              key={label}
              className={`min-w-0 rounded-xl border p-3.5 ${tone}`}
            >
              <div className="flex items-start justify-between gap-2">
                <dt className="pt-1 text-[11px] leading-4 font-medium text-muted-foreground">
                  {label}
                </dt>
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-lg ${iconTone}`}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
              </div>
              <dd
                className={`mt-1.5 break-words text-lg font-bold tracking-tight tabular-nums xl:text-2xl ${valueTone}`}
              >
                {value}
              </dd>
              <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">
                {note}
              </p>
            </div>
          ),
        )}
      </dl>
    </section>
  );
}
