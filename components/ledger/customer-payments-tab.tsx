"use client";
import { useId, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import {
  CalendarDays,
  PackageOpen,
  ReceiptText,
  WalletCards,
} from "lucide-react";

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
  return (
    <TabsContent value="payments" className="m-0 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-4 py-5 @xl:px-5">
        <div>
          <h3 className="text-sm font-bold">Riwayat pembayaran</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Semua pembayaran tunai dan penggunaan saldo pelanggan.
          </p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-right dark:bg-emerald-400/15">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-300">
            {hasFilters ? "Total hasil filter" : "Total pembayaran"}
          </p>
          <p className="text-sm font-bold text-emerald-900 tabular-nums dark:text-emerald-200">
            {rupiah.format(
              visiblePayments.reduce(
                (total, payment) => total + payment.amount,
                0,
              ),
            )}
          </p>
        </div>
      </div>
      <div className="space-y-3 border-b border-border/70 bg-muted/20 px-4 py-3 @xl:px-5">
        <div role="group" aria-label="Filter pembayaran" className="grid grid-cols-1 gap-3 @sm:grid-cols-2 @3xl:grid-cols-4">
          <label className="min-w-0 space-y-1.5 text-xs font-medium">
            <span>Dari tanggal</span>
            <Input type="date" value={startDate} max={endDate || undefined}
              onChange={(event) => setStartDate(event.target.value)}
              aria-invalid={dateError} aria-describedby={dateError ? `${filterId}-error` : undefined}
              className="text-xs!" />
          </label>
          <label className="min-w-0 space-y-1.5 text-xs font-medium">
            <span>Sampai tanggal</span>
            <Input type="date" value={endDate} min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
              aria-invalid={dateError} aria-describedby={dateError ? `${filterId}-error` : undefined}
              className="text-xs!" />
          </label>
          <label className="min-w-0 space-y-1.5 text-xs font-medium">
            <span>Nominal minimum (Rp)</span>
            <FormattedNumberInput min={0} placeholder="Tanpa batas"
              value={minAmount} onValueChange={setMinAmount}
              aria-invalid={amountError} aria-describedby={amountError ? `${filterId}-error` : undefined}
              className="text-xs!" />
          </label>
          <label className="min-w-0 space-y-1.5 text-xs font-medium">
            <span>Nominal maksimum (Rp)</span>
            <FormattedNumberInput min={0} placeholder="Tanpa batas"
              value={maxAmount} onValueChange={setMaxAmount}
              aria-invalid={amountError} aria-describedby={amountError ? `${filterId}-error` : undefined}
              className="text-xs!" />
          </label>
        </div>
        {(dateError || amountError) && (
          <p id={`${filterId}-error`} role="alert" className="text-xs text-destructive">
            {dateError && "Tanggal awal tidak boleh melewati tanggal akhir. "}
            {amountError && "Nominal harus nol atau lebih, dan minimum tidak boleh melebihi maksimum."}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="status" className="text-xs text-muted-foreground">
            Menampilkan {visiblePayments.length} dari {selectedPayments.length} pembayaran
          </p>
          <Button type="button" variant="ghost" size="sm" disabled={!hasFilters}
            className="h-7 px-2 text-xs!"
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setMinAmount("");
              setMaxAmount("");
            }}>
            Hapus filter
          </Button>
        </div>
      </div>
      {visiblePayments.length > 0 ? (
        <>
          <div className="space-y-3 bg-muted/20 p-3 @4xl:hidden">
            {visiblePayments.map((payment) => {
              const debt = debtById.get(payment.debt_item_id);
              const pricing = debt ? debtPricing(debt) : null;
              const price = pricing?.unitPrice ?? 0;
              const discount = pricing?.discount ?? 0;
              return (
                <article
                  key={payment.id}
                  className="rounded-xl border border-border/70 bg-card p-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                      <CalendarDays className="size-3.5" aria-hidden="true" />
                      {formatDate(payment.paid_at)}
                    </span>
                    <span className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-900 tabular-nums dark:bg-emerald-400/15 dark:text-emerald-300">
                      + {rupiah.format(payment.amount)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-start gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                      <PackageOpen className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold">
                        {debt?.item || "Piutang"}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                        {debt
                          ? `${debt.qty} × ${rupiah.format(price)}`
                          : "Rincian lama"}
                        {discount > 0
                          ? ` · diskon ${rupiah.format(discount)} · subtotal ${rupiah.format(debt?.amount ?? 0)}`
                          : ""}
                        {debt?.invoice_no ? ` · ${debt.invoice_no}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-border/60 pt-3">
                    {payment.source === "credit" ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="rounded-md bg-violet-50 text-[10px] text-violet-900 dark:bg-violet-400/15 dark:text-violet-300">
                          Saldo pelanggan
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          Kelebihan bayar tersimpan
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Pembayaran tunai · diterima oleh {payment.received_by || "kasir tidak dicatat"}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="hidden @4xl:block">
            <Table className="min-w-[760px]">
          <caption className="sr-only">
            Riwayat pembayaran, barang terkait, dan sumber pembayaran
            pelanggan.
          </caption>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-muted/40">
              <TableHead className="pl-5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tanggal
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Barang / piutang
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Sumber pembayaran
              </TableHead>
              <TableHead className="pr-5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Nominal
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiblePayments.map((payment) => {
              const debt = debtById.get(payment.debt_item_id);
              const pricing = debt ? debtPricing(debt) : null;
              const price = pricing?.unitPrice ?? 0;
              const discount = pricing?.discount ?? 0;
              return (
                <TableRow
                  key={payment.id}
                  className="h-20 border-border/60 hover:bg-secondary/20"
                >
                <TableCell className="pl-5">
                  <span className="flex items-center gap-2 whitespace-nowrap text-xs font-medium">
                    <CalendarDays className="size-4 text-muted-foreground" />
                    {formatDate(payment.paid_at)}
                  </span>
                </TableCell>
                <TableCell className="min-w-[190px]">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                      <PackageOpen className="size-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold">
                        {debt?.item || "Piutang"}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="tabular-nums">
                          {debt
                            ? `${debt.qty} × ${rupiah.format(price)}`
                            : "Rincian lama"}
                          {discount > 0
                            ? ` · diskon ${rupiah.format(discount)} · subtotal ${rupiah.format(debt?.amount ?? 0)}`
                            : ""}
                        </span>
                        {debt?.invoice_no && (
                          <span className="inline-flex items-center gap-1 font-mono">
                            <ReceiptText className="size-3" aria-hidden="true" />
                            {debt.invoice_no}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {payment.source === "credit" ? (
                    <div>
                      <Badge className="rounded-md bg-violet-50 text-[10px] text-violet-900 dark:bg-violet-400/15 dark:text-violet-300">
                        Saldo pelanggan
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Diambil dari kelebihan bayar tersimpan
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold">Pembayaran tunai</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Diterima oleh{" "}
                        {payment.received_by || "kasir tidak dicatat"}
                      </p>
                    </div>
                  )}
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <span className="inline-flex rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900 tabular-nums dark:bg-emerald-400/15 dark:text-emerald-300">
                    + {rupiah.format(payment.amount)}
                  </span>
                </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <div className="grid min-h-56 place-items-center p-8 text-center">
          <div>
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <WalletCards className="size-5" />
            </div>
            <p className="mt-3 font-semibold">
              {hasFilters ? "Tidak ada pembayaran yang sesuai" : "Belum ada pembayaran"}
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
