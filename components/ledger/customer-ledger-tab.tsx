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
import { Loader2, ReceiptText, Trash2 } from "lucide-react";
import {
  asNumber,
  debtPricing,
  formatDate,
  rupiah,
} from "@/lib/ledger/format";
import type { Customer, Debt, PostAction } from "@/lib/ledger/types";
import { toast } from "sonner";

const th =
  "h-auto px-3.5 py-2.5 text-[11px] font-bold tracking-[0.04em] text-subtle-foreground uppercase";
const td = "px-3.5 py-3 align-top text-[13px]";

function GrosirTag() {
  return (
    <span className="ml-[5px] inline-block rounded-[5px] bg-accent px-1.5 py-px align-[1px] text-[10px] font-bold text-secondary-foreground">
      Grosir
    </span>
  );
}

function StatusBadge({ debt }: { debt: Debt }) {
  const remaining = Math.max(0, debt.amount - debt.paid_amount);
  const label =
    remaining <= 0 ? "Lunas" : debt.paid_amount > 0 ? "Sebagian" : "Belum lunas";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-[9px] py-[3px] text-[11px] font-bold whitespace-nowrap ${remaining > 0 ? "border-warning-border bg-warning-bg text-warning-fg" : "border-success-border bg-success-bg text-success-fg"}`}
    >
      {label}
    </span>
  );
}

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

  const selectAllState = allVisibleSelected
    ? true
    : someVisibleSelected
      ? "indeterminate"
      : false;

  return (
    <TabsContent value="ledger" className="m-0 min-w-0">
      {/* Toolbar: filter + tindakan massal */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border-soft px-3 py-3 @xl:px-[18px]">
        <div
          role="group"
          aria-label="Filter buku piutang"
          className="inline-flex gap-1.5"
        >
          {(
            [
              ["all", `Semua (${customerDebts.length})`],
              ["active", `Belum lunas (${openCount})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => changeFilter(id)}
              className={`rounded-lg border px-2.5 py-[5px] text-[11.5px] font-semibold tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${filter === id ? "border-primary/25 bg-secondary text-primary dark:border-brand/30" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {selectedDebtIds.size > 0 ? (
          <Button
            type="button"
            variant="danger-soft"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={deleting}
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Hapus {selectedDebtIds.size} dipilih
          </Button>
        ) : (
          <span className="hidden text-[11.5px] text-muted-foreground @md:inline">
            Centang baris untuk tindakan massal
          </span>
        )}
      </div>

      {visibleDebts.length > 0 ? (
        <>
          {/* Tampilan kartu untuk layar sempit (ponsel/tablet) */}
          <div className="@xl:hidden">
            <label className="flex cursor-pointer items-center gap-2.5 border-b border-border-soft bg-background px-3 py-2.5 text-[11px] font-bold tracking-wide text-subtle-foreground uppercase">
              <Checkbox
                aria-label="Pilih semua transaksi yang ditampilkan"
                checked={selectAllState}
                onCheckedChange={(checked) => toggleAllVisible(checked === true)}
              />
              Pilih semua ({visibleDebts.length})
            </label>
            <ul className="divide-y divide-border-soft">
              {visibleDebts.map((debt) => {
                const { unitPrice: price, discount } = debtPricing(debt);
                const remaining = Math.max(0, debt.amount - debt.paid_amount);
                const checked = selectedDebtIds.has(debt.id);
                return (
                  <li
                    key={debt.id}
                    className={`grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-3 py-3 transition-colors ${checked ? "bg-secondary/60" : ""}`}
                  >
                    <Checkbox
                      className="mt-0.5 size-[18px]"
                      aria-label={`Pilih transaksi ${debt.item || debt.invoice_no || debt.id}`}
                      checked={checked}
                      onCheckedChange={(value) =>
                        toggleDebt(debt.id, value === true)
                      }
                    />
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="mb-[3px] inline-block max-w-full truncate rounded-[5px] bg-muted px-1.5 py-px font-mono text-[10.5px] font-bold text-muted-foreground">
                            {debt.invoice_no || "Tanpa nota"}
                          </span>
                          <p className="text-[13px] font-bold break-words">
                            {debt.item || "Piutang"}
                            {debt.price_mode === "wholesale" && <GrosirTag />}
                          </p>
                        </div>
                        <StatusBadge debt={debt} />
                      </div>
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground tabular-nums">
                        {formatDate(debt.date)} · {debt.qty} ×{" "}
                        {rupiah.format(price)}
                        {discount > 0 && ` − diskon ${rupiah.format(discount)}`}
                      </p>
                      <div className="mt-2 flex items-end justify-between gap-3">
                        <p className="min-w-0 truncate text-[11.5px] text-muted-foreground">
                          {debt.cashier || "Kasir belum dicatat"}
                        </p>
                        <div className="shrink-0 text-right tabular-nums">
                          <p className="text-[11px] text-muted-foreground">
                            Total {rupiah.format(debt.amount)}
                          </p>
                          <p
                            className={`text-sm font-extrabold ${remaining > 0 ? "text-foreground" : "text-success-fg"}`}
                          >
                            Sisa {rupiah.format(remaining)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border bg-background px-3 py-3 text-[12.5px] font-bold tabular-nums">
              <span>Ringkasan ({visibleDebts.length} item)</span>
              <span className="text-primary">Sisa {rupiah.format(outstanding)}</span>
              <span className="w-full text-[11px] font-semibold text-muted-foreground">
                Total {rupiah.format(total)} ·{" "}
                <span className="text-success-fg">
                  Terbayar {rupiah.format(paid)}
                </span>
              </span>
            </div>
          </div>

          {/* Tabel untuk layar lebar, mengikuti mockup */}
          <div
            role="region"
            aria-label={`Tabel piutang ${selected.name}`}
            tabIndex={0}
            className="hidden overflow-x-auto focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset @xl:block [&>[data-slot=table-container]]:overflow-visible"
          >
            <Table className="min-w-[620px]">
              <caption className="sr-only">
                Rincian piutang {selected.name}: nota, barang, kasir, total,
                sisa, dan status.
              </caption>
              <TableHeader>
                <TableRow className="border-border-soft bg-background hover:bg-background">
                  <TableHead scope="col" className={`${th} w-9 pr-0`}>
                    <Checkbox
                      aria-label="Pilih semua transaksi yang ditampilkan"
                      checked={selectAllState}
                      onCheckedChange={(checked) =>
                        toggleAllVisible(checked === true)
                      }
                    />
                  </TableHead>
                  <TableHead scope="col" className={th}>
                    Nota &amp; Barang
                  </TableHead>
                  <TableHead scope="col" className={th}>
                    Kasir
                  </TableHead>
                  <TableHead scope="col" className={`${th} text-right`}>
                    Total
                  </TableHead>
                  <TableHead scope="col" className={`${th} text-right`}>
                    Sisa
                  </TableHead>
                  <TableHead scope="col" className={th}>
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleDebts.map((debt) => {
                  const { unitPrice: price, discount } = debtPricing(debt);
                  const remaining = Math.max(0, debt.amount - debt.paid_amount);
                  const checked = selectedDebtIds.has(debt.id);
                  return (
                    <TableRow
                      key={debt.id}
                      data-state={checked ? "selected" : undefined}
                      className="border-border-soft hover:bg-card-hover data-[state=selected]:bg-secondary/60"
                    >
                      <TableCell className={`${td} pr-0`}>
                        <Checkbox
                          aria-label={`Pilih transaksi ${debt.item || debt.invoice_no || debt.id}`}
                          checked={checked}
                          onCheckedChange={(value) =>
                            toggleDebt(debt.id, value === true)
                          }
                        />
                      </TableCell>
                      <TableCell className={`${td} min-w-[220px] whitespace-normal`}>
                        <span className="mb-[3px] inline-block rounded-[5px] bg-muted px-1.5 py-px font-mono text-[10.5px] font-bold text-muted-foreground">
                          {debt.invoice_no || "Tanpa nota"}
                        </span>
                        <p className="font-bold break-words">
                          {debt.item || "Piutang"}
                          {debt.price_mode === "wholesale" && <GrosirTag />}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground tabular-nums">
                          {formatDate(debt.date)} · {debt.qty} ×{" "}
                          {rupiah.format(price)}
                          {discount > 0 &&
                            ` − diskon ${rupiah.format(discount)}`}
                        </p>
                      </TableCell>
                      <TableCell className={`${td} text-xs text-muted-foreground`}>
                        {debt.cashier || "—"}
                      </TableCell>
                      <TableCell className={`${td} text-right font-semibold tabular-nums`}>
                        {rupiah.format(debt.amount)}
                      </TableCell>
                      <TableCell
                        className={`${td} text-right font-extrabold tabular-nums ${remaining > 0 ? "text-foreground" : "text-success-fg"}`}
                      >
                        {rupiah.format(remaining)}
                      </TableCell>
                      <TableCell className={td}>
                        <StatusBadge debt={debt} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter className="border-border bg-background">
                <TableRow className="hover:bg-background">
                  <TableCell colSpan={3} className="px-3.5 py-3 text-[12.5px] font-bold">
                    Ringkasan ({visibleDebts.length} item)
                  </TableCell>
                  <TableCell className="px-3.5 py-3 text-right text-[12.5px] font-bold tabular-nums">
                    {rupiah.format(total)}
                  </TableCell>
                  <TableCell className="px-3.5 py-3 text-right text-[12.5px] font-bold text-primary tabular-nums">
                    {rupiah.format(outstanding)}
                  </TableCell>
                  <TableCell className="px-3.5 py-3 text-[11px] font-bold text-success-fg tabular-nums">
                    Terbayar {rupiah.format(paid)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </>
      ) : (
        <div className="grid min-h-56 place-items-center p-8 text-center">
          <div>
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
              <ReceiptText className="size-5" aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm font-bold">
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
