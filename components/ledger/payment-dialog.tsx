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
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { asNumber, rupiah } from "@/lib/ledger/format";
import type { Cashier, Customer, Debt, SubmitForm } from "@/lib/ledger/types";
type Props = {
  paymentOpen: boolean;
  setPaymentOpen: (open: boolean) => void;
  selected: Customer | null;
  selectedDebts: Debt[];
  saving: boolean;
  submitForm: SubmitForm;
  activeCashiers: Cashier[];
};
export function PaymentDialog({
  paymentOpen,
  setPaymentOpen,
  selected,
  selectedDebts,
  saving,
  submitForm,
  activeCashiers,
}: Props) {
  const [paymentMode, setPaymentMode] = useState<"partial" | "all">("partial");
  const [useCredit, setUseCredit] = useState(false);
  const [paymentCashAmount, setPaymentCashAmount] = useState("");
  const [paymentCreditAmount, setPaymentCreditAmount] = useState("0");
  const oldestOpenDebt = useMemo(
    () =>
      [...selectedDebts]
        .filter((debt) => debt.amount - debt.paid_amount > 0)
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            a.created_at.localeCompare(b.created_at),
        )[0] ?? null,
    [selectedDebts],
  );

  return (
    <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
      <DialogContent>
        <form
          onSubmit={(event) =>
            void submitForm(event, "create_payment", () =>
              setPaymentOpen(false),
            )
          }
        >
          <DialogHeader>
            <DialogTitle>Catat pembayaran {selected?.name}</DialogTitle>
            <DialogDescription>
              Pembayaran dialokasikan otomatis dari piutang paling lama.
            </DialogDescription>
          </DialogHeader>
          <input
            type="hidden"
            name="payAll"
            value={paymentMode === "all" ? "true" : "false"}
          />
          <input
            type="hidden"
            name="creditAmount"
            value={useCredit ? paymentCreditAmount : "0"}
          />
          <div className="space-y-4 py-5">
            <div className="rounded-xl bg-secondary p-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-secondary-foreground">
                    Sisa piutang pelanggan
                  </p>
                  <p className="mt-1 text-2xl font-bold">
                    {rupiah.format(selected?.balance ?? 0)}
                  </p>
                </div>
                {(selected?.credit_balance ?? 0) > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Saldo tersimpan
                    </p>
                    <p className="font-bold text-emerald-900 dark:text-emerald-300">
                      {rupiah.format(selected?.credit_balance ?? 0)}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentMode("partial");
                  setPaymentCashAmount("");
                }}
                className={`rounded-xl border p-3 text-left transition-colors ${paymentMode === "partial" ? "border-primary bg-secondary" : "border-border hover:bg-muted"}`}
              >
                <span className="block font-semibold">Bayar sebagian</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Masukkan jumlah pembayaran
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentMode("all");
                  setPaymentCashAmount(
                    String(
                      Math.max(
                        0,
                        (selected?.balance ?? 0) -
                          (useCredit ? asNumber(paymentCreditAmount) : 0),
                      ),
                    ),
                  );
                }}
                className={`rounded-xl border p-3 text-left transition-colors ${paymentMode === "all" ? "border-primary bg-secondary" : "border-border hover:bg-muted"}`}
              >
                <span className="block font-semibold">Lunasi semua</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Kelebihan disimpan sebagai saldo
                </span>
              </button>
            </div>
            {(selected?.credit_balance ?? 0) > 0 && (
              <div className="rounded-xl border border-emerald-700/20 p-3 dark:border-emerald-300/25">
                <button
                  type="button"
                  onClick={() => {
                    const next = !useCredit;
                    const credit = next
                      ? Math.min(
                          selected?.credit_balance ?? 0,
                          selected?.balance ?? 0,
                        )
                      : 0;
                    setUseCredit(next);
                    setPaymentCreditAmount(String(credit));
                    if (paymentMode === "all")
                      setPaymentCashAmount(
                        String(Math.max(0, (selected?.balance ?? 0) - credit)),
                      );
                  }}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span>
                    <span className="block font-semibold">
                      Gunakan saldo kelebihan bayar
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Saldo tidak digunakan sampai pilihan ini diaktifkan
                    </span>
                  </span>
                  <span
                    className={`h-5 w-9 rounded-full p-0.5 transition-colors ${useCredit ? "bg-emerald-700 dark:bg-emerald-400" : "bg-muted"}`}
                  >
                    <span
                      className={`block size-4 rounded-full bg-white transition-transform ${useCredit ? "translate-x-4" : ""}`}
                    />
                  </span>
                </button>
                {useCredit && (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="creditAmount">Saldo yang digunakan</Label>
                    <Input
                      id="creditAmount"
                      type="number"
                      min="0"
                      max={Math.min(
                        selected?.credit_balance ?? 0,
                        selected?.balance ?? 0,
                      )}
                      value={paymentCreditAmount}
                      onChange={(event) => {
                        const value = event.target.value;
                        setPaymentCreditAmount(value);
                        if (paymentMode === "all")
                          setPaymentCashAmount(
                            String(
                              Math.max(
                                0,
                                (selected?.balance ?? 0) - asNumber(value),
                              ),
                            ),
                          );
                      }}
                      inputMode="numeric"
                    />
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">
                {paymentMode === "all" ? "Uang diterima" : "Pembayaran tunai"}
              </Label>
              <Input
                id="paymentAmount"
                name="amount"
                type="number"
                min="0"
                max={
                  paymentMode === "partial"
                    ? Math.max(
                        0,
                        (selected?.balance ?? 0) -
                          (useCredit ? asNumber(paymentCreditAmount) : 0),
                      )
                    : undefined
                }
                value={paymentCashAmount}
                onChange={(event) => setPaymentCashAmount(event.target.value)}
                required
                autoFocus
                inputMode="numeric"
              />
              {paymentMode === "partial" ? (
                oldestOpenDebt && (
                  <p className="text-xs leading-5 text-muted-foreground">
                    Pembayaran masuk ke nota{" "}
                    {oldestOpenDebt.invoice_no || "terlama"} terlebih dahulu.
                    Sisa nota tersebut:{" "}
                    {rupiah.format(
                      oldestOpenDebt.amount - oldestOpenDebt.paid_amount,
                    )}
                    .
                  </p>
                )
              ) : (
                <p className="text-xs leading-5 text-muted-foreground">
                  Kebutuhan pelunasan setelah saldo:{" "}
                  {rupiah.format(
                    Math.max(
                      0,
                      (selected?.balance ?? 0) -
                        (useCredit ? asNumber(paymentCreditAmount) : 0),
                    ),
                  )}
                  . Uang selebihnya akan disimpan sebagai saldo pelanggan.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="receivedBy">Diterima oleh</Label>
              <select
                id="receivedBy"
                name="receivedBy"
                required
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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPaymentOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={
                saving ||
                !selected ||
                !activeCashiers.length ||
                asNumber(paymentCashAmount) +
                  (useCredit ? asNumber(paymentCreditAmount) : 0) <=
                  0
              }
            >
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {paymentMode === "all"
                ? "Lunasi dan simpan saldo"
                : "Simpan pembayaran"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
