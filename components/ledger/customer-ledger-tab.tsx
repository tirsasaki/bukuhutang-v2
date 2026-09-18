"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock3,
  ReceiptText,
  UserRound,
} from "lucide-react";
import { formatDate, rupiah } from "@/lib/ledger/format";
import type { Customer, Debt } from "@/lib/ledger/types";

type Props = { selected: Customer; selectedDebts: Debt[] };
export function CustomerLedgerTab({ selected, selectedDebts }: Props) {
  const total = selectedDebts.reduce((sum, debt) => sum + debt.amount, 0);
  const paid = selectedDebts.reduce((sum, debt) => sum + debt.paid_amount, 0);
  const outstanding = selectedDebts.reduce(
    (sum, debt) => sum + Math.max(0, debt.amount - debt.paid_amount),
    0,
  );
  const openCount = selectedDebts.filter(
    (debt) => debt.amount > debt.paid_amount,
  ).length;
  return (
    <TabsContent value="ledger" className="m-0 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-5 @xl:px-5">
        <div>
          <h3 className="text-sm font-bold">Riwayat buku piutang</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {selectedDebts.length} catatan · {openCount} belum lunas · Transaksi
            terbaru di atas
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary/70 px-2.5 py-1.5 text-[11px] font-medium text-primary">
          <ReceiptText className="size-3.5" aria-hidden="true" />
          Rincian per barang
        </span>
      </div>
      {selectedDebts.length > 0 ? (
        <>
          <p className="flex items-center gap-1.5 border-t border-border/60 bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground @4xl:hidden">
            <ArrowLeftRight className="size-3" aria-hidden="true" />
            Geser tabel untuk melihat seluruh rincian
          </p>
          <div
            role="region"
            aria-label={`Tabel piutang ${selected.name}`}
            tabIndex={0}
            className="overflow-x-auto [&>[data-slot=table-container]]:overflow-visible focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <Table className="min-w-[780px]">
              <caption className="sr-only">
                Rincian piutang {selected.name}: nota, barang, nilai,
                pembayaran, dan sisa tagihan.
              </caption>
              <TableHeader className="border-y border-border/70 bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead
                    scope="col"
                    className="pl-5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Nota / tanggal
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Barang / rincian
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Nilai piutang
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Terbayar
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Sisa tagihan
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="pr-5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDebts.map((debt) => {
                  const price =
                    (debt.price_mode === "wholesale"
                      ? debt.wholesale_price
                      : debt.unit_price) ?? debt.amount / Math.max(1, debt.qty);
                  const remaining = Math.max(0, debt.amount - debt.paid_amount);
                  const settled = remaining <= 0;
                  const partial = !settled && debt.paid_amount > 0;
                  const percent = settled
                    ? 100
                    : Math.min(
                        99,
                        Math.max(
                          0,
                          Math.floor((debt.paid_amount / debt.amount) * 100),
                        ),
                      );
                  return (
                    <TableRow
                      key={debt.id}
                      className="border-border/60 hover:bg-secondary/20"
                    >
                      <TableCell className="py-4 pl-5 align-top">
                        <p className="font-mono text-[11px] font-medium text-primary">
                          {debt.invoice_no || "Tanpa nota"}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDate(debt.date)}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-[320px] min-w-[200px] py-4 whitespace-normal">
                        <p className="break-words text-sm font-semibold">
                          {debt.item || "Piutang"}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="tabular-nums">
                            {debt.qty} × {rupiah.format(price)}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${debt.price_mode === "wholesale" ? "bg-violet-50 text-violet-700" : "bg-muted text-muted-foreground"}`}
                          >
                            {debt.price_mode === "wholesale"
                              ? "Grosir"
                              : "Eceran"}
                          </span>
                        </div>
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <UserRound
                            className="size-3 shrink-0"
                            aria-hidden="true"
                          />
                          {debt.cashier || "Kasir belum dicatat"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold tabular-nums">
                        {rupiah.format(debt.amount)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-emerald-800 tabular-nums">
                        {rupiah.format(debt.paid_amount)}
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm font-bold tabular-nums ${settled ? "text-muted-foreground" : "text-primary"}`}
                      >
                        {rupiah.format(remaining)}
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold ${settled ? "bg-emerald-50 text-emerald-800" : partial ? "bg-sky-50 text-sky-800" : "bg-amber-50 text-amber-800"}`}
                        >
                          {settled ? (
                            <CheckCircle2
                              className="size-3"
                              aria-hidden="true"
                            />
                          ) : (
                            <Clock3 className="size-3" aria-hidden="true" />
                          )}
                          {settled
                            ? "Lunas"
                            : partial
                              ? "Sebagian"
                              : "Belum lunas"}
                        </span>
                        <div className="mt-2 ml-auto w-24">
                          <div
                            className="h-1 overflow-hidden rounded-full bg-muted"
                            aria-hidden="true"
                          >
                            <div
                              className={`h-full rounded-full ${settled ? "bg-emerald-500" : "bg-primary/60"}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {percent}% terbayar
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={2} className="py-4 pl-5 text-xs">
                    Total {selectedDebts.length} catatan
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold tabular-nums">
                    {rupiah.format(total)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold text-emerald-800 tabular-nums">
                    {rupiah.format(paid)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-bold text-primary tabular-nums">
                    {rupiah.format(outstanding)}
                  </TableCell>
                  <TableCell className="pr-5 text-right text-[11px] text-muted-foreground">
                    {openCount} belum lunas
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      ) : (
        <div className="grid min-h-56 place-items-center border-t border-border/60 p-8 text-center">
          <div>
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
              <ReceiptText className="size-5" aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm font-semibold">Belum ada piutang</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Catatan piutang pelanggan akan tampil di sini.
            </p>
          </div>
        </div>
      )}
    </TabsContent>
  );
}
