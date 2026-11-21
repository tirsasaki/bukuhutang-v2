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
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
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
const selectClass =
  "h-9 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

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
  const invoiceSummary = useMemo(
    () =>
      invoiceItems.reduce(
        (summary, row) => {
          const qty = Math.max(0, Math.round(asNumber(row.qty)));
          const grossAmount = qty * Math.max(0, asNumber(row.unitPrice));
          const discount =
            row.priceMode === "wholesale"
              ? Math.min(
                  grossAmount,
                  Math.max(0, Math.round(asNumber(row.discount))),
                )
              : 0;
          return {
            gross: summary.gross + grossAmount,
            discount: summary.discount + discount,
            total: summary.total + Math.max(0, grossAmount - discount),
          };
        },
        { gross: 0, discount: 0, total: 0 },
      ),
    [invoiceItems],
  );
  const invoiceTotal = invoiceSummary.total;

  function updateInvoiceItem(id: string, values: Partial<DebtDraft>) {
    setInvoiceItems((current) =>
      current.map((row) => (row.id === id ? { ...row, ...values } : row)),
    );
  }

  function updatePricing(
    id: string,
    values: Partial<DebtDraft>,
    changed: "base" | "mode" | "discount" | "wholesaleTotal",
  ) {
    setInvoiceItems((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...values };
        if (next.priceMode !== "wholesale") {
          return { ...next, wholesaleTotal: "", discount: "" };
        }

        const qty = Math.max(0, Math.round(asNumber(next.qty)));
        const grossAmount = qty * Math.max(0, asNumber(next.unitPrice));
        if (changed === "wholesaleTotal") {
          if (next.wholesaleTotal === "") {
            return { ...next, discount: "" };
          }
          const wholesaleTotal = Math.max(
            0,
            Math.round(asNumber(next.wholesaleTotal)),
          );
          return {
            ...next,
            discount: String(Math.max(0, grossAmount - wholesaleTotal)),
          };
        }

        const discount = Math.max(
          0,
          Math.round(asNumber(next.discount)),
        );
        return {
          ...next,
          wholesaleTotal:
            grossAmount > 0 ? String(Math.max(0, grossAmount - discount)) : "",
          discount:
            changed === "mode" && row.priceMode !== "wholesale"
              ? ""
              : next.discount,
        };
      }),
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
          ({ item, qty, unitPrice, discount, priceMode }) => ({
            item,
            qty,
            unitPrice,
            wholesalePrice: priceMode === "wholesale" ? unitPrice : "",
            discount,
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
        <DialogContent className="sm:max-w-[720px]">
          <form onSubmit={(event) => void submitDebtInvoice(event)}>
            <DialogHeader>
              <DialogTitle>
                Catat piutang{selected ? ` · ${selected.name}` : ""}
              </DialogTitle>
              <DialogDescription>
                Tambahkan seluruh barang dalam satu nota. Nomor nota dibuat
                otomatis saat disimpan, dan total grosir tersinkron dengan
                diskon.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3.5 py-5">
              <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="date">Tanggal transaksi</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cashier">Kasir</Label>
                  <select
                    id="cashier"
                    name="cashier"
                    required={activeCashiers.length > 0}
                    disabled={!activeCashiers.length}
                    className={selectClass}
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

              {invoiceItems.map((row, index) => {
                const qty = Math.max(0, Math.round(asNumber(row.qty)));
                const grossAmount = qty * Math.max(0, asNumber(row.unitPrice));
                const discount =
                  row.priceMode === "wholesale"
                    ? Math.max(0, Math.round(asNumber(row.discount)))
                    : 0;
                const subtotal = Math.max(0, grossAmount - discount);
                return (
                  <fieldset
                    key={row.id}
                    className="grid gap-2.5 rounded-[14px] border border-border bg-background p-3 sm:p-3.5"
                  >
                    <legend className="sr-only">Barang {index + 1}</legend>
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Label htmlFor={`item-${row.id}`}>
                          Nama barang
                          {invoiceItems.length > 1 && (
                            <span className="text-subtle-foreground">
                              #{index + 1}
                            </span>
                          )}
                        </Label>
                        <Input
                          id={`item-${row.id}`}
                          value={row.item}
                          onChange={(event) =>
                            updateInvoiceItem(row.id, {
                              item: event.target.value,
                            })
                          }
                          placeholder="Contoh: Beras Premium 10kg"
                          maxLength={200}
                          required
                          autoFocus={index === 0}
                        />
                      </div>
                      {invoiceItems.length > 1 && (
                        <Button
                          type="button"
                          variant="icon"
                          size="icon"
                          aria-label={`Hapus barang ${index + 1}`}
                          onClick={() =>
                            setInvoiceItems((current) =>
                              current.filter((item) => item.id !== row.id),
                            )
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1.5fr_1.2fr]">
                      <div className="space-y-1.5">
                        <Label htmlFor={`qty-${row.id}`}>Jumlah</Label>
                        <FormattedNumberInput
                          id={`qty-${row.id}`}
                          value={row.qty}
                          onValueChange={(value) =>
                            updatePricing(row.id, { qty: value }, "base")
                          }
                          min={1}
                          required
                          className="tabular-nums"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`unit-${row.id}`}>
                          Harga eceran (Rp)
                        </Label>
                        <FormattedNumberInput
                          id={`unit-${row.id}`}
                          value={row.unitPrice}
                          onValueChange={(value) =>
                            updatePricing(row.id, { unitPrice: value }, "base")
                          }
                          min={1}
                          placeholder="Rp"
                          required
                          className="tabular-nums"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5 sm:col-span-1">
                        <Label htmlFor={`mode-${row.id}`}>Mode harga</Label>
                        <select
                          id={`mode-${row.id}`}
                          value={row.priceMode}
                          onChange={(event) =>
                            updatePricing(
                              row.id,
                              {
                                priceMode: event.target
                                  .value as DebtDraft["priceMode"],
                              },
                              "mode",
                            )
                          }
                          className={selectClass}
                        >
                          <option value="retail">Eceran</option>
                          <option value="wholesale">Grosir</option>
                        </select>
                      </div>
                    </div>
                    {row.priceMode === "wholesale" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label htmlFor={`discount-${row.id}`}>
                            Diskon grosir (Rp)
                          </Label>
                          <FormattedNumberInput
                            id={`discount-${row.id}`}
                            value={row.discount}
                            onValueChange={(value) =>
                              updatePricing(
                                row.id,
                                { discount: value },
                                "discount",
                              )
                            }
                            min={0}
                            max={grossAmount > 0 ? grossAmount - 1 : undefined}
                            placeholder="Rp 0"
                            className="tabular-nums"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`wholesale-total-${row.id}`}>
                            Total grosir (Rp)
                          </Label>
                          <FormattedNumberInput
                            id={`wholesale-total-${row.id}`}
                            value={row.wholesaleTotal}
                            onValueChange={(value) =>
                              updatePricing(
                                row.id,
                                { wholesaleTotal: value },
                                "wholesaleTotal",
                              )
                            }
                            min={1}
                            max={grossAmount > 0 ? grossAmount : undefined}
                            placeholder="Wajib diisi"
                            required
                            className="tabular-nums"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 border-t border-dashed border-border pt-2 text-xs">
                      <span className="text-muted-foreground">Jumlah harga</span>
                      <span className="text-right tabular-nums">
                        {row.priceMode === "wholesale" && discount > 0 && (
                          <span className="mr-2 text-[11px] text-warning-fg">
                            {rupiah.format(grossAmount)} −{" "}
                            {rupiah.format(discount)}
                          </span>
                        )}
                        <span className="text-[13px] font-bold">
                          {rupiah.format(subtotal)}
                        </span>
                      </span>
                    </div>
                  </fieldset>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-1.5 border-dashed text-xs sm:w-auto"
                disabled={invoiceItems.length >= 50}
                onClick={() =>
                  setInvoiceItems((current) => [...current, newDebtDraft()])
                }
              >
                <Plus className="size-3.5" /> Tambah barang
              </Button>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-3.5 py-3 text-secondary-foreground">
                <div>
                  <p className="text-[12.5px] font-semibold">Total nota piutang</p>
                  <p className="text-[11px] opacity-80">
                    {invoiceItems.length} jenis barang
                    {invoiceSummary.discount > 0
                      ? ` · Diskon ${rupiah.format(invoiceSummary.discount)}`
                      : ""}
                  </p>
                </div>
                <strong className="text-lg font-extrabold tracking-tight tabular-nums">
                  {rupiah.format(invoiceTotal)}
                </strong>
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
                variant="success"
                disabled={
                  saving ||
                  !selected ||
                  invoiceTotal <= 0 ||
                  !activeCashiers.length
                }
              >
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Simpan piutang
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
          <div className="mx-auto grid size-16 animate-in place-items-center rounded-full bg-success-bg text-success-fg duration-500 zoom-in-50">
            <CheckCircle2 className="size-9" aria-hidden="true" />
          </div>
          <DialogHeader className="mx-0 mt-0 items-center border-0 p-0 text-center sm:mx-0 sm:mt-0 sm:p-0 sm:text-center">
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
                <dd className="mt-1 text-sm font-semibold tabular-nums text-success-fg">
                  {rupiah.format(successInfo.total)}
                </dd>
              </div>
            </dl>
          )}
          <DialogFooter className="static sm:justify-center">
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
