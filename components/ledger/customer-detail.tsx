"use client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Plus,
  ReceiptText,
  Share2,
  UploadCloud,
  UserRound,
  WalletCards,
} from "lucide-react";
import { CustomerLedgerTab } from "./customer-ledger-tab";
import { CustomerPaymentsTab } from "./customer-payments-tab";
import { CustomerProfileTab } from "./customer-profile-tab";
import { CustomerSummary } from "./customer-summary";
import { formatDate } from "@/lib/ledger/format";
import type { Customer, Debt, Payment } from "@/lib/ledger/types";

type Props = {
  selected: Customer | null;
  selectedDebts: Debt[];
  selectedPayments: Payment[];
  setImportOpen: (open: boolean) => void;
  setShareOpen: (open: boolean) => void;
  setDebtOpen: (open: boolean) => void;
  setPaymentOpen: (open: boolean) => void;
  setEditCustomerOpen: (open: boolean) => void;
};
export function CustomerDetail({
  selected,
  selectedDebts,
  selectedPayments,
  setImportOpen,
  setShareOpen,
  setDebtOpen,
  setPaymentOpen,
  setEditCustomerOpen,
}: Props) {
  return (
    <section className="min-w-0 overflow-y-auto bg-muted/30 p-3 sm:p-5 lg:p-6">
      {!selected ? (
        <div className="grid min-h-[420px] place-items-center">
          <div className="max-w-sm text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-secondary text-primary">
              <UploadCloud className="size-8" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-xl font-bold">
              Pulihkan buku piutang lama
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Berkas dari repositori cadangan Anda sudah didukung. Pilih kedua
              berkas JSON; data yang sama akan dilewati otomatis.
            </p>
            <Button className="mt-5" onClick={() => setImportOpen(true)}>
              Pilih cadangan JSON
            </Button>
          </div>
        </div>
      ) : (
        <div className="@container mx-auto max-w-6xl space-y-5">
          <div className="rounded-2xl border border-border/80 bg-card p-4 @xl:p-5">
            <div className="flex flex-col justify-between gap-5 @4xl:flex-row @4xl:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-lg font-bold text-primary">
                  {selected.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Detail pelanggan
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <h2 className="min-w-0 break-words text-xl font-bold tracking-tight @xl:text-2xl">
                      {selected.name}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold ${selected.balance > 0 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}
                    >
                      {selected.balance > 0 ? (
                        <Clock3 className="size-3" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 className="size-3" aria-hidden="true" />
                      )}
                      {selected.balance > 0 ? "Belum lunas" : "Lunas"}
                    </span>
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" aria-hidden="true" />
                      Sejak {formatDate(selected.created_at)}
                    </span>
                    <span>{selected.debt_count} catatan piutang</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 @xl:flex @xl:flex-wrap @xl:items-center @4xl:shrink-0 @4xl:flex-nowrap">
                <Button
                  variant="outline"
                  className="h-9 gap-1.5 rounded-lg border-border bg-card px-3 text-xs! font-medium! shadow-none"
                  disabled={selected.balance <= 0}
                  onClick={() => setShareOpen(true)}
                >
                  <Share2 className="size-3.5" aria-hidden="true" />
                  Bagikan rincian
                </Button>
                <Button
                  variant="outline"
                  className="h-9 gap-1.5 rounded-lg border-primary/20 bg-secondary/40 px-3 text-xs! font-medium! text-primary shadow-none"
                  onClick={() => setDebtOpen(true)}
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Tambah piutang
                </Button>
                <Button
                  className="col-span-2 h-9 gap-1.5 rounded-lg px-3 text-xs! font-semibold! shadow-sm"
                  disabled={selected.balance <= 0}
                  onClick={() => setPaymentOpen(true)}
                >
                  <WalletCards className="size-3.5" aria-hidden="true" />
                  Catat pembayaran
                </Button>
              </div>
            </div>
          </div>
          <CustomerSummary customer={selected} debts={selectedDebts} />
          <Tabs
            defaultValue="ledger"
            className="gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-3 py-3 @xl:px-5">
              <TabsList
                aria-label="Rincian pelanggan"
                className="grid h-9! w-full grid-cols-[1fr_1.2fr_0.8fr] gap-0.5 @sm:grid-cols-3 rounded-lg bg-muted/70 p-0.5 @xl:w-auto"
              >
                <TabsTrigger
                  value="ledger"
                  aria-label="Buku piutang"
                  className="h-8 min-w-0 gap-1 rounded-md px-1 text-[10px]! font-semibold! @xl:px-3 @xl:text-xs! data-[state=active]:bg-card data-[state=active]:text-primary"
                >
                  <BookOpenText className="size-3.5" aria-hidden="true" />
                  <span className="@sm:hidden">Piutang</span>
                  <span className="hidden @sm:inline">Buku piutang</span>
                  <span className="hidden rounded bg-muted px-1 text-[10px] tabular-nums @sm:inline">
                    {selectedDebts.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="payments"
                  aria-label="Pembayaran"
                  className="h-8 min-w-0 gap-1 rounded-md px-1 text-[10px]! font-semibold! @xl:px-3 @xl:text-xs! data-[state=active]:bg-card data-[state=active]:text-primary"
                >
                  <WalletCards className="size-3.5" aria-hidden="true" />
                  <span>Pembayaran</span>
                  <span className="hidden rounded bg-muted px-1 text-[10px] tabular-nums @sm:inline">
                    {selectedPayments.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  aria-label="Data pelanggan"
                  className="h-8 min-w-0 gap-1 rounded-md px-1 text-[10px]! font-semibold! @xl:px-3 @xl:text-xs! data-[state=active]:bg-card data-[state=active]:text-primary"
                >
                  <UserRound className="size-3.5" aria-hidden="true" />
                  <span className="@sm:hidden">Data</span>
                  <span className="hidden @sm:inline">Data pelanggan</span>
                </TabsTrigger>
              </TabsList>
              <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground @3xl:inline-flex">
                <ReceiptText className="size-3.5" aria-hidden="true" />
                Catatan pelanggan
              </span>
            </div>
            <CustomerLedgerTab
              selected={selected}
              selectedDebts={selectedDebts}
            />
            <CustomerPaymentsTab selectedPayments={selectedPayments} />
            <CustomerProfileTab
              selected={selected}
              setEditCustomerOpen={setEditCustomerOpen}
            />
          </Tabs>
        </div>
      )}
    </section>
  );
}
