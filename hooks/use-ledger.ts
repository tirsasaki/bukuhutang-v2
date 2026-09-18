"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { asNumber } from "@/lib/ledger/format";
import type { Customer, Debt, LedgerData, Payment } from "@/lib/ledger/types";
const emptyData: LedgerData = {
  customers: [],
  debts: [],
  payments: [],
  cashiers: [],
  store: { name: "Toko Anda", address: "" },
};
export function useLedger() {
  const [data, setData] = useState<LedgerData>(emptyData);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const loadData = useCallback(async () => {
    try {
      const response = await fetch("/api/ledger", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.message || "Data tidak dapat dibuka.");
      const normalized: LedgerData = {
        customers: result.customers.map((row: Customer) => ({
          ...row,
          balance: asNumber(row.balance),
          credit_balance: asNumber(row.credit_balance),
          debt_count: asNumber(row.debt_count),
          last_payment_amount: asNumber(row.last_payment_amount),
        })),
        debts: result.debts.map((row: Debt) => ({
          ...row,
          amount: asNumber(row.amount),
          paid_amount: asNumber(row.paid_amount),
          qty: asNumber(row.qty),
          unit_price: row.unit_price == null ? null : asNumber(row.unit_price),
          wholesale_price:
            row.wholesale_price == null ? null : asNumber(row.wholesale_price),
        })),
        payments: result.payments.map((row: Payment) => ({
          ...row,
          amount: asNumber(row.amount),
        })),
        cashiers: result.cashiers ?? [],
        store: result.store ?? { name: "Toko Anda", address: "" },
        importSummary: result.importSummary,
      };
      setData(normalized);
      setSelectedId((current) =>
        current &&
        normalized.customers.some((customer) => customer.id === current)
          ? current
          : (normalized.customers[0]?.id ?? ""),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Data tidak dapat dibuka.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const postAction = useCallback(
    async (payload: Record<string, unknown>) => {
      const response = await fetch("/api/ledger", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.message || "Perubahan belum tersimpan.");
      await loadData();
      return result;
    },
    [loadData],
  );

  return { data, selectedId, setSelectedId, loading, loadData, postAction };
}
