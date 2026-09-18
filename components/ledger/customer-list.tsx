"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronRight,
  Loader2,
  Search,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";

import { formatDate, rupiah } from "@/lib/ledger/format";
import type { LedgerData } from "@/lib/ledger/types";
type Props = {
  data: LedgerData;
  loading: boolean;
  selectedId: string;
  setSelectedId: (id: string) => void;
  setCustomerOpen: (open: boolean) => void;
  setImportOpen: (open: boolean) => void;
};
export function CustomerList({
  data,
  loading,
  selectedId,
  setSelectedId,
  setCustomerOpen,
  setImportOpen,
}: Props) {
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
      <div className="sticky top-0 z-10 space-y-3 border-b border-border bg-card/95 p-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
              <UsersRound className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Daftar pelanggan
              </h1>
              <p className="text-xs text-muted-foreground">
                {data.customers.length} pelanggan tersimpan
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setCustomerOpen(true)}
          >
            <UserPlus className="size-4" /> Tambah
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama atau nomor WhatsApp…"
            className="h-10 rounded-xl bg-muted/40 pl-9"
          />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <select
            value={customerSort}
            onChange={(event) =>
              setCustomerSort(event.target.value as typeof customerSort)
            }
            aria-label="Urutkan pelanggan"
            className="h-9 min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="latest">Aktivitas terbaru</option>
            <option value="oldest">Aktivitas terlama</option>
            <option value="largest">Piutang terbesar</option>
            <option value="smallest">Piutang terkecil</option>
          </select>
          <span className="flex h-9 items-center rounded-lg border border-border bg-muted/40 px-3 text-xs font-medium text-muted-foreground">
            {visibleCustomers.length} tampil
          </span>
        </div>
        <div className="grid grid-cols-3 rounded-xl bg-muted p-1">
          {(
            [
              { id: "all", label: "Semua", count: data.customers.length },
              {
                id: "unpaid",
                label: "Menunggak",
                count: data.customers.filter((customer) => customer.balance > 0)
                  .length,
              },
              {
                id: "paid",
                label: "Lunas",
                count: data.customers.filter(
                  (customer) => customer.balance <= 0,
                ).length,
              },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setCustomerStatus(filter.id)}
              className={`rounded-lg px-2 py-2 text-xs font-semibold transition-all ${customerStatus === filter.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {filter.label}{" "}
              <span className="ml-1 opacity-70">{filter.count}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="p-3">
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
                : "Impor cadangan lama atau tambahkan pelanggan baru."}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImportOpen(true)}
                  >
                    Impor
                  </Button>
                  <Button size="sm" onClick={() => setCustomerOpen(true)}>
                    Tambah
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
        <div className="space-y-2">
          {visibleCustomers.map((customer) => (
            <button
              type="button"
              key={customer.id}
              onClick={() => setSelectedId(customer.id)}
              className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-3 py-3.5 text-left ${selectedId === customer.id ? "border-primary/30 bg-secondary shadow-sm ring-1 ring-primary/10" : "border-border/70 bg-card"}`}
            >
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold ${selectedId === customer.id ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}
              >
                {customer.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold">
                    {customer.name}
                  </span>
                  <span
                    className={`size-2 shrink-0 rounded-full ${customer.balance > 0 ? "bg-amber-500" : "bg-emerald-500"}`}
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
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Saldo {rupiah.format(customer.credit_balance)}
                    </span>
                  )}
                </span>
              </span>
              <span className="flex min-w-[105px] items-center justify-end gap-1">
                <span className="text-right">
                  <span
                    className={`block text-sm font-extrabold tracking-tight ${customer.balance > 0 ? "text-foreground" : "text-emerald-700"}`}
                  >
                    {rupiah.format(customer.balance)}
                  </span>
                  <span
                    className={`mt-1 block text-[10px] font-semibold uppercase tracking-wide ${customer.balance > 0 ? "text-amber-700" : "text-emerald-700"}`}
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
