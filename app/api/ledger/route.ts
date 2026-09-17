import { requireApiUser } from "@/lib/supabase/server";
import { databaseSetupMessage, isMissingDatabaseSchema } from "@/lib/supabase/errors";

type CustomerRow = { id: string; name: string; phone: string; created_at: string };
type DebtRow = { id: string; customer_id: string; amount: number; created_at: string; date: string; invoice_no: string; item: string; cashier: string; qty: number; unit_price: number | null; wholesale_price: number | null; price_mode: "retail" | "wholesale"; invoice_id: string | null };
type PaymentRow = { id: string; debt_item_id: string; amount: number; paid_at: string; received_by: string };
type CreditRow = { customer_id: string; amount: number };

function jsonError(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

export async function GET() {
  try {
    const { supabase, user } = await requireApiUser();
    const [customersResult, debtsResult, paymentsResult, creditsResult, importsResult, cashiersResult] = await Promise.all([
      supabase.from("customers").select("id,name,phone,created_at").eq("owner_id", user.id),
      supabase.from("debt_items").select("id,customer_id,amount,created_at,date,invoice_no,item,cashier,qty,unit_price,wholesale_price,price_mode,invoice_id").eq("owner_id", user.id).order("date", { ascending: false }),
      supabase.from("payments").select("id,debt_item_id,amount,paid_at,received_by").eq("owner_id", user.id).order("paid_at", { ascending: false }),
      supabase.from("credit_transactions").select("customer_id,amount").eq("owner_id", user.id),
      supabase.from("import_batches").select("row_count,imported_at").eq("owner_id", user.id),
      supabase.from("cashiers").select("id,name,phone,is_active").eq("owner_id", user.id).order("name"),
    ]);

    const firstError = customersResult.error ?? debtsResult.error ?? paymentsResult.error ?? creditsResult.error ?? importsResult.error ?? cashiersResult.error;
    if (firstError) throw firstError;

    const customers = (customersResult.data ?? []) as CustomerRow[];
    const debts = (debtsResult.data ?? []) as DebtRow[];
    const payments = (paymentsResult.data ?? []) as PaymentRow[];
    const credits = (creditsResult.data ?? []) as CreditRow[];
    const debtById = new Map(debts.map((debt) => [debt.id, debt]));
    const paidByDebt = new Map<string, number>();

    const paymentRows = payments.map((payment) => {
      const debt = debtById.get(payment.debt_item_id);
      paidByDebt.set(payment.debt_item_id, (paidByDebt.get(payment.debt_item_id) ?? 0) + Number(payment.amount));
      return { ...payment, amount: Number(payment.amount), customer_id: debt?.customer_id ?? "" };
    });

    const debtRows = debts.map((debt) => ({
      ...debt,
      amount: Number(debt.amount),
      qty: Number(debt.qty),
      unit_price: debt.unit_price == null ? null : Number(debt.unit_price),
      wholesale_price: debt.wholesale_price == null ? null : Number(debt.wholesale_price),
      paid_amount: paidByDebt.get(debt.id) ?? 0,
    }));

    const customerRows = customers.map((customer) => {
      const customerDebts = debtRows.filter((debt) => debt.customer_id === customer.id);
      const customerPayments = paymentRows.filter((payment) => payment.customer_id === customer.id);
      const credit = credits.filter((row) => row.customer_id === customer.id).reduce((total, row) => total + Number(row.amount), 0);
      const totalDebt = customerDebts.reduce((total, debt) => total + debt.amount, 0);
      const totalPaid = customerPayments.reduce((total, payment) => total + payment.amount, 0);
      return {
        ...customer,
        balance: totalDebt - totalPaid - credit,
        debt_count: customerDebts.length,
        last_debt_at: customerDebts[0]?.date ?? null,
        last_payment_at: customerPayments[0]?.paid_at ?? null,
        last_payment_amount: customerPayments[0]?.amount ?? 0,
      };
    }).sort((a, b) => {
      if ((a.balance > 0) !== (b.balance > 0)) return a.balance > 0 ? -1 : 1;
      return b.balance - a.balance || a.name.localeCompare(b.name, "id");
    });

    const imports = importsResult.data ?? [];
    return Response.json({
      ok: true,
      customers: customerRows,
      debts: debtRows,
      payments: paymentRows,
      cashiers: cashiersResult.data ?? [],
      importSummary: {
        import_count: imports.length,
        row_count: imports.reduce((total, row) => total + Number(row.row_count), 0),
        last_import_at: imports.map((row) => row.imported_at).sort().at(-1) ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return jsonError("Silakan masuk terlebih dahulu.", 401);
    console.error(error);
    if (isMissingDatabaseSchema(error)) return jsonError(databaseSetupMessage, 503);
    return jsonError("Data piutang belum dapat dibuka.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireApiUser();
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "");

    if (action === "create_customer") {
      const name = String(body.name ?? "").trim();
      const phone = String(body.phone ?? "").trim();
      if (!name) return jsonError("Nama pelanggan wajib diisi.");
      const id = crypto.randomUUID();
      const { error } = await supabase.from("customers").insert({ id, owner_id: user.id, name, phone, created_at: new Date().toISOString() });
      if (error) throw error;
      return Response.json({ ok: true, id });
    }

    if (action === "update_customer") {
      const customerId = String(body.customerId ?? "");
      const name = String(body.name ?? "").trim();
      const phone = String(body.phone ?? "").trim();
      if (!name) return jsonError("Nama pelanggan wajib diisi.");
      if (name.length > 100) return jsonError("Nama pelanggan terlalu panjang.");
      if (phone.length > 30) return jsonError("Nomor WhatsApp terlalu panjang.");
      const { data, error } = await supabase.from("customers").update({ name, phone }).eq("id", customerId).eq("owner_id", user.id).select("id").maybeSingle();
      if (error) throw error;
      if (!data) return jsonError("Pelanggan tidak ditemukan.", 404);
      return Response.json({ ok: true, id: customerId });
    }

    if (action === "create_debt") {
      const customerId = String(body.customerId ?? "");
      const date = String(body.date ?? "");
      const cashier = String(body.cashier ?? "").trim();
      const rawItems = Array.isArray(body.items)
        ? body.items
        : [{
            item: body.item,
            qty: body.qty ?? 1,
            unitPrice: Number(body.unitPrice ?? body.amount) / Math.max(1, Number(body.qty) || 1),
            wholesalePrice: body.wholesalePrice,
            priceMode: body.priceMode,
          }];

      if (!customerId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonError("Pelanggan dan tanggal nota wajib diisi.");
      if (!rawItems.length || rawItems.length > 50) return jsonError("Satu nota harus berisi 1 sampai 50 barang.");

      const items = rawItems.map((raw) => {
        const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
        const item = String(value.item ?? "").trim();
        const qty = Math.round(Number(value.qty));
        const unitPrice = Math.round(Number(value.unitPrice));
        const wholesalePrice = value.wholesalePrice === "" || value.wholesalePrice == null ? null : Math.round(Number(value.wholesalePrice));
        const priceMode = value.priceMode === "wholesale" ? "wholesale" : "retail";
        return { item, qty, unitPrice, wholesalePrice, priceMode };
      });

      const invalidItem = items.find((item) =>
        !item.item || item.item.length > 200 || !Number.isSafeInteger(item.qty) || item.qty <= 0 || item.qty > 1_000_000 ||
        !Number.isSafeInteger(item.unitPrice) || item.unitPrice <= 0 ||
        (item.priceMode === "wholesale" && (!Number.isSafeInteger(item.wholesalePrice) || Number(item.wholesalePrice) <= 0)),
      );
      if (invalidItem) return jsonError("Periksa nama barang, jumlah, serta harga eceran atau grosir pada setiap baris.");
      if (!cashier) return jsonError("Pilih kasir yang mencatat nota ini.");
      const { data: activeCashier, error: cashierError } = await supabase.from("cashiers").select("id").eq("owner_id", user.id).eq("name", cashier).eq("is_active", true).maybeSingle();
      if (cashierError) throw cashierError;
      if (!activeCashier) return jsonError("Kasir tidak ditemukan atau sudah dinonaktifkan.");

      const { data, error } = await supabase.rpc("create_debt_invoice", {
        invoice_customer_id: customerId,
        invoice_date: date,
        invoice_cashier: cashier,
        invoice_items: items,
      });
      if (error) throw error;
      return Response.json({ ok: true, ...data });
    }

    if (action === "create_payment") {
      const customerId = String(body.customerId ?? "");
      const amount = Math.round(Number(body.amount));
      if (!Number.isFinite(amount) || amount <= 0) return jsonError("Nominal pembayaran harus lebih dari nol.");
      const { data, error } = await supabase.rpc("record_customer_payment", {
        payment_customer_id: customerId,
        payment_amount: amount,
        payment_received_by: String(body.receivedBy ?? ""),
      });
      if (error) throw error;
      if (!data?.recorded) return jsonError("Pelanggan ini tidak mempunyai piutang terbuka.");
      return Response.json({ ok: true, overpayment: Number(data.overpayment ?? 0) });
    }

    return jsonError("Tindakan tidak dikenal.");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return jsonError("Silakan masuk terlebih dahulu.", 401);
    console.error(error);
    if (isMissingDatabaseSchema(error)) return jsonError(databaseSetupMessage, 503);
    return jsonError("Perubahan belum dapat disimpan.", 500);
  }
}
