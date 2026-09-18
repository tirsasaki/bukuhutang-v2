"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowDownWideNarrow,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock3,
  Plus,
  X,
  Loader2,
  Search,
  UsersRound,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";

import { formatDate, rupiah } from "@/lib/ledger/format";
import type { LedgerData } from "@/lib/ledger/types";
type Props = {
  data: LedgerData;
  loading: boolean;
  selectedId: string;
  setSelectedId: (id: string) => void;
  setCustomerOpen: (open: boolean) => void;
};
export function CustomerList({
  data,
  loading,
  selectedId,
  setSelectedId,
  setCustomerOpen,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [customerSort, setCustomerSort] = useState<
    "latest" | "oldest" | "largest" | "smallest"
  >("latest");
  const [customerStatus, setCustomerStatus] = useState<
    "all" | "unpaid" | "paid"
  >("all");
  const visibleCustomers = useMemo(
    () =>
      data.customers
        .filter((customer) =>
          `${customer.name} ${customer.phone}`
            .toLowerCase()
            .includes(query.toLowerCase()),
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

  return (
    <aside className="border-b border-border bg-card lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="sticky top-0 z-10 space-y-3 border-b border-border/80 bg-card/95 p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight">
              Daftar pelanggan
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {data.customers.length} pelanggan tersimpan
            </p>
          </div>
          <Button
            type="button"
            aria-label="Tambah pelanggan"
            className="h-9 gap-2 rounded-xl pr-3 pl-1.5 text-xs! font-semibold! shadow-sm transition-colors"
            onClick={() => setCustomerOpen(true)}
          >
            <span className="grid size-6 place-items-center rounded-lg bg-white/15">
              <Plus className="size-3.5" aria-hidden="true" />
            </span>
            Tambah
          </Button>
        </div>
        <div className="group relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
          />
          <Input
            ref={searchRef}
            type="text"
            aria-label="Cari pelanggan berdasarkan nama atau nomor WhatsApp"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama atau nomor WhatsApp"
            className="h-11 rounded-xl border-border/80 bg-muted/40 pr-11 pl-10 text-sm! shadow-none transition-colors placeholder:text-xs focus-visible:border-primary/40 focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-primary/10"
          />
          {query && (
            <button
              type="button"
              aria-label="Hapus pencarian"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-border/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        <div
          role="group"
          aria-label="Filter status pelanggan"
          className="grid grid-cols-[1fr_1.3fr_1fr] gap-1 rounded-xl bg-muted/70 p-1"
        >
          {(
            [
              {
                id: "all",
                label: "Semua",
                icon: UsersRound,
                count: data.customers.length,
                activeClass: "text-primary",
                iconClass: "text-primary",
              },
              {
                id: "unpaid",
                label: "Menunggak",
                icon: Clock3,
                count: data.customers.filter((customer) => customer.balance > 0)
                  .length,
                activeClass: "text-amber-900 dark:text-amber-300",
                iconClass: "text-amber-900 dark:text-amber-300",
              },
              {
                id: "paid",
                label: "Lunas",
                icon: CheckCheck,
                count: data.customers.filter(
                  (customer) => customer.balance <= 0,
                ).length,
                activeClass: "text-emerald-900 dark:text-emerald-300",
                iconClass: "text-emerald-900 dark:text-emerald-300",
              },
            ] as const
          ).map(({ icon: Icon, ...filter }) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={customerStatus === filter.id}
              onClick={() => setCustomerStatus(filter.id)}
              className={`flex h-8 min-w-0 items-center justify-center gap-1 rounded-lg px-1 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${customerStatus === filter.id ? `bg-card shadow-sm ring-1 ring-border/50 ${filter.activeClass}` : "text-muted-foreground hover:bg-card/60 hover:text-foreground"}`}
            >
              <Icon
                className={`size-3 shrink-0 ${customerStatus === filter.id ? filter.iconClass : ""}`}
                aria-hidden="true"
              />
              <span className="text-[11px] font-semibold">{filter.label}</span>
              <span
                className={`min-w-4 shrink-0 rounded-md px-1 py-0.5 text-[10px] leading-none font-semibold tabular-nums ${customerStatus === filter.id ? "bg-current/5" : "bg-card/70"}`}
              >
                {filter.count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="relative min-w-0">
            <ArrowDownWideNarrow
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-0 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <select
              value={customerSort}
              onChange={(event) =>
                setCustomerSort(event.target.value as typeof customerSort)
              }
              aria-label="Urutkan pelanggan"
              className="h-7 w-full appearance-none rounded-md bg-transparent pr-6 pl-5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="latest">Aktivitas terbaru</option>
              <option value="oldest">Aktivitas terlama</option>
              <option value="largest">Piutang terbesar</option>
              <option value="smallest">Piutang terkecil</option>
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-1 size-3 -translate-y-1/2 text-muted-foreground"
            />
          </div>
          <span
            aria-live="polite"
            aria-atomic="true"
            className="shrink-0 text-[11px] text-muted-foreground tabular-nums"
          >
            {visibleCustomers.length} tampil
          </span>
        </div>
      </div>
      <div className="p-2.5">
        {!loading && visibleCustomers.length > 0 && (
          <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Pelanggan</span>
            <span>Saldo piutang</span>
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Membuka catatan…
          </div>
        )}
        {!loading && !visibleCustomers.length && (
          <div className="m-2 rounded-2xl border border-dashed p-8 text-center">
            <div className="mx-auto grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
              <UsersRound className="size-5" />
            </div>
            <p className="mt-3 font-semibold">
              {data.customers.length
                ? "Pelanggan tidak ditemukan"
                : "Belum ada pelanggan"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
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
        <div className="space-y-1.5">
          {visibleCustomers.map((customer) => (
            <button
              type="button"
              key={customer.id}
              aria-pressed={selectedId === customer.id}
              onClick={() => setSelectedId(customer.id)}
              className={`group relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedId === customer.id ? "border-primary/20 bg-secondary/80 shadow-xs" : "border-transparent bg-card hover:border-border/80 hover:bg-muted/50"}`}
            >
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-xl text-xs font-bold ${selectedId === customer.id ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}
              >
                {customer.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">
                    {customer.name}
                  </span>
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${customer.balance > 0 ? "bg-amber-500" : "bg-emerald-500"}`}
                  />
                </span>
                <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {customer.debt_count} catatan
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Aktif {formatDate(customer.last_activity_at)}
                  </span>
                  {customer.credit_balance > 0 && (
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-300">
                      Saldo {rupiah.format(customer.credit_balance)}
                    </span>
                  )}
                </span>
              </span>
              <span className="flex min-w-[88px] items-center justify-end gap-1">
                <span className="text-right">
                  <span
                    className={`block text-sm font-bold tracking-tight tabular-nums ${customer.balance > 0 ? "text-foreground" : "text-emerald-900 dark:text-emerald-300"}`}
                  >
                    {rupiah.format(customer.balance)}
                  </span>
                  <span
                    className={`mt-1 block text-[10px] font-medium ${customer.balance > 0 ? "text-amber-900 dark:text-amber-300" : "text-emerald-900 dark:text-emerald-300"}`}
                  >
                    {customer.balance > 0 ? "Belum lunas" : "Lunas"}
                  </span>
                </span>
                <ChevronRight
                  className={`size-4 ${selectedId === customer.id ? "text-primary" : "text-muted-foreground"}`}
                />
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
