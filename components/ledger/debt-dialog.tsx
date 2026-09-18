"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { asNumber, newDebtDraft, rupiah } from "@/lib/ledger/format";
import type {
  Cashier,
  Customer,
  DebtDraft,
  PostAction,
} from "@/lib/ledger/types";
type Props = {
  debtOpen: boolean;
  setDebtOpen: (open: boolean) => void;
  selected: Customer | null;
  saving: boolean;
  setSaving: (open: boolean) => void;
  postAction: PostAction;
  activeCashiers: Cashier[];
};
type DebtSuccess = {
  customerName: string;
  invoiceNo: string;
  itemCount: number;
  total: number;
};
export function DebtDialog({
  debtOpen,
  setDebtOpen,
  selected,
  saving,
  setSaving,
  postAction,
  activeCashiers,
}: Props) {
  const [invoiceItems, setInvoiceItems] = useState<DebtDraft[]>(() => [
    newDebtDraft(),
  ]);
  const [successInfo, setSuccessInfo] = useState<DebtSuccess | null>(null);
  const invoiceTotal = useMemo(
    () =>
      invoiceItems.reduce((total, row) => {
        const qty = Math.max(0, Math.round(asNumber(row.qty)));
        const price =
          row.priceMode === "wholesale"
            ? asNumber(row.wholesalePrice)
            : asNumber(row.unitPrice);
        return total + qty * Math.max(0, price);
      }, 0),
    [invoiceItems],
  );

  function updateInvoiceItem(id: string, values: Partial<DebtDraft>) {
    setInvoiceItems((current) =>
      current.map((row) => (row.id === id ? { ...row, ...values } : row)),
    );
  }

  async function submitDebtInvoice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const result = await postAction({
        action: "create_debt",
        customerId: selected.id,
        date: values.date,
        cashier: values.cashier,
        items: invoiceItems.map(
          ({ item, qty, unitPrice, wholesalePrice, priceMode }) => ({
            item,
            qty,
            unitPrice,
            wholesalePrice,
            priceMode,
          }),
        ),
      });
      const savedInvoice: DebtSuccess = {
        customerName: selected.name,
        invoiceNo: String(result.invoiceNo ?? ""),
        itemCount: invoiceItems.length,
        total: asNumber(result.total),
      };
      setDebtOpen(false);
      setInvoiceItems([newDebtDraft()]);
      setSuccessInfo(savedInvoice);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Piutang belum tersimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={debtOpen} onOpenChange={setDebtOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <form onSubmit={(event) => void submitDebtInvoice(event)}>
          <DialogHeader>
            <DialogTitle>Catat piutang {selected?.name}</DialogTitle>
            <DialogDescription>
              Tambahkan seluruh barang dalam satu nota. Nomor nota akan dibuat
              otomatis saat disimpan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Tanggal nota</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cashier">Kasir</Label>
                <select
                  id="cashier"
                  name="cashier"
                  required={activeCashiers.length > 0}
                  disabled={!activeCashiers.length}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {activeCashiers.length
                      ? "Pilih kasir"
                      : "Tambahkan kasir di Pengaturan Toko"}
                  </option>
                  {activeCashiers.map((cashier) => (
                    <option key={cashier.id} value={cashier.name}>
                      {cashier.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <div className="hidden grid-cols-[minmax(190px,2fr)_90px_minmax(130px,1fr)_130px_minmax(130px,1fr)_120px_40px] gap-2 px-1 text-xs font-medium text-muted-foreground lg:grid">
                <span>Barang / keterangan</span>
                <span>Jumlah</span>
                <span>Harga eceran</span>
                <span>Jenis harga</span>
                <span>Harga grosir</span>
                <span className="text-right">Jumlah harga</span>
                <span />
              </div>
              {invoiceItems.map((row, index) => {
                const qty = Math.max(0, Math.round(asNumber(row.qty)));
                const appliedPrice =
                  row.priceMode === "wholesale"
                    ? asNumber(row.wholesalePrice)
                    : asNumber(row.unitPrice);
                const subtotal = qty * Math.max(0, appliedPrice);
                return (
                  <div
                    key={row.id}
                    className="grid gap-3 rounded-xl border border-border bg-muted/30 p-3 lg:grid-cols-[minmax(190px,2fr)_90px_minmax(130px,1fr)_130px_minmax(130px,1fr)_120px_40px] lg:items-end lg:gap-2 lg:border-0 lg:bg-transparent lg:p-0"
                  >
                    <div className="space-y-1.5">
                      <Label className="lg:sr-only" htmlFor={`item-${row.id}`}>
                        Barang / keterangan
                      </Label>
                      <Input
                        id={`item-${row.id}`}
                        value={row.item}
                        onChange={(event) =>
                          updateInvoiceItem(row.id, {
                            item: event.target.value,
                          })
                        }
                        placeholder={`Barang ${index + 1}`}
                        maxLength={200}
                        required
                        autoFocus={index === 0}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="lg:sr-only" htmlFor={`qty-${row.id}`}>
                        Jumlah
                      </Label>
                      <Input
                        id={`qty-${row.id}`}
                        value={row.qty}
                        onChange={(event) =>
                          updateInvoiceItem(row.id, { qty: event.target.value })
                        }
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="lg:sr-only" htmlFor={`unit-${row.id}`}>
                        Harga eceran (Rp)
                      </Label>
                      <Input
                        id={`unit-${row.id}`}
                        value={row.unitPrice}
                        onChange={(event) =>
                          updateInvoiceItem(row.id, {
                            unitPrice: event.target.value,
                          })
                        }
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        placeholder="Rp"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="lg:sr-only" htmlFor={`mode-${row.id}`}>
                        Jenis harga
                      </Label>
                      <select
                        id={`mode-${row.id}`}
                        value={row.priceMode}
                        onChange={(event) =>
                          updateInvoiceItem(row.id, {
                            priceMode: event.target
                              .value as DebtDraft["priceMode"],
                          })
                        }
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <option value="retail">Eceran</option>
                        <option value="wholesale">Grosir</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        className="lg:sr-only"
                        htmlFor={`wholesale-${row.id}`}
                      >
                        Harga grosir (Rp)
                      </Label>
                      <Input
                        id={`wholesale-${row.id}`}
                        value={row.wholesalePrice}
                        onChange={(event) =>
                          updateInvoiceItem(row.id, {
                            wholesalePrice: event.target.value,
                          })
                        }
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        placeholder={
                          row.priceMode === "wholesale"
                            ? "Wajib diisi"
                            : "Opsional"
                        }
                        required={row.priceMode === "wholesale"}
                        disabled={row.priceMode !== "wholesale"}
                      />
                    </div>
                    <div className="flex h-9 items-center justify-between lg:justify-end">
                      <span className="text-xs text-muted-foreground lg:hidden">
                        Jumlah harga
                      </span>
                      <span className="font-semibold">
                        {rupiah.format(subtotal)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Hapus barang ${index + 1}`}
                      disabled={invoiceItems.length === 1}
                      onClick={() =>
                        setInvoiceItems((current) =>
                          current.filter((item) => item.id !== row.id),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={invoiceItems.length >= 50}
                onClick={() =>
                  setInvoiceItems((current) => [...current, newDebtDraft()])
                }
              >
                <Plus className="size-4" /> Tambah barang
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-secondary p-4">
              <div>
                <p className="text-sm text-secondary-foreground">Total nota</p>
                <p className="text-xs text-muted-foreground">
                  {invoiceItems.length} jenis barang
                </p>
              </div>
              <p className="text-2xl font-extrabold tracking-tight">
                {rupiah.format(invoiceTotal)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDebtOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={
                saving ||
                !selected ||
                invoiceTotal <= 0 ||
                !activeCashiers.length
              }
            >
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}Simpan
              piutang
            </Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={successInfo !== null}
        onOpenChange={(open) => {
          if (!open) setSuccessInfo(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="overflow-hidden text-center sm:max-w-md"
        >
          <div className="mx-auto grid size-16 animate-in place-items-center rounded-full bg-emerald-100 text-emerald-800 duration-500 zoom-in-50 dark:bg-emerald-400/15 dark:text-emerald-300">
            <CheckCircle2 className="size-9" aria-hidden="true" />
          </div>
          <DialogHeader className="items-center text-center sm:text-center">
            <DialogTitle>Piutang berhasil ditambahkan</DialogTitle>
            <DialogDescription>
              Nota baru sudah tersimpan dan langsung masuk ke riwayat piutang.
            </DialogDescription>
          </DialogHeader>
          {successInfo && (
            <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-muted/30 text-left">
              <div className="border-b border-r border-border p-3">
                <dt className="text-[11px] text-muted-foreground">
                  Pelanggan
                </dt>
                <dd className="mt-1 break-words text-sm font-semibold">
                  {successInfo.customerName}
                </dd>
              </div>
              <div className="border-b border-border p-3">
                <dt className="text-[11px] text-muted-foreground">
                  Nomor nota
                </dt>
                <dd className="mt-1 break-words text-sm font-semibold">
                  {successInfo.invoiceNo || "—"}
                </dd>
              </div>
              <div className="border-r border-border p-3">
                <dt className="text-[11px] text-muted-foreground">
                  Jumlah barang
                </dt>
                <dd className="mt-1 text-sm font-semibold">
                  {successInfo.itemCount} jenis
                </dd>
              </div>
              <div className="p-3">
                <dt className="text-[11px] text-muted-foreground">
                  Total piutang
                </dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums text-emerald-900 dark:text-emerald-300">
                  {rupiah.format(successInfo.total)}
                </dd>
              </div>
            </dl>
          )}
          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              className="min-w-32"
              onClick={() => setSuccessInfo(null)}
            >
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
