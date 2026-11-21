"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Loader2, Plus, Search, UsersRound, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";

import { formatDate, initials, rupiah } from "@/lib/ledger/format";
import type { LedgerData } from "@/lib/ledger/types";
type Props = {
  data: LedgerData;
  loading: boolean;
  selectedId: string;
  setSelectedId: (id: string) => void;
  setCustomerOpen: (open: boolean) => void;
  mobileDetailOpen: boolean;
};

type SortKey = "latest" | "oldest" | "largest" | "smallest";
type StatusKey = "all" | "unpaid" | "paid";

export function CustomerList({
  data,
  loading,
  selectedId,
  setSelectedId,
  setCustomerOpen,
  mobileDetailOpen,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [customerSort, setCustomerSort] = useState<SortKey>("latest");
  const [customerStatus, setCustomerStatus] = useState<StatusKey>("all");
  const unpaidCount = data.customers.filter((c) => c.balance > 0).length;
  const paidCount = data.customers.length - unpaidCount;
  const visibleCustomers = useMemo(
    () =>
      data.customers
        .filter((customer) =>
          `${customer.name} ${customer.phone}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        )
        .filter(
          (customer) =>
            customerStatus === "all" ||
            (customerStatus === "unpaid"
              ? customer.balance > 0
              : customer.balance <= 0),
        )
        .sort((a, b) => {
          if (customerSort === "largest")
            return b.balance - a.balance || a.name.localeCompare(b.name, "id");
          if (customerSort === "smallest")
            return a.balance - b.balance || a.name.localeCompare(b.name, "id");
          const activityA = new Date(a.last_activity_at).getTime();
          const activityB = new Date(b.last_activity_at).getTime();
          return customerSort === "oldest"
            ? activityA - activityB
            : activityB - activityA;
        }),
    [customerSort, customerStatus, data.customers, query],
  );

  const filters = [
    {
      id: "all",
      label: "Semua",
      count: data.customers.length,
      active: "border-border bg-card text-primary shadow-xs",
    },
    {
      id: "unpaid",
      label: "Perlu ditagih",
      count: unpaidCount,
      active: "border-warning-border bg-warning-bg text-warning-fg",
    },
    {
      id: "paid",
      label: "Lunas",
      count: paidCount,
      active: "border-success-border bg-success-bg text-success-fg",
    },
  ] as const;

  return (
    <aside
      className={`${mobileDetailOpen ? "hidden" : "flex"} min-h-0 flex-col bg-card md:flex md:border-r md:border-border`}
    >
      <div className="flex flex-col gap-3 border-b border-border-soft p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-[15px] font-extrabold tracking-tight">
              Daftar pelanggan
            </h1>
            <p className="mt-px text-[11px] text-muted-foreground">
              {data.customers.length} pelanggan tersimpan
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
            onClick={() => setCustomerOpen(true)}
          >
            <Plus className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
            Tambah
          </Button>
        </div>

        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-[11px] size-[15px] -translate-y-1/2 text-subtle-foreground"
          />
          <Input
            ref={searchRef}
            type="search"
            aria-label="Cari pelanggan berdasarkan nama atau nomor WhatsApp"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama atau nomor WhatsApp..."
            className="h-10 rounded-[10px] border-border-soft bg-background pr-10 pl-[34px] focus-visible:bg-card md:text-[13px] [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              aria-label="Hapus pencarian"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div
          role="group"
          aria-label="Filter status pelanggan"
          className="grid grid-cols-[0.85fr_1.35fr_0.85fr] gap-1 rounded-[11px] bg-background p-[3px]"
        >
          {filters.map((filter) => {
            const isActive = customerStatus === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setCustomerStatus(filter.id)}
                className={`flex min-h-8 min-w-0 items-center justify-center gap-1 rounded-lg border px-1 py-1.5 text-[11px] font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${isActive ? filter.active : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <span className="truncate">{filter.label}</span>
                <span className="rounded-md bg-muted px-[5px] py-px text-[10px] tabular-nums">
                  {filter.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="relative min-w-0">
            <select
              value={customerSort}
              onChange={(event) =>
                setCustomerSort(event.target.value as SortKey)
              }
              aria-label="Urutkan pelanggan"
              className="h-7 max-w-full cursor-pointer appearance-none truncate rounded-md bg-transparent pr-5 text-xs font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&>option]:bg-popover [&>option]:text-popover-foreground"
            >
              <option value="latest">Urut: Aktivitas terbaru</option>
              <option value="largest">Urut: Piutang terbesar</option>
              <option value="smallest">Urut: Piutang terkecil</option>
              <option value="oldest">Urut: Aktivitas terlama</option>
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-0.5 size-3 -translate-y-1/2"
            />
          </div>
          <span
            aria-live="polite"
            aria-atomic="true"
            className="shrink-0 tabular-nums"
          >
            {visibleCustomers.length} tampil
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-[5px] p-2.5 md:min-h-0 md:flex-1 md:overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Membuka catatan…
          </div>
        )}
        {!loading && !visibleCustomers.length && (
          <div className="m-1.5 rounded-2xl border border-dashed border-border p-7 text-center">
            <div className="mx-auto grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
              <UsersRound className="size-5" />
            </div>
            <p className="mt-3 text-sm font-bold">
              {data.customers.length
                ? "Pelanggan tidak ditemukan"
                : "Belum ada pelanggan"}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {data.customers.length
                ? "Coba ubah pencarian atau pilihan status."
                : "Tambahkan pelanggan baru atau pulihkan cadangan melalui pengaturan."}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {data.customers.length ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setCustomerStatus("all");
                  }}
                >
                  Tampilkan semua
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/pengaturan">Kelola cadangan</Link>
                  </Button>
                  <Button size="sm" onClick={() => setCustomerOpen(true)}>
                    Tambah
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
        {visibleCustomers.map((customer) => {
          const selected = selectedId === customer.id;
          const unpaid = customer.balance > 0;
          return (
            <button
              type="button"
              key={customer.id}
              aria-pressed={selected}
              onClick={() => setSelectedId(customer.id)}
              className={`grid w-full grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[13px] border p-[11px] text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${selected ? "border-primary/20 bg-secondary shadow-xs dark:border-brand/30" : "border-transparent hover:border-border-soft hover:bg-card-hover"}`}
            >
              <span
                className={`grid size-[38px] place-items-center rounded-[11px] text-xs font-extrabold tracking-wide ${selected ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}
              >
                {initials(customer.name)}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-bold">
                    {customer.name}
                  </span>
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${unpaid ? "bg-warning-dot" : "bg-success-dot"}`}
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-[5px] text-[10.5px] text-muted-foreground">
                  <span className="rounded-[5px] bg-background px-1.5 py-px font-semibold">
                    {customer.debt_count} catatan
                  </span>
                  {customer.credit_balance > 0 ? (
                    <span className="rounded-[5px] bg-success-bg px-1.5 py-px font-bold text-success-fg">
                      Saldo {rupiah.format(customer.credit_balance)}
                    </span>
                  ) : (
                    <span>{formatDate(customer.last_activity_at)}</span>
                  )}
                </span>
              </span>
              <span className="text-right">
                <span
                  className={`block text-[13px] font-extrabold tracking-tight tabular-nums ${unpaid ? "text-foreground" : "text-success-fg"}`}
                >
                  {rupiah.format(customer.balance)}
                </span>
                <span
                  className={`mt-0.5 block text-[10px] font-semibold ${unpaid ? "text-warning-fg" : "text-success-fg"}`}
                >
                  {unpaid ? "Belum lunas" : "Lunas"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
