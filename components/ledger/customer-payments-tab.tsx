"use client";
import { useId, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { ChevronDown, SlidersHorizontal, WalletCards } from "lucide-react";

import { debtPricing, formatDate, rupiah } from "@/lib/ledger/format";
import type { Debt, Payment } from "@/lib/ledger/types";
type Props = {
  selectedPayments: Payment[];
  selectedDebts: Debt[];
};
export function CustomerPaymentsTab({
  selectedPayments,
  selectedDebts,
}: Props) {
  const filterId = useId();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasFilters = Boolean(startDate || endDate || minAmount || maxAmount);
  const dateError = Boolean(startDate && endDate && startDate > endDate);
  const amountError = Boolean(
    (minAmount && Number(minAmount) < 0) ||
    (maxAmount && Number(maxAmount) < 0) ||
    (minAmount && maxAmount && Number(minAmount) > Number(maxAmount)),
  );
  const visiblePayments = selectedPayments.filter((payment) => {
    if (dateError || amountError) return false;
    if (startDate || endDate) {
      const date = new Date(payment.paid_at);
      if (Number.isNaN(date.getTime())) return false;
      // Samakan tanggal lokal dengan tanggal pembayaran yang ditampilkan.
      const day = format(date, "yyyy-MM-dd");
      if (startDate && day < startDate) return false;
      if (endDate && day > endDate) return false;
    }
    if (minAmount && payment.amount < Number(minAmount)) return false;
    if (maxAmount && payment.amount > Number(maxAmount)) return false;
    return true;
  });
  const debtById = new Map(selectedDebts.map((debt) => [debt.id, debt]));
  const visibleTotal = visiblePayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const th =
    "h-auto px-3.5 py-2.5 text-[11px] font-bold tracking-[0.04em] text-subtle-foreground uppercase";
  const td = "px-3.5 py-3 align-top text-[13px]";
  return (
    <TabsContent value="payments" className="m-0 min-w-0">
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
          {hasFilters ? "Total hasil filter" : "Total pembayaran"}{" "}
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
            aria-label="Filter pembayaran"
            className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @3xl:grid-cols-4"
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
            <label className="min-w-0 space-y-1.5 text-xs font-semibold text-muted-foreground">
              <span>Nominal minimum (Rp)</span>
              <FormattedNumberInput
                min={0}
                placeholder="Tanpa batas"
                value={minAmount}
                onValueChange={setMinAmount}
                aria-invalid={amountError}
                aria-describedby={amountError ? `${filterId}-error` : undefined}
              />
            </label>
            <label className="min-w-0 space-y-1.5 text-xs font-semibold text-muted-foreground">
              <span>Nominal maksimum (Rp)</span>
              <FormattedNumberInput
                min={0}
                placeholder="Tanpa batas"
                value={maxAmount}
                onValueChange={setMaxAmount}
                aria-invalid={amountError}
                aria-describedby={amountError ? `${filterId}-error` : undefined}
              />
            </label>
          </div>
          {(dateError || amountError) && (
            <p
              id={`${filterId}-error`}
              role="alert"
              className="text-xs text-destructive"
            >
              {dateError && "Tanggal awal tidak boleh melewati tanggal akhir. "}
              {amountError &&
                "Nominal harus nol atau lebih, dan minimum tidak boleh melebihi maksimum."}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p role="status" className="text-xs text-muted-foreground">
              Menampilkan {visiblePayments.length} dari{" "}
              {selectedPayments.length} pembayaran
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
                setMinAmount("");
                setMaxAmount("");
              }}
            >
              Hapus filter
            </Button>
          </div>
        </div>
      )}
      {visiblePayments.length > 0 ? (
        <>
          {/* Kartu untuk layar sempit */}
          <ul className="divide-y divide-border-soft @xl:hidden">
            {visiblePayments.map((payment) => {
              const debt = debtById.get(payment.debt_item_id);
              return (
                <li key={payment.id} className="px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold">
                        {formatDate(payment.paid_at)}
                      </p>
                      <p className="mt-0.5 text-xs break-words text-muted-foreground">
                        {paymentNote(debt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-extrabold text-success-fg tabular-nums">
                      +{rupiah.format(payment.amount)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
                    <SourceBadge source={payment.source} />
                    <span className="truncate">
                      {payment.source === "credit"
                        ? "Kelebihan bayar tersimpan"
                        : payment.received_by || "Kasir tidak dicatat"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          {/* Tabel untuk layar lebar */}
          <div className="hidden overflow-x-auto @xl:block [&>[data-slot=table-container]]:overflow-visible">
            <Table className="min-w-[600px]">
              <caption className="sr-only">
                Riwayat pembayaran pelanggan: tanggal, catatan, kasir, sumber,
                dan nominal.
              </caption>
              <TableHeader>
                <TableRow className="border-border-soft bg-background hover:bg-background">
                  <TableHead className={th}>Tanggal</TableHead>
                  <TableHead className={th}>Catatan</TableHead>
                  <TableHead className={th}>Kasir</TableHead>
                  <TableHead className={th}>Sumber</TableHead>
                  <TableHead className={`${th} text-right`}>Nominal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiblePayments.map((payment) => {
                  const debt = debtById.get(payment.debt_item_id);
                  return (
                    <TableRow
                      key={payment.id}
                      className="border-border-soft hover:bg-card-hover"
                    >
                      <TableCell className={`${td} font-semibold whitespace-nowrap`}>
                        {formatDate(payment.paid_at)}
                      </TableCell>
                      <TableCell className={`${td} min-w-[200px] whitespace-normal text-muted-foreground`}>
                        {paymentNote(debt)}
                        {debt?.invoice_no && (
                          <span className="mt-0.5 block font-mono text-[10.5px] text-subtle-foreground">
                            {debt.invoice_no}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className={`${td} text-xs text-muted-foreground`}>
                        {payment.source === "credit"
                          ? "—"
                          : payment.received_by || "—"}
                      </TableCell>
                      <TableCell className={td}>
                        <SourceBadge source={payment.source} />
                      </TableCell>
                      <TableCell className={`${td} text-right font-extrabold text-success-fg tabular-nums`}>
                        +{rupiah.format(payment.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <div className="grid min-h-48 place-items-center p-8 text-center">
          <div>
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <WalletCards className="size-5" />
            </div>
            <p className="mt-3 text-sm font-bold">
              {hasFilters
                ? "Tidak ada pembayaran yang sesuai"
                : "Belum ada riwayat pembayaran."}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {hasFilters
                ? "Ubah atau hapus filter untuk melihat pembayaran lainnya."
                : "Pembayaran pelanggan akan tampil di sini."}
            </p>
          </div>
        </div>
      )}
    </TabsContent>
  );
}

function paymentNote(debt: Debt | undefined) {
  if (!debt) return "Pembayaran piutang";
  const { unitPrice, discount } = debtPricing(debt);
  return `${debt.item || "Piutang"} · ${debt.qty} × ${rupiah.format(unitPrice)}${discount > 0 ? ` − diskon ${rupiah.format(discount)}` : ""}`;
}

function SourceBadge({ source }: { source: Payment["source"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-[9px] py-[3px] text-[11px] font-bold whitespace-nowrap ${source === "credit" ? "border-success-border bg-success-bg text-success-fg" : "border-border bg-background text-muted-foreground"}`}
    >
      {source === "credit" ? "Saldo" : "Tunai / Transfer"}
    </span>
  );
}
