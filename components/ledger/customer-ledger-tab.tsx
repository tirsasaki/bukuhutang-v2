"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  CheckCircle2,
  Clock3,
  Loader2,
  ReceiptText,
  Trash2,
  UserRound,
} from "lucide-react";
import { asNumber, formatDate, rupiah } from "@/lib/ledger/format";
import type { Customer, Debt, PostAction } from "@/lib/ledger/types";
import { toast } from "sonner";

type Props = {
  selected: Customer;
  selectedDebts: Debt[];
  postAction: PostAction;
};
export function CustomerLedgerTab({
  selected,
  selectedDebts,
  postAction,
}: Props) {
  const [filter, setFilter] = useState<"all" | "active">("all");
  const [selectedDebtIds, setSelectedDebtIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const customerDebts = useMemo(
    () =>
      selectedDebts.filter((debt) => debt.customer_id === selected.id),
    [selected.id, selectedDebts],
  );
  const activeDebts = customerDebts.filter(
    (debt) => debt.amount > debt.paid_amount,
  );
  const visibleDebts = filter === "active" ? activeDebts : customerDebts;
  const total = visibleDebts.reduce((sum, debt) => sum + debt.amount, 0);
  const paid = visibleDebts.reduce((sum, debt) => sum + debt.paid_amount, 0);
  const outstanding = visibleDebts.reduce(
    (sum, debt) => sum + Math.max(0, debt.amount - debt.paid_amount),
    0,
  );
  const openCount = activeDebts.length;
  const allVisibleSelected =
    visibleDebts.length > 0 &&
    visibleDebts.every((debt) => selectedDebtIds.has(debt.id));
  const someVisibleSelected = visibleDebts.some((debt) =>
    selectedDebtIds.has(debt.id),
  );

  function changeFilter(nextFilter: "all" | "active") {
    setFilter(nextFilter);
    setSelectedDebtIds(new Set());
  }

  function toggleDebt(debtId: string, checked: boolean) {
    setSelectedDebtIds((current) => {
      const next = new Set(current);
      if (checked) next.add(debtId);
      else next.delete(debtId);
      return next;
    });
  }

  function toggleAllVisible(checked: boolean) {
    setSelectedDebtIds(
      checked ? new Set(visibleDebts.map((debt) => debt.id)) : new Set(),
    );
  }

  async function deleteSelectedDebts() {
    if (!selectedDebtIds.size) return;
    setDeleting(true);
    try {
      const result = await postAction({
        action: "delete_debts",
        customerId: selected.id,
        debtIds: [...selectedDebtIds],
      });
      const deletedCount = asNumber(result.deletedCount);
      setSelectedDebtIds(new Set());
      setDeleteConfirmOpen(false);
      const restoredCredit = asNumber(result.restoredCredit);
      toast.success(
        `${deletedCount} transaksi piutang berhasil dihapus${restoredCredit > 0 ? ` · saldo ${rupiah.format(restoredCredit)} dikembalikan` : ""}.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Transaksi piutang belum dapat dihapus.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <TabsContent value="ledger" className="m-0 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-5 @xl:px-5">
        <div>
          <h3 className="text-sm font-bold">Riwayat buku piutang</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {customerDebts.length} catatan · {openCount} piutang aktif
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          <div
            role="group"
            aria-label="Filter buku piutang"
            className="flex items-center rounded-lg border border-border/70 bg-muted/60 p-0.5"
          >
            <button
              type="button"
              aria-pressed={filter === "all"}
              onClick={() => changeFilter("all")}
              className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px]! font-semibold! transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${filter === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Semua
              <span className="rounded bg-muted px-1 tabular-nums">
                {customerDebts.length}
              </span>
            </button>
            <button
              type="button"
              aria-pressed={filter === "active"}
              onClick={() => changeFilter("active")}
              className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px]! font-semibold! transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${filter === "active" ? "bg-card text-amber-900 shadow-sm dark:text-amber-300" : "text-muted-foreground hover:text-foreground"}`}
            >
              Aktif
              <span className="rounded bg-muted px-1 tabular-nums">
                {openCount}
              </span>
            </button>
          </div>
        </div>
      </div>
      {visibleDebts.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border/60 bg-muted/30 px-4 py-2.5 @xl:px-5">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
            <Checkbox
              aria-label="Pilih semua transaksi yang ditampilkan"
              checked={
                allVisibleSelected
                  ? true
                  : someVisibleSelected
                    ? "indeterminate"
                    : false
              }
              onCheckedChange={(checked) =>
                toggleAllVisible(checked === true)
              }
            />
            Pilih semua
          </label>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground">
              {selectedDebtIds.size} transaksi dipilih
            </span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-8 gap-1.5 text-xs!"
              disabled={!selectedDebtIds.size || deleting}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Hapus terpilih
            </Button>
          </div>
        </div>
      )}
      {visibleDebts.length > 0 ? (
        <>
          <div className="space-y-3 bg-muted/20 p-3 @4xl:hidden">
            {visibleDebts.map((debt) => {
              const price =
                (debt.price_mode === "wholesale"
                  ? debt.wholesale_price
                  : debt.unit_price) ?? debt.amount / Math.max(1, debt.qty);
              const remaining = Math.max(0, debt.amount - debt.paid_amount);
              const settled = remaining <= 0;
              const partial = !settled && debt.paid_amount > 0;
              return (
                <article
                  key={debt.id}
                  className={`rounded-xl border bg-card p-3 shadow-xs ${selectedDebtIds.has(debt.id) ? "border-primary/60 ring-2 ring-primary/10" : "border-border/70"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Checkbox
                      className="mt-0.5"
                      aria-label={`Pilih transaksi ${debt.item || debt.invoice_no || debt.id}`}
                      checked={selectedDebtIds.has(debt.id)}
                      onCheckedChange={(checked) =>
                        toggleDebt(debt.id, checked === true)
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[11px] font-medium text-primary">
                        {debt.invoice_no || "Tanpa nota"}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDate(debt.date)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold ${settled ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-300" : partial ? "bg-sky-50 text-sky-900 dark:bg-sky-400/15 dark:text-sky-300" : "bg-amber-50 text-amber-900 dark:bg-amber-400/15 dark:text-amber-300"}`}
                    >
                      {settled ? "Lunas" : partial ? "Sebagian" : "Belum lunas"}
                    </span>
                  </div>
                  <p className="mt-3 break-words text-sm font-semibold">
                    {debt.item || "Piutang"}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                    {debt.qty} × {rupiah.format(price)} · {debt.price_mode === "wholesale" ? "Grosir" : "Eceran"}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Nilai piutang</p>
                      <p className="mt-1 text-xs font-semibold tabular-nums">
                        {rupiah.format(debt.amount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Terbayar</p>
                      <p className="mt-1 text-xs font-semibold text-emerald-900 tabular-nums dark:text-emerald-300">
                        {rupiah.format(debt.paid_amount)}
                      </p>
                    </div>
                    <div className="col-span-2 flex items-end justify-between gap-3 rounded-lg bg-muted/50 p-2.5">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Sisa tagihan</p>
                        <p className="mt-1 text-sm font-bold text-primary tabular-nums">
                          {rupiah.format(remaining)}
                        </p>
                      </div>
                      <p className="max-w-[45%] text-right text-[10px] text-muted-foreground">
                        {debt.cashier || "Kasir belum dicatat"}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">Total {visibleDebts.length} catatan</span>
                <span className="font-bold text-primary tabular-nums">Sisa {rupiah.format(outstanding)}</span>
              </div>
            </div>
          </div>
          <div
            role="region"
            aria-label={`Tabel piutang ${selected.name}`}
            tabIndex={0}
            className="hidden overflow-x-auto [&>[data-slot=table-container]]:overflow-visible focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring @4xl:block"
          >
            <Table className="min-w-[820px] table-auto">
              <caption className="sr-only">
                Rincian piutang {selected.name}: nota, barang, nilai,
                pembayaran, dan sisa tagihan.
              </caption>
              <colgroup>
                <col className="w-12" />
                <col className="w-px" />
                <col />
                <col className="w-px" />
                <col className="w-px" />
                <col className="w-px" />
                <col className="w-px" />
              </colgroup>
              <TableHeader className="border-b border-border/70 bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col" className="w-12 pl-5">
                    <Checkbox
                      aria-label="Pilih semua transaksi yang ditampilkan"
                      checked={
                        allVisibleSelected
                          ? true
                          : someVisibleSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={(checked) =>
                        toggleAllVisible(checked === true)
                      }
                    />
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="w-px text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Nota / tanggal
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="w-full text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Barang / rincian
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="w-px text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Nilai piutang
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="w-px text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Terbayar
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="w-px text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Sisa tagihan
                  </TableHead>
                  <TableHead
                    scope="col"
                    className="w-px pr-5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleDebts.map((debt) => {
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
                      data-state={
                        selectedDebtIds.has(debt.id) ? "selected" : undefined
                      }
                      className="border-border/60 hover:bg-secondary/20 data-[state=selected]:bg-secondary/40"
                    >
                      <TableCell className="py-4 pl-5 align-top">
                        <Checkbox
                          aria-label={`Pilih transaksi ${debt.item || debt.invoice_no || debt.id}`}
                          checked={selectedDebtIds.has(debt.id)}
                          onCheckedChange={(checked) =>
                            toggleDebt(debt.id, checked === true)
                          }
                        />
                      </TableCell>
                      <TableCell className="py-4 align-top">
                        <p className="font-mono text-[11px] font-medium text-primary">
                          {debt.invoice_no || "Tanpa nota"}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDate(debt.date)}
                        </p>
                      </TableCell>
                      <TableCell className="w-full min-w-[220px] py-4 whitespace-normal">
                        <p className="break-words text-sm font-semibold">
                          {debt.item || "Piutang"}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="tabular-nums">
                            {debt.qty} × {rupiah.format(price)}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${debt.price_mode === "wholesale" ? "bg-violet-50 text-violet-900" : "bg-muted text-muted-foreground"}`}
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
                      <TableCell className="text-right text-xs font-medium text-emerald-900 tabular-nums dark:text-emerald-300">
                        {rupiah.format(debt.paid_amount)}
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm font-bold tabular-nums ${settled ? "text-muted-foreground" : "text-primary"}`}
                      >
                        {rupiah.format(remaining)}
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold ${settled ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-300" : partial ? "bg-sky-50 text-sky-900 dark:bg-sky-400/15 dark:text-sky-300" : "bg-amber-50 text-amber-900 dark:bg-amber-400/15 dark:text-amber-300"}`}
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
                  <TableCell colSpan={3} className="py-4 pl-5 text-xs">
                    Total {visibleDebts.length} catatan
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold tabular-nums">
                    {rupiah.format(total)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold text-emerald-900 tabular-nums dark:text-emerald-300">
                    {rupiah.format(paid)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-bold text-primary tabular-nums">
                    {rupiah.format(outstanding)}
                  </TableCell>
                  <TableCell className="pr-5 text-right text-[11px] text-muted-foreground">
                    {visibleDebts.filter(
                      (debt) => debt.amount > debt.paid_amount,
                    ).length} piutang aktif
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
            <p className="mt-3 text-sm font-semibold">
              {filter === "active"
                ? "Tidak ada piutang aktif"
                : "Belum ada piutang"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {filter === "active"
                ? "Seluruh catatan piutang pelanggan sudah lunas."
                : "Catatan piutang pelanggan akan tampil di sini."}
            </p>
          </div>
        </div>
      )}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hapus {selectedDebtIds.size} transaksi piutang?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Transaksi terpilih beserta riwayat pembayaran yang terkait akan
              dihapus permanen. Total piutang dan nota akan dihitung ulang
              setelah penghapusan. Saldo kelebihan bayar yang pernah digunakan
              akan dikembalikan ke pelanggan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void deleteSelectedDebts();
              }}
            >
              {deleting && (
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              )}
              {deleting ? "Menghapus..." : "Ya, hapus transaksi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TabsContent>
  );
}
