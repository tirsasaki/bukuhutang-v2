import { requireApiUser } from "@/lib/supabase/server";
import type { Debt, LedgerData, Payment } from "./types";

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  created_at: string;
};
type DebtRow = Omit<Debt, "paid_amount">;
type PaymentRow = Omit<Payment, "customer_id">;
type CreditRow = { customer_id: string; amount: number };

function addToGroup<T>(groups: Map<string, T[]>, key: string, value: T) {
  const group = groups.get(key);
  if (group) group.push(value);
  else groups.set(key, [value]);
}

export async function readLedgerData(): Promise<LedgerData> {
  const { supabase, user } = await requireApiUser();
  const [
    customersResult,
    debtsResult,
    paymentsResult,
    creditsResult,
    importsResult,
    cashiersResult,
    storeResult,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id,name,phone,created_at")
      .eq("owner_id", user.id),
    supabase
      .from("debt_items")
      .select(
        "id,customer_id,amount,created_at,date,invoice_no,item,cashier,qty,unit_price,wholesale_price,price_mode,invoice_id",
      )
      .eq("owner_id", user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id,debt_item_id,amount,paid_at,received_by,source")
      .eq("owner_id", user.id)
      .order("paid_at", { ascending: false }),
    supabase
      .from("credit_transactions")
      .select("customer_id,amount")
      .eq("owner_id", user.id),
    supabase
      .from("import_batches")
      .select("row_count,imported_at")
      .eq("owner_id", user.id),
    supabase
      .from("cashiers")
      .select("id,name,phone,is_active")
      .eq("owner_id", user.id)
      .order("name"),
    supabase
      .from("store_settings")
      .select("name,address")
      .eq("owner_id", user.id)
      .maybeSingle(),
  ]);

  const firstError =
    customersResult.error ??
    debtsResult.error ??
    paymentsResult.error ??
    creditsResult.error ??
    importsResult.error ??
    cashiersResult.error ??
    storeResult.error;
  if (firstError) throw firstError;

  const customers = (customersResult.data ?? []) as CustomerRow[];
  const debts = (debtsResult.data ?? []) as DebtRow[];
  const payments = (paymentsResult.data ?? []) as PaymentRow[];
  const credits = (creditsResult.data ?? []) as CreditRow[];
  const debtById = new Map(debts.map((debt) => [debt.id, debt]));
  const paidByDebt = new Map<string, number>();

  const paymentRows: Payment[] = payments.map((payment) => {
    const debt = debtById.get(payment.debt_item_id);
    paidByDebt.set(
      payment.debt_item_id,
      (paidByDebt.get(payment.debt_item_id) ?? 0) + Number(payment.amount),
    );
    return {
      ...payment,
      amount: Number(payment.amount),
      customer_id: debt?.customer_id ?? "",
    };
  });

  const debtRows: Debt[] = debts.map((debt) => ({
    ...debt,
    amount: Number(debt.amount),
    qty: Number(debt.qty),
    unit_price: debt.unit_price == null ? null : Number(debt.unit_price),
    wholesale_price:
      debt.wholesale_price == null ? null : Number(debt.wholesale_price),
    paid_amount: paidByDebt.get(debt.id) ?? 0,
  }));

  const debtsByCustomer = new Map<string, Debt[]>();
  const paymentsByCustomer = new Map<string, Payment[]>();
  const creditByCustomer = new Map<string, number>();
  debtRows.forEach((debt) =>
    addToGroup(debtsByCustomer, debt.customer_id, debt),
  );
  paymentRows.forEach((payment) =>
    addToGroup(paymentsByCustomer, payment.customer_id, payment),
  );
  credits.forEach((credit) =>
    creditByCustomer.set(
      credit.customer_id,
      (creditByCustomer.get(credit.customer_id) ?? 0) + Number(credit.amount),
    ),
  );

  const customerRows = customers
    .map((customer) => {
      const customerDebts = debtsByCustomer.get(customer.id) ?? [];
      const customerPayments = paymentsByCustomer.get(customer.id) ?? [];
      const totalDebt = customerDebts.reduce(
        (total, debt) => total + debt.amount,
        0,
      );
      const totalPaid = customerPayments.reduce(
        (total, payment) => total + payment.amount,
        0,
      );
      return {
        ...customer,
        balance: Math.max(0, totalDebt - totalPaid),
        credit_balance: Math.max(0, creditByCustomer.get(customer.id) ?? 0),
        debt_count: customerDebts.length,
        last_debt_at: customerDebts[0]?.date ?? null,
        last_payment_at: customerPayments[0]?.paid_at ?? null,
        last_payment_amount: customerPayments[0]?.amount ?? 0,
        last_activity_at:
          [
            customer.created_at,
            customerDebts[0]?.created_at,
            customerPayments[0]?.paid_at,
          ]
            .filter(Boolean)
            .sort()
            .at(-1) ?? customer.created_at,
      };
    })
    .sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at));

  const imports = importsResult.data ?? [];
  return {
    customers: customerRows,
    debts: debtRows,
    payments: paymentRows,
    cashiers: cashiersResult.data ?? [],
    store: storeResult.data ?? { name: "Toko Anda", address: "" },
    importSummary: {
      import_count: imports.length,
      row_count: imports.reduce(
        (total, row) => total + Number(row.row_count),
        0,
      ),
      last_import_at:
        imports
          .map((row) => row.imported_at)
          .sort()
          .at(-1) ?? null,
    },
  };
}
