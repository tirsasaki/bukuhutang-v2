"use client";
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
import { CalendarDays, ReceiptText } from "lucide-react";

import { formatDate, rupiah } from "@/lib/ledger/format";
import type { Customer, Debt } from "@/lib/ledger/types";
type Props = {
  selected: Customer;
  selectedDebts: Debt[];
};
export function CustomerLedgerTab({ selected, selectedDebts }: Props) {
  return (
    <TabsContent value="ledger" className="m-0">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h3 className="font-bold">Riwayat buku piutang</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Rincian barang, nota, dan sisa tagihan pelanggan.
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 px-3 py-2 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            Belum lunas
          </p>
          <p className="font-extrabold text-amber-900">
            {rupiah.format(selected.balance)}
          </p>
        </div>
      </div>
      {selectedDebts.length > 0 ? (
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-muted/40">
              <TableHead className="pl-5 text-xs uppercase tracking-wide text-muted-foreground">
                Tanggal
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                Nota
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                Barang / keterangan
              </TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide text-muted-foreground">
                Nilai piutang
              </TableHead>
              <TableHead className="pr-5 text-right text-xs uppercase tracking-wide text-muted-foreground">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedDebts.map((debt) => {
              const appliedPrice =
                debt.price_mode === "wholesale"
                  ? debt.wholesale_price
                  : debt.unit_price;
              const remaining = Math.max(0, debt.amount - debt.paid_amount);
              return (
                <TableRow key={debt.id} className="h-16">
                  <TableCell className="pl-5">
                    <span className="flex items-center gap-2 whitespace-nowrap font-medium">
                      <CalendarDays className="size-4 text-muted-foreground" />
                      {formatDate(debt.date)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {debt.invoice_no || "Tanpa nota"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{debt.item || "Piutang"}</p>
                      {debt.price_mode === "wholesale" && (
                        <Badge variant="secondary">Grosir</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {debt.qty} ×{" "}
                      {rupiah.format(
                        appliedPrice ?? debt.amount / Math.max(1, debt.qty),
                      )}
                      {debt.cashier ? ` · Kasir ${debt.cashier}` : ""}
                    </p>
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {rupiah.format(debt.amount)}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <span
                      className={`inline-flex min-w-[104px] flex-col rounded-xl px-3 py-1.5 ${remaining <= 0 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wide">
                        {remaining <= 0 ? "Lunas" : "Tersisa"}
                      </span>
                      <span className="font-bold">
                        {rupiah.format(remaining)}
                      </span>
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="grid min-h-56 place-items-center p-8 text-center">
          <div>
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <ReceiptText className="size-5" />
            </div>
            <p className="mt-3 font-semibold">Belum ada piutang</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Catatan piutang pelanggan akan tampil di sini.
            </p>
          </div>
        </div>
      )}
    </TabsContent>
  );
}
