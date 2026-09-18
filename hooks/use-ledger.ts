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
export function useLedger(initialData?: LedgerData) {
  const [data, setData] = useState<LedgerData>(initialData ?? emptyData);
  const [selectedId, setSelectedId] = useState(
    initialData?.customers[0]?.id ?? "",
  );
  const [loading, setLoading] = useState(!initialData);
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
    if (initialData) return;
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [initialData, loadData]);

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
      if (payload.action === "create_debt" && Array.isArray(result.debts)) {
        const customerId = String(payload.customerId ?? "");
        const createdDebts = (result.debts as Debt[]).map((row) => ({
          ...row,
          amount: asNumber(row.amount),
          paid_amount: 0,
          qty: asNumber(row.qty),
          unit_price:
            row.unit_price == null ? null : asNumber(row.unit_price),
          wholesale_price:
            row.wholesale_price == null
              ? null
              : asNumber(row.wholesale_price),
        }));
        const addedDebts = createdDebts.filter(
          (debt) => debt.customer_id === customerId,
        );

        setData((current) => {
          const missingDebts = addedDebts.filter(
            (debt) => !current.debts.some((item) => item.id === debt.id),
          );
          if (!missingDebts.length) return current;
          const missingTotal = missingDebts.reduce(
            (total, debt) => total + debt.amount,
            0,
          );
          const latestActivity = missingDebts
            .map((debt) => debt.created_at)
            .sort()
            .at(-1);
          const latestDebtDate = missingDebts
            .map((debt) => debt.date)
            .sort()
            .at(-1);
          return {
            ...current,
            debts: [...missingDebts, ...current.debts],
            customers: current.customers.map((customer) =>
              customer.id === customerId
                ? {
                    ...customer,
                    balance: customer.balance + missingTotal,
                    debt_count: customer.debt_count + missingDebts.length,
                    last_debt_at: latestDebtDate ?? customer.last_debt_at,
                    last_activity_at:
                      latestActivity ?? customer.last_activity_at,
                  }
                : customer,
            ),
          };
        });
      }
      return result;
    },
    [loadData],
  );

  return { data, selectedId, setSelectedId, loading, loadData, postAction };
}
