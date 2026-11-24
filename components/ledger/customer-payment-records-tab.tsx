"use client";
import { useId, useMemo, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import {
  ChevronDown,
  ReceiptText,
  SlidersHorizontal,
} from "lucide-react";

import { debtPricing, rupiah } from "@/lib/ledger/format";
import type { Debt, Payment } from "@/lib/ledger/types";

type Props = {
  selectedPayments: Payment[];
  selectedDebts: Debt[];
};

type RecordItem = {
  debtItemId: string;
  debt: Debt | undefined;
  amount: number;
};

export type PaymentRecord = {
  key: string;
  paidAt: string;
  day: string;
  total: number;
  cashTotal: number;
  creditTotal: number;
  receivedBy: string;
  items: RecordItem[];
  number: number;
};

const recordDateTime = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Satu kali "Catat pembayaran" menyimpan beberapa baris pembayaran (satu per
 * barang) dengan `paid_at` yang sama persis, karena semuanya ditulis dalam satu
 * transaksi database. Baris dengan `paid_at` identik digabung menjadi satu
 * catatan pembayaran.
 */
export function groupPaymentRecords(
  payments: Payment[],
  debts: Debt[],
): PaymentRecord[] {
  const debtById = new Map(debts.map((debt) => [debt.id, debt]));
  const records = new Map<string, PaymentRecord>();
  for (const payment of payments) {
    let record = records.get(payment.paid_at);
    if (!record) {
      const date = new Date(payment.paid_at);
      record = {
        key: payment.paid_at,
        paidAt: payment.paid_at,
        day: Number.isNaN(date.getTime()) ? "" : format(date, "yyyy-MM-dd"),
        total: 0,
        cashTotal: 0,
        creditTotal: 0,
        receivedBy: "",
        items: [],
        number: 0,
      };
      records.set(payment.paid_at, record);
    }
    record.total += payment.amount;
    if (payment.source === "credit") {
      record.creditTotal += payment.amount;
    } else {
      record.cashTotal += payment.amount;
      if (!record.receivedBy && payment.received_by) {
        record.receivedBy = payment.received_by;
      }
    }
    // Gabungkan porsi saldo dan tunai untuk barang yang sama.
    const item = record.items.find(
      (entry) => entry.debtItemId === payment.debt_item_id,
    );
    if (item) item.amount += payment.amount;
    else
      record.items.push({
        debtItemId: payment.debt_item_id,
        debt: debtById.get(payment.debt_item_id),
        amount: payment.amount,
      });
  }
  const sortKey = (debt: Debt | undefined) =>
    debt ? `${debt.date}|${debt.created_at}|${debt.id}` : "";
  return [...records.values()]
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
    .map((record, index, all) => ({
      ...record,
      // Nomor urut: catatan pertama = #1, terbaru = nomor terbesar.
      number: all.length - index,
      // Urutkan sesuai alokasi FIFO: nota terlama lebih dulu.
      items: [...record.items].sort((a, b) =>
        sortKey(a.debt).localeCompare(sortKey(b.debt)),
      ),
    }));
}

export function CustomerPaymentRecordsTab({
  selectedPayments,
  selectedDebts,
}: Props) {
  const filterId = useId();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const records = useMemo(
    () => groupPaymentRecords(selectedPayments, selectedDebts),
    [selectedPayments, selectedDebts],
  );
  const hasFilters = Boolean(startDate || endDate);
  const dateError = Boolean(startDate && endDate && startDate > endDate);
  const visibleRecords = records.filter((record) => {
    if (dateError) return false;
    if (!startDate && !endDate) return true;
    if (!record.day) return false;
    if (startDate && record.day < startDate) return false;
    if (endDate && record.day > endDate) return false;
    return true;
  });
  const visibleTotal = visibleRecords.reduce(
    (sum, record) => sum + record.total,
    0,
  );

  return (
    <TabsContent value="records" className="m-0 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border-soft px-3 py-3 @xl:px-[18px]">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={filtersOpen}
          aria-controls={`${filterId}-panel`}
          className={`h-8 gap-1.5 text-xs ${hasFilters ? "border-primary/25 bg-secondary text-primary dark:border-brand/30" : ""}`}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          Filter{hasFilters ? " aktif" : ""}
          <ChevronDown
            className={`size-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </Button>
        <p className="text-right text-[11.5px] text-muted-foreground">
          {visibleRecords.length} kali catat ·{" "}
          <span className="font-extrabold text-success-fg tabular-nums">
            {rupiah.format(visibleTotal)}
          </span>
        </p>
      </div>
      {filtersOpen && (
        <div
          id={`${filterId}-panel`}
          className="space-y-3 border-b border-border-soft bg-background px-3 py-3 @xl:px-[18px]"
        >
          <div
            role="group"
            aria-label="Filter riwayat catat pembayaran"
            className="grid grid-cols-1 gap-3 @sm:grid-cols-2"
          >
            <label className="min-w-0 space-y-1.5 text-xs font-semibold text-muted-foreground">
              <span>Dari tanggal</span>
              <Input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
                aria-invalid={dateError}
                aria-describedby={dateError ? `${filterId}-error` : undefined}
              />
            </label>
            <label className="min-w-0 space-y-1.5 text-xs font-semibold text-muted-foreground">
              <span>Sampai tanggal</span>
              <Input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                aria-invalid={dateError}
                aria-describedby={dateError ? `${filterId}-error` : undefined}
              />
            </label>
          </div>
          {dateError && (
            <p
              id={`${filterId}-error`}
              role="alert"
              className="text-xs text-destructive"
            >
              Tanggal awal tidak boleh melewati tanggal akhir.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p role="status" className="text-xs text-muted-foreground">
              Menampilkan {visibleRecords.length} dari {records.length} catatan
              pembayaran
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!hasFilters}
              className="h-7 px-2 text-xs"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
            >
              Hapus filter
            </Button>
          </div>
        </div>
      )}
      {visibleRecords.length > 0 ? (
        <ol className="divide-y divide-border-soft">
          {visibleRecords.map((record, index) => (
            <PaymentRecordRow
              key={record.key}
              record={record}
              defaultOpen={index === 0}
            />
          ))}
        </ol>
      ) : (
        <div className="grid min-h-48 place-items-center p-8 text-center">
          <div>
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <ReceiptText className="size-5" />
            </div>
            <p className="mt-3 text-sm font-bold">
              {hasFilters
                ? "Tidak ada catatan pembayaran yang sesuai"
                : "Belum ada riwayat catat pembayaran."}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {hasFilters
                ? "Ubah atau hapus filter untuk melihat catatan lainnya."
                : "Setiap kali Catat pembayaran disimpan, totalnya tampil di sini."}
            </p>
          </div>
        </div>
      )}
    </TabsContent>
  );
}

function PaymentRecordRow({
  record,
  defaultOpen,
}: {
  record: PaymentRecord;
  defaultOpen: boolean;
}) {
  const number = record.number;
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const date = new Date(record.paidAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? record.paidAt
    : recordDateTime.format(date);
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left hover:bg-card-hover @xl:px-[18px]"
      >
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">
            <span className="mr-1.5 font-mono text-[11px] text-subtle-foreground">
              #{number}
            </span>
            {dateLabel}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {record.items.length} barang
            {record.creditTotal > 0 || record.receivedBy ? " · " : ""}
            {record.receivedBy
              ? `Kasir ${record.receivedBy}`
              : record.creditTotal > 0
                ? "Dari saldo kelebihan bayar"
                : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <div className="text-right">
            <p className="text-sm font-extrabold text-success-fg tabular-nums">
              +{rupiah.format(record.total)}
            </p>
            {record.cashTotal > 0 && record.creditTotal > 0 && (
              <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                Tunai {rupiah.format(record.cashTotal)} · Saldo{" "}
                {rupiah.format(record.creditTotal)}
              </p>
            )}
            {record.cashTotal === 0 && record.creditTotal > 0 && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">Saldo</p>
            )}
          </div>
          <ChevronDown
            className={`mt-0.5 size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </div>
      </button>
      {open && (
        <div id={panelId} className="px-3 pb-3 @xl:px-[18px]">
          <ul className="divide-y divide-border-soft rounded-xl border border-border-soft bg-background">
            {record.items.map((item) => (
              <li
                key={item.debtItemId}
                className="flex items-start justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold break-words">
                    {item.debt?.item || "Piutang"}
                  </p>
                  <p className="mt-0.5 text-[11.5px] break-words text-muted-foreground">
                    {itemDetail(item.debt)}
                  </p>
                  {item.debt?.invoice_no && (
                    <p className="mt-0.5 font-mono text-[10.5px] text-subtle-foreground">
                      {item.debt.invoice_no}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-bold tabular-nums">
                    {rupiah.format(item.amount)}
                  </p>
                  {item.debt && item.amount < item.debt.amount && (
                    <p className="mt-0.5 text-[10.5px] text-muted-foreground tabular-nums">
                      dari {rupiah.format(item.debt.amount)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function itemDetail(debt: Debt | undefined) {
  if (!debt) return "Barang sudah dihapus";
  const { unitPrice, discount } = debtPricing(debt);
  return `${debt.qty} × ${rupiah.format(unitPrice)}${discount > 0 ? ` − diskon ${rupiah.format(discount)}` : ""}`;
}
