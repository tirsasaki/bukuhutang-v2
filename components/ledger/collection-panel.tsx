"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ChevronDown,
  ChevronRight,
  Clock3,
  MessageCircle,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatDate, rupiah, whatsappNumber } from "@/lib/ledger/format";
import { buildShareMessages } from "@/lib/ledger/share";
import type { Customer, LedgerData } from "@/lib/ledger/types";

type Props = {
  data: LedgerData;
  selectedId: string;
  onSelectCustomer: (id: string) => void;
};

export function CollectionPanel({
  data,
  selectedId,
  onSelectCustomer,
}: Props) {
  const [sort, setSort] = useState<"largest" | "oldest">("largest");
  const customers = useMemo(
    () =>
      data.customers
        .filter((customer) => customer.balance > 0)
        .sort((a, b) => {
          if (sort === "largest")
            return b.balance - a.balance || a.name.localeCompare(b.name, "id");
          const oldestA = a.last_payment_at ?? a.last_debt_at ?? a.created_at;
          const oldestB = b.last_payment_at ?? b.last_debt_at ?? b.created_at;
          return oldestA.localeCompare(oldestB);
        }),
    [data.customers, sort],
  );

  async function sendReminder(customer: Customer) {
    const debts = data.debts.filter(
      (debt) => debt.customer_id === customer.id,
    );
    const message = buildShareMessages(customer, debts, data.store).friendly;
    const phone = whatsappNumber(customer.phone);

    if (phone.length >= 9) {
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pengingat piutang ${customer.name}`,
          text: message,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast.error("Pengingat belum dapat dibagikan.");
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(message);
      toast.success(
        "Nomor WhatsApp belum diisi. Pesan pengingat disalin ke papan klip.",
      );
    } catch {
      toast.error("Nomor WhatsApp pelanggan belum diisi.");
    }
  }

  return (
    <aside className="hidden min-w-0 flex-col overflow-y-auto border-r border-border bg-muted/20 lg:flex">
      <div className="sticky top-0 z-10 border-b border-border/80 bg-background/95 p-4 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight">
              Perlu ditagih
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {customers.length} pelanggan belum lunas
            </p>
          </div>
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-300">
            <Clock3 className="size-4" aria-hidden="true" />
          </div>
        </div>
        <div className="relative mt-3">
          <ArrowDownWideNarrow
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            aria-label="Urutkan pelanggan yang perlu ditagih"
            className="h-9 w-full appearance-none rounded-lg border border-border bg-card pr-8 pl-8 text-xs font-medium outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="largest">Sisa saldo terbesar</option>
            <option value="oldest">Paling lama belum dibayar</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="space-y-2.5 p-3">
        {!customers.length && (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center">
            <div className="mx-auto grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-300">
              <UsersRound className="size-5" aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm font-semibold">Tidak ada tagihan aktif</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Semua pelanggan sudah melunasi piutangnya.
            </p>
          </div>
        )}

        {customers.map((customer) => (
          <article
            key={customer.id}
            className={`overflow-hidden rounded-2xl border bg-card shadow-xs transition-colors ${selectedId === customer.id ? "border-primary/35 ring-2 ring-primary/10" : "border-border/80"}`}
          >
            <button
              type="button"
              aria-pressed={selectedId === customer.id}
              onClick={() => onSelectCustomer(customer.id)}
              className="flex w-full items-start gap-3 p-3 text-left outline-none transition-colors hover:bg-muted/45 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-xs font-bold text-primary">
                {customer.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {customer.name}
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Terakhir aktif {formatDate(customer.last_activity_at)}
                </span>
                <span className="mt-2 block text-sm font-bold tabular-nums text-amber-900 dark:text-amber-300">
                  {rupiah.format(customer.balance)}
                </span>
              </span>
              <ChevronRight
                className="mt-2 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </button>
            <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-3 py-2">
              <span className="truncate text-[10px] text-muted-foreground">
                {customer.phone || "Nomor WA belum diisi"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 gap-1.5 px-2 text-[11px]! font-semibold! text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-400/10"
                onClick={() => void sendReminder(customer)}
              >
                <MessageCircle className="size-3.5" aria-hidden="true" />
                Ingatkan
              </Button>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
