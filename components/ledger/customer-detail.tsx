"use client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Phone,
  Plus,
  Share2,
  UploadCloud,
  WalletCards,
} from "lucide-react";
import { CustomerLedgerTab } from "./customer-ledger-tab";
import { CustomerPaymentsTab } from "./customer-payments-tab";
import { CustomerPaymentRecordsTab } from "./customer-payment-records-tab";
import { CustomerProfileTab } from "./customer-profile-tab";
import { CustomerSummary } from "./customer-summary";
import { formatDate, initials } from "@/lib/ledger/format";
import type { Customer, Debt, Payment, PostAction } from "@/lib/ledger/types";
import Link from "next/link";

type Props = {
  selected: Customer | null;
  selectedDebts: Debt[];
  selectedPayments: Payment[];
  setShareOpen: (open: boolean) => void;
  setDebtOpen: (open: boolean) => void;
  setPaymentOpen: (open: boolean) => void;
  setEditCustomerOpen: (open: boolean) => void;
  saving: boolean;
  onDeleteCustomer: () => Promise<void>;
  postAction: PostAction;
  mobileDetailOpen: boolean;
  onMobileBack: () => void;
};

const tabTrigger =
  "h-auto flex-none gap-1.5 rounded-lg px-2.5 py-[7px] text-[12.5px] font-semibold text-muted-foreground shadow-none data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-card @md:px-3";

export function CustomerDetail({
  selected,
  selectedDebts,
  selectedPayments,
  setShareOpen,
  setDebtOpen,
  setPaymentOpen,
  setEditCustomerOpen,
  saving,
  onDeleteCustomer,
  postAction,
  mobileDetailOpen,
  onMobileBack,
}: Props) {
  const openCount = selectedDebts.filter(
    (debt) => debt.amount > debt.paid_amount,
  ).length;
  // Satu "Catat pembayaran" = satu nilai paid_at yang sama.
  const recordCount = new Set(selectedPayments.map((payment) => payment.paid_at))
    .size;
  return (
    <section
      className={`${mobileDetailOpen ? "block" : "hidden"} min-w-0 p-3.5 md:block md:overflow-y-auto md:p-5`}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mb-2 -ml-1 gap-1.5 md:hidden"
        onClick={onMobileBack}
      >
        <ArrowLeft className="size-[15px]" aria-hidden="true" />
        Kembali ke daftar pelanggan
      </Button>
      {!selected ? (
        <div className="grid min-h-[420px] place-items-center">
          <div className="max-w-sm text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-secondary text-primary">
              <UploadCloud className="size-8" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-xl font-extrabold tracking-tight">
              Belum ada pelanggan
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Tambahkan pelanggan dari daftar pelanggan atau pulihkan cadangan
              melalui Pengaturan Toko.
            </p>
            <Button asChild variant="outline" className="mt-5">
              <Link href="/pengaturan">Buka pengaturan cadangan</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="@container flex w-full flex-col gap-4">
          {/* Kartu identitas pelanggan + tindakan utama */}
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card px-4 py-4 shadow-xs @xl:px-5 @xl:py-[18px] @4xl:flex-row @4xl:items-center @4xl:justify-between">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="grid size-[50px] shrink-0 place-items-center rounded-[15px] bg-linear-135 from-secondary to-accent text-[17px] font-extrabold text-primary">
                {initials(selected.name)}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-[0.08em] text-subtle-foreground uppercase">
                  Detail pelanggan
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <h2 className="min-w-0 text-lg font-extrabold tracking-tight break-words @xl:text-[21px]">
                    {selected.name}
                  </h2>
                  <span
                    className={`inline-flex items-center rounded-full border px-[9px] py-[3px] text-[11px] font-bold ${selected.balance > 0 ? "border-warning-border bg-warning-bg text-warning-fg" : "border-success-border bg-success-bg text-success-fg"}`}
                  >
                    {selected.balance > 0 ? "Belum lunas" : "Lunas"}
                  </span>
                </div>
                <p className="mt-[5px] flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {selected.phone && (
                    <>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Phone className="size-[13px]" aria-hidden="true" />
                        {selected.phone}
                      </span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  <span>Sejak {formatDate(selected.created_at)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selected.debt_count} catatan</span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 @lg:flex @lg:flex-wrap @lg:items-center @4xl:shrink-0 @4xl:flex-nowrap">
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-1.5 text-xs @lg:h-8"
                disabled={selected.balance <= 0}
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="size-3.5" aria-hidden="true" />
                Bagikan WA
              </Button>
              <Button
                variant="success"
                size="sm"
                className="h-10 gap-1.5 text-xs @lg:h-8"
                onClick={() => setDebtOpen(true)}
              >
                <Plus className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
                Catat piutang
              </Button>
              <Button
                size="sm"
                className="col-span-2 h-10 gap-1.5 text-xs @lg:h-8"
                disabled={selected.balance <= 0}
                onClick={() => setPaymentOpen(true)}
              >
                <WalletCards className="size-3.5" aria-hidden="true" />
                Catat pembayaran
              </Button>
            </div>
          </div>

          <CustomerSummary customer={selected} openCount={openCount} />

          <Tabs
            key={selected.id}
            defaultValue="ledger"
            className="gap-0 overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft px-3 py-3 @xl:px-[18px]">
              <TabsList
                aria-label="Rincian pelanggan"
                className="h-auto! w-full justify-start gap-[3px] overflow-x-auto overflow-y-hidden rounded-[10px] [scrollbar-width:none] bg-background p-[3px] @md:w-auto"
              >
                <TabsTrigger value="ledger" className={tabTrigger}>
                  Buku piutang
                  <span className="rounded-md bg-muted px-1.5 py-px text-[10.5px] text-muted-foreground tabular-nums">
                    {selectedDebts.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="payments" className={tabTrigger}>
                  Pembayaran
                  <span className="rounded-md bg-muted px-1.5 py-px text-[10.5px] text-muted-foreground tabular-nums">
                    {selectedPayments.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="records" className={tabTrigger}>
                  Riwayat catat
                  <span className="rounded-md bg-muted px-1.5 py-px text-[10.5px] text-muted-foreground tabular-nums">
                    {recordCount}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="profile" className={tabTrigger}>
                  <span className="@md:hidden">Data</span>
                  <span className="hidden @md:inline">Data pelanggan</span>
                </TabsTrigger>
              </TabsList>
              <span className="hidden text-[11.5px] text-subtle-foreground @3xl:inline">
                Alokasi otomatis dari nota terlama
              </span>
            </div>
            <CustomerLedgerTab
              key={selected.id}
              selected={selected}
              selectedDebts={selectedDebts}
              postAction={postAction}
            />
            <CustomerPaymentsTab
              key={`payments-${selected.id}`}
              selectedPayments={selectedPayments}
              selectedDebts={selectedDebts}
            />
            <CustomerPaymentRecordsTab
              key={`records-${selected.id}`}
              selectedPayments={selectedPayments}
              selectedDebts={selectedDebts}
            />
            <CustomerProfileTab
              selected={selected}
              setEditCustomerOpen={setEditCustomerOpen}
              saving={saving}
              onDeleteCustomer={onDeleteCustomer}
            />
          </Tabs>
        </div>
      )}
    </section>
  );
}
