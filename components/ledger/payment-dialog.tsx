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
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { asNumber, rupiah } from "@/lib/ledger/format";
import type { Cashier, Customer, Debt, SubmitForm } from "@/lib/ledger/types";
const modeCard =
  "rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-card-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
const modeCardActive = "border-ring bg-secondary hover:bg-secondary";

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
            <DialogTitle>
              Catat pembayaran{selected ? ` · ${selected.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              Dialokasikan otomatis mulai dari nota piutang paling lama (FIFO).
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
          <div className="space-y-3.5 py-5">
            <div className="rounded-[14px] bg-secondary px-4 py-3.5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-secondary-foreground">
                    Sisa piutang pelanggan
                  </p>
                  <p className="text-[22px] font-extrabold tracking-tight text-primary tabular-nums">
                    {rupiah.format(selected?.balance ?? 0)}
                  </p>
                </div>
                {(selected?.credit_balance ?? 0) > 0 && (
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground">
                      Saldo tersimpan
                    </p>
                    <p className="font-extrabold text-success-fg tabular-nums">
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
                className={`${modeCard} ${paymentMode === "partial" ? modeCardActive : ""}`}
              >
                <span className="block text-[12.5px] font-bold">Bayar sebagian</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  Masukkan nominal diterima
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
                className={`${modeCard} ${paymentMode === "all" ? modeCardActive : ""}`}
              >
                <span className="block text-[12.5px] font-bold">Lunasi semua</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  Otomatis isi {rupiah.format(selected?.balance ?? 0)}
                </span>
              </button>
            </div>
            {(selected?.credit_balance ?? 0) > 0 && (
              <div className="rounded-xl border border-success-border bg-success-bg/40 p-3">
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
                  role="switch"
                  aria-checked={useCredit}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span>
                    <span className="block text-[12.5px] font-bold">
                      Gunakan saldo kelebihan bayar (
                      {rupiah.format(selected?.credit_balance ?? 0)})
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Saldo tidak digunakan sampai pilihan ini diaktifkan
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`flex h-[22px] w-[38px] shrink-0 items-center rounded-full px-[3px] transition-colors ${useCredit ? "bg-[#13857c]" : "bg-border"}`}
                  >
                    <span
                      className={`block size-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform ${useCredit ? "translate-x-4" : ""}`}
                    />
                  </span>
                </button>
                {useCredit && (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="creditAmount">Saldo yang digunakan</Label>
                    <FormattedNumberInput
                      id="creditAmount"
                      min={0}
                      max={Math.min(
                        selected?.credit_balance ?? 0,
                        selected?.balance ?? 0,
                      )}
                      value={paymentCreditAmount}
                      onValueChange={(value) => {
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
                    />
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">
                {paymentMode === "all"
                  ? "Uang diterima (Rp)"
                  : "Nominal tunai / transfer (Rp)"}
              </Label>
              <FormattedNumberInput
                id="paymentAmount"
                name="amount"
                min={0}
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
                onValueChange={setPaymentCashAmount}
                required
                autoFocus
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
              <Label htmlFor="receivedBy">Kasir penerima</Label>
              <select
                id="receivedBy"
                name="receivedBy"
                required
                disabled={!activeCashiers.length}
                className="h-9 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
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
