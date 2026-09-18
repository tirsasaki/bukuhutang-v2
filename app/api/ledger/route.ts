import { requireApiUser } from "@/lib/supabase/server";
import { databaseSetupMessage, isMissingDatabaseSchema } from "@/lib/supabase/errors";
import { readLedgerData } from "@/lib/ledger/read";

function jsonError(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

export async function GET() {
  try {
    return Response.json({ ok: true, ...(await readLedgerData()) });
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
      const invoiceId = String(data?.invoiceId ?? "");
      const { data: createdDebts, error: createdDebtsError } = await supabase
        .from("debt_items")
        .select("id,customer_id,amount,created_at,date,invoice_no,item,cashier,qty,unit_price,wholesale_price,price_mode,invoice_id")
        .eq("owner_id", user.id)
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: true });
      if (createdDebtsError) throw createdDebtsError;
      return Response.json({ ok: true, ...data, debts: createdDebts ?? [] });
    }

    if (action === "create_payment") {
      const customerId = String(body.customerId ?? "");
      const payAll = body.payAll === true || String(body.payAll ?? "") === "true";
      const amount = Math.round(Number(body.amount));
      const creditAmount = Math.round(Number(body.creditAmount ?? 0));
      const receivedBy = String(body.receivedBy ?? "").trim();
      if (!Number.isSafeInteger(creditAmount) || creditAmount < 0) return jsonError("Nominal saldo kelebihan bayar tidak valid.");
      if (!Number.isSafeInteger(amount) || amount < 0 || amount + creditAmount <= 0) return jsonError("Jumlah pembayaran harus lebih dari nol.");
      if (!receivedBy) return jsonError("Pilih kasir yang menerima pembayaran.");
      const { data: activeCashier, error: cashierError } = await supabase.from("cashiers").select("id").eq("owner_id", user.id).eq("name", receivedBy).eq("is_active", true).maybeSingle();
      if (cashierError) throw cashierError;
      if (!activeCashier) return jsonError("Kasir tidak ditemukan atau sudah dinonaktifkan.");
      const { data, error } = await supabase.rpc("record_customer_payment_v2", {
        payment_customer_id: customerId,
        payment_cash_amount: amount,
        payment_credit_amount: creditAmount,
        payment_received_by: receivedBy,
        payment_pay_all: payAll,
      });
      if (error) throw error;
      if (!data?.recorded) return jsonError("Pelanggan ini tidak mempunyai piutang terbuka.");
      return Response.json({
        ok: true,
        paidAmount: Number(data.paidAmount ?? 0),
        receivedAmount: Number(data.receivedAmount ?? data.paidAmount ?? 0),
        overpayment: Number(data.overpayment ?? 0),
        creditUsed: Number(data.creditUsed ?? 0),
        remainingBalance: Number(data.remainingBalance ?? 0),
        settledCount: Number(data.settledCount ?? 0),
      });
    }

    return jsonError("Tindakan tidak dikenal.");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return jsonError("Silakan masuk terlebih dahulu.", 401);
    console.error(error);
    if (isMissingDatabaseSchema(error)) return jsonError(databaseSetupMessage, 503);
    if (error && typeof error === "object" && "code" in error && error.code === "P0001" && "message" in error && typeof error.message === "string") return jsonError(error.message);
    return jsonError("Perubahan belum dapat disimpan.", 500);
  }
}
