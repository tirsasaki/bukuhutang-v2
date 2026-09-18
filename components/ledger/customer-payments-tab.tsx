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
import { CalendarDays, WalletCards } from "lucide-react";

import { formatDate, rupiah } from "@/lib/ledger/format";
import type { Payment } from "@/lib/ledger/types";
type Props = {
  selectedPayments: Payment[];
};
export function CustomerPaymentsTab({ selectedPayments }: Props) {
  return (
    <TabsContent value="payments" className="m-0">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-4 py-5 @xl:px-5">
        <div>
          <h3 className="text-sm font-bold">Riwayat pembayaran</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Semua pembayaran tunai dan penggunaan saldo pelanggan.
          </p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-right dark:bg-emerald-400/15">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Total pembayaran
          </p>
          <p className="text-sm font-bold text-emerald-900 tabular-nums dark:text-emerald-200">
            {rupiah.format(
              selectedPayments.reduce(
                (total, payment) => total + payment.amount,
                0,
              ),
            )}
          </p>
        </div>
      </div>
      {selectedPayments.length > 0 ? (
        <Table className="min-w-[520px]">
          <caption className="sr-only">
            Riwayat pembayaran tunai dan penggunaan saldo pelanggan.
          </caption>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-muted/40">
              <TableHead className="pl-5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tanggal
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
            {selectedPayments.map((payment) => (
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
                <TableCell>
                  {payment.source === "credit" ? (
                    <div>
                      <Badge className="rounded-md bg-violet-50 text-[10px] text-violet-800">
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
                  <span className="inline-flex rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 tabular-nums dark:bg-emerald-400/15 dark:text-emerald-300">
                    + {rupiah.format(payment.amount)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="grid min-h-56 place-items-center p-8 text-center">
          <div>
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <WalletCards className="size-5" />
            </div>
            <p className="mt-3 font-semibold">Belum ada pembayaran</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Pembayaran pelanggan akan tampil di sini.
            </p>
          </div>
        </div>
      )}
    </TabsContent>
  );
}
