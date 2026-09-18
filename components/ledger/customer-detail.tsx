"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpenText,
  Share2,
  UploadCloud,
  UserRound,
  WalletCards,
} from "lucide-react";
import { CustomerLedgerTab } from "./customer-ledger-tab";
import { CustomerPaymentsTab } from "./customer-payments-tab";
import { CustomerProfileTab } from "./customer-profile-tab";

import { formatDate, rupiah } from "@/lib/ledger/format";
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
    <section className="min-w-0 overflow-y-auto bg-muted/40 p-4 lg:p-6">
      {!selected ? (
        <div className="grid min-h-[420px] place-items-center">
          <div className="max-w-sm text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-secondary text-primary">
              <UploadCloud className="size-8" />
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
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-primary text-base font-bold text-primary-foreground">
                {selected.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold tracking-tight">
                    {selected.name}
                  </h2>
                  {selected.balance > 0 ? (
                    <Badge variant="destructive">Perlu ditagih</Badge>
                  ) : (
                    <Badge className="bg-emerald-700">Lunas</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pelanggan sejak {formatDate(selected.created_at)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="gap-2"
                disabled={selected.balance <= 0}
                onClick={() => {
                  setShareOpen(true);
                }}
              >
                <Share2 className="size-4" /> Bagikan rincian
              </Button>
              <Button variant="outline" onClick={() => setDebtOpen(true)}>
                Tambah piutang
              </Button>
              <Button
                disabled={selected.balance <= 0}
                onClick={() => {
                  setPaymentOpen(true);
                }}
              >
                Catat pembayaran
              </Button>
            </div>
          </div>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Sisa piutang</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight">
                {rupiah.format(selected.balance)}
              </p>
              {selected.credit_balance > 0 && (
                <p className="mt-1 text-xs font-medium text-emerald-700">
                  Saldo kelebihan: {rupiah.format(selected.credit_balance)}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Piutang terakhir</p>
              <p className="mt-1 text-lg font-bold">
                {formatDate(selected.last_debt_at)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">
                Pembayaran terakhir
              </p>
              <p className="mt-1 text-lg font-bold">
                {selected.last_payment_at
                  ? rupiah.format(selected.last_payment_amount)
                  : "Belum ada"}
              </p>
            </div>
          </div>
          <Tabs
            defaultValue="ledger"
            className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
          >
            <div className="flex flex-col justify-between gap-3 border-b border-border bg-muted/20 p-4 sm:flex-row sm:items-center">
              <TabsList className="h-auto w-full rounded-xl bg-muted/80 p-1 sm:w-auto">
                <TabsTrigger
                  value="ledger"
                  className="gap-2 rounded-lg px-3 py-2"
                >
                  <BookOpenText className="size-4" /> Buku piutang{" "}
                  <span className="rounded-md bg-background/80 px-1.5 py-0.5 text-[10px]">
                    {selectedDebts.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="payments"
                  className="gap-2 rounded-lg px-3 py-2"
                >
                  <WalletCards className="size-4" /> Pembayaran{" "}
                  <span className="rounded-md bg-background/80 px-1.5 py-0.5 text-[10px]">
                    {selectedPayments.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  className="gap-2 rounded-lg px-3 py-2"
                >
                  <UserRound className="size-4" /> Data pelanggan
                </TabsTrigger>
              </TabsList>
              <p className="px-1 text-xs font-medium text-muted-foreground">
                Urutan transaksi terbaru di atas
              </p>
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
