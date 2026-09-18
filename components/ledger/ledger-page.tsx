"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

import { useLedger } from "@/hooks/use-ledger";
import { useLedgerTools } from "@/hooks/use-ledger-tools";
import { asNumber, rupiah } from "@/lib/ledger/format";
import { CustomerDetail } from "./customer-detail";
import { CustomerDialogs } from "./customer-dialogs";
import { CustomerList } from "./customer-list";
import { DebtDialog } from "./debt-dialog";
import { LedgerHeader } from "./ledger-header";
import { LedgerSummary } from "./ledger-summary";
import { PaymentDialog } from "./payment-dialog";
import { ShareDialog } from "./share-dialog";
import type { LedgerData } from "@/lib/ledger/types";

type Props = { initialData?: LedgerData };

export function LedgerPage({ initialData }: Props) {
  const { data, selectedId, setSelectedId, loading, postAction } =
    useLedger(initialData);
  const [saving, setSaving] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [debtOpen, setDebtOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const selected =
    data.customers.find((customer) => customer.id === selectedId) ?? null;
  const selectedDebts = useMemo(
    () =>
      data.debts
        .filter((debt) => debt.customer_id === selectedId)
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            b.created_at.localeCompare(a.created_at),
        ),
    [data.debts, selectedId],
  );
  const selectedPayments = useMemo(
    () =>
      data.payments
        .filter((payment) => payment.customer_id === selectedId)
        .sort((a, b) => b.paid_at.localeCompare(a.paid_at)),
    [data.payments, selectedId],
  );
  const openBalance = data.customers.reduce(
    (total, customer) => total + Math.max(0, customer.balance),
    0,
  );
  const paidThisMonth = data.payments
    .filter(
      (payment) =>
        payment.source !== "credit" &&
        payment.paid_at.slice(0, 7) === new Date().toISOString().slice(0, 7),
    )
    .reduce((total, payment) => total + payment.amount, 0);
  const needsFollowUp = data.customers.filter(
    (customer) => customer.balance > 0,
  ).length;
  const activeCashiers = data.cashiers.filter((cashier) => cashier.is_active);
  useLedgerTools(data.customers.length, openBalance, needsFollowUp, postAction);
  async function submitForm(
    event: React.FormEvent<HTMLFormElement>,
    action: string,
    close: () => void,
  ) {
    event.preventDefault();
    setSaving(true);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const result = await postAction({
        action,
        ...values,
        customerId: action === "create_customer" ? undefined : selectedId,
      });
      if (action === "create_payment") {
        const message =
          values.payAll === "true"
            ? asNumber(result.overpayment) > 0
              ? `Piutang lunas · kelebihan ${rupiah.format(asNumber(result.overpayment))} dicatat sebagai saldo pelanggan.`
              : `Seluruh piutang ${selected?.name ?? "pelanggan"} sudah lunas.`
            : `Pembayaran ${rupiah.format(asNumber(result.paidAmount) + asNumber(result.creditUsed))} tersimpan${asNumber(result.settledCount) ? ` · ${asNumber(result.settledCount)} piutang lama lunas` : ""}.`;
        toast.success(message);
      } else {
        toast.success(
          action === "create_debt"
            ? "Piutang baru tersimpan."
            : action === "update_customer"
              ? "Data pelanggan diperbarui."
              : "Pelanggan ditambahkan.",
        );
      }
      close();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Perubahan belum tersimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden">
      <Toaster richColors position="top-right" />
      <LedgerHeader
        storeName={data.store.name}
        hasSelected={!!selected}
        setDebtOpen={setDebtOpen}
      />
      <LedgerSummary
        data={data}
        openBalance={openBalance}
        needsFollowUp={needsFollowUp}
        paidThisMonth={paidThisMonth}
        mobileDetailOpen={mobileDetailOpen}
      />
      <div className="grid lg:min-h-0 lg:flex-1 lg:grid-cols-[400px_minmax(0,1fr)]">
        <CustomerList
          data={data}
          loading={loading}
          selectedId={selectedId}
          setSelectedId={(id) => {
            setSelectedId(id);
            setMobileDetailOpen(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          setCustomerOpen={setCustomerOpen}
          mobileDetailOpen={mobileDetailOpen}
        />
        <CustomerDetail
          selected={selected}
          selectedDebts={selectedDebts}
          selectedPayments={selectedPayments}
          setShareOpen={setShareOpen}
          setDebtOpen={setDebtOpen}
          setPaymentOpen={setPaymentOpen}
          setEditCustomerOpen={setEditCustomerOpen}
          mobileDetailOpen={mobileDetailOpen}
          onMobileBack={() => {
            setMobileDetailOpen(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
      <CustomerDialogs
        customerOpen={customerOpen}
        setCustomerOpen={setCustomerOpen}
        editCustomerOpen={editCustomerOpen}
        setEditCustomerOpen={setEditCustomerOpen}
        selected={selected}
        saving={saving}
        submitForm={submitForm}
      />
      <DebtDialog
        debtOpen={debtOpen}
        setDebtOpen={setDebtOpen}
        selected={selected}
        saving={saving}
        setSaving={setSaving}
        postAction={postAction}
        activeCashiers={activeCashiers}
      />
      <ShareDialog
        key={`share-${shareOpen}`}
        shareOpen={shareOpen}
        setShareOpen={setShareOpen}
        selected={selected}
        selectedDebts={selectedDebts}
        store={data.store}
      />
      <PaymentDialog
        key={`payment-${paymentOpen}`}
        paymentOpen={paymentOpen}
        setPaymentOpen={setPaymentOpen}
        selected={selected}
        selectedDebts={selectedDebts}
        saving={saving}
        submitForm={submitForm}
        activeCashiers={activeCashiers}
      />
    </main>
  );
}
