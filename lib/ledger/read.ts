import { requireApiUser } from "@/lib/supabase/server";
import { retrySupabaseRequest } from "@/lib/supabase/retry";
import type {
  Cashier,
  Debt,
  LedgerData,
  Payment,
  StoreInformation,
} from "./types";

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  created_at: string;
};
type DebtRow = Omit<Debt, "paid_amount">;
type PaymentRow = Omit<Payment, "customer_id">;
type CreditRow = {
  customer_id: string;
  amount: number;
  note: string;
  created_at: string;
};
type ImportRow = { row_count: number; imported_at: string };

const pageSize = 1000;

function readErrorField(error: unknown, field: string) {
  if (!error || typeof error !== "object" || !(field in error)) return undefined;
  return error[field as keyof typeof error];
}

function throwTableError(table: string, cause: unknown): never {
  const message = String(
    readErrorField(cause, "message") ?? "Kesalahan tidak dikenal",
  );
  const code = String(readErrorField(cause, "code") ?? "UNKNOWN");

  console.error(`Gagal membaca tabel Supabase: ${table}`, {
    code,
    message,
    error: cause,
  });
  throw new Error(`Supabase: ${message} (${code})`, { cause });
}

async function loadData<T>(
  table: string,
  request: () => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<T | null> {
  const result = await retrySupabaseRequest(request);
  if (result.error) throwTableError(table, result.error);
  return result.data as T | null;
}

async function loadPagedRows<T>(
  table: string,
  requestPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown; error: unknown }>,
) {
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const page =
      (await loadData<T[]>(table, () =>
        requestPage(from, from + pageSize - 1),
      )) ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function addToGroup<T>(groups: Map<string, T[]>, key: string, value: T) {
  const group = groups.get(key);
  if (group) group.push(value);
  else groups.set(key, [value]);
}

export async function readLedgerData(): Promise<LedgerData> {
  const { supabase, user } = await requireApiUser();
  const [
    customers,
    debts,
    payments,
    credits,
    imports,
    cashiers,
    store,
  ] = await Promise.all([
    loadData<CustomerRow[]>("customers", () =>
      supabase
        .from("customers")
        .select("id,name,phone,created_at")
        .eq("owner_id", user.id),
    ).then((rows) => rows ?? []),
    loadPagedRows<DebtRow>("debt_items", (from, to) =>
      supabase
        .from("debt_items")
        .select(
          "id,customer_id,amount,created_at,date,invoice_no,item,cashier,qty,unit_price,wholesale_price,price_mode,invoice_id",
        )
        .eq("owner_id", user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to),
    ),
    loadPagedRows<PaymentRow>("payments", (from, to) =>
      supabase
        .from("payments")
        .select("id,debt_item_id,amount,paid_at,received_by,source")
        .eq("owner_id", user.id)
        .order("paid_at", { ascending: false })
        .range(from, to),
    ),
    loadPagedRows<CreditRow>("credit_transactions", (from, to) =>
      supabase
        .from("credit_transactions")
        .select("customer_id,amount,note,created_at")
        .eq("owner_id", user.id)
        .range(from, to),
    ),
    loadData<ImportRow[]>("import_batches", () =>
      supabase
        .from("import_batches")
        .select("row_count,imported_at")
        .eq("owner_id", user.id),
    ).then((rows) => rows ?? []),
    loadData<Cashier[]>("cashiers", () =>
      supabase
        .from("cashiers")
        .select("id,name,phone,is_active")
        .eq("owner_id", user.id)
        .order("name"),
    ).then((rows) => rows ?? []),
    loadData<StoreInformation>("store_settings", () =>
      supabase
        .from("store_settings")
        .select("name,address")
        .eq("owner_id", user.id)
        .maybeSingle(),
    ),
  ]);

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
  const overpaymentByCustomerAndTime = new Map<string, number>();
  debtRows.forEach((debt) =>
    addToGroup(debtsByCustomer, debt.customer_id, debt),
  );
  paymentRows.forEach((payment) =>
    addToGroup(paymentsByCustomer, payment.customer_id, payment),
  );
  credits.forEach((credit) => {
    creditByCustomer.set(
      credit.customer_id,
      (creditByCustomer.get(credit.customer_id) ?? 0) + Number(credit.amount),
    );
    if (credit.note === "Kelebihan pembayaran pelunasan") {
      const key = `${credit.customer_id}|${credit.created_at}`;
      overpaymentByCustomerAndTime.set(
        key,
        (overpaymentByCustomerAndTime.get(key) ?? 0) + Number(credit.amount),
      );
    }
  });

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
      const lastPaymentAt = customerPayments[0]?.paid_at ?? null;
      const lastPaymentRows = lastPaymentAt
        ? customerPayments.filter(
            (payment) => payment.paid_at === lastPaymentAt,
          )
        : [];
      const lastCashApplied = lastPaymentRows
        .filter((payment) => payment.source !== "credit")
        .reduce((total, payment) => total + payment.amount, 0);
      const lastCreditApplied = lastPaymentRows
        .filter((payment) => payment.source === "credit")
        .reduce((total, payment) => total + payment.amount, 0);
      const lastOverpayment = lastPaymentAt
        ? (overpaymentByCustomerAndTime.get(
            `${customer.id}|${lastPaymentAt}`,
          ) ?? 0)
        : 0;
      const lastRecordedPayment = lastCashApplied + lastOverpayment;
      return {
        ...customer,
        balance: Math.max(0, totalDebt - totalPaid),
        credit_balance: Math.max(0, creditByCustomer.get(customer.id) ?? 0),
        debt_count: customerDebts.length,
        last_debt_at: customerDebts[0]?.date ?? null,
        last_payment_at: lastPaymentAt,
        last_payment_amount:
          lastRecordedPayment > 0
            ? lastRecordedPayment
            : lastCreditApplied,
        last_activity_at:
          [
            customer.created_at,
            customerDebts[0]?.created_at,
            lastPaymentAt,
          ]
            .filter(Boolean)
            .sort()
            .at(-1) ?? customer.created_at,
      };
    })
    .sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at));

  return {
    customers: customerRows,
    debts: debtRows,
    payments: paymentRows,
    cashiers,
    store: store ?? { name: "Toko Anda", address: "" },
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
