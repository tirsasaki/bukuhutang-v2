import {
  databaseSetupMessage,
  isMissingDatabaseSchema,
} from "@/lib/supabase/errors";
import { requireApiUser } from "@/lib/supabase/server";

function jsonError(message: string, status = 500) {
  return Response.json({ ok: false, message }, { status });
}

export async function GET() {
  try {
    const { supabase, user } = await requireApiUser();
    const [
      customers,
      invoiceCounters,
      invoices,
      debts,
      payments,
      credits,
      cashiers,
      store,
    ] = await Promise.all([
      supabase
        .from("customers")
        .select("id,source_user_id,name,phone,created_at")
        .eq("owner_id", user.id)
        .order("created_at"),
      supabase
        .from("invoice_counters")
        .select("invoice_date,last_number")
        .eq("owner_id", user.id)
        .order("invoice_date"),
      supabase
        .from("invoices")
        .select(
          "id,customer_id,invoice_no,date,cashier,total_amount,created_at",
        )
        .eq("owner_id", user.id)
        .order("created_at"),
      supabase
        .from("debt_items")
        .select(
          "id,customer_id,amount,created_at,date,invoice_no,item,cashier,qty,unit_price,wholesale_price,price_mode,invoice_id",
        )
        .eq("owner_id", user.id)
        .order("created_at"),
      supabase
        .from("payments")
        .select("id,debt_item_id,amount,paid_at,received_by,source")
        .eq("owner_id", user.id)
        .order("paid_at"),
      supabase
        .from("credit_transactions")
        .select("id,customer_id,amount,note,created_at")
        .eq("owner_id", user.id)
        .order("created_at"),
      supabase
        .from("cashiers")
        .select("id,name,phone,is_active,created_at,updated_at")
        .eq("owner_id", user.id)
        .order("created_at"),
      supabase
        .from("store_settings")
        .select("name,address,updated_at")
        .eq("owner_id", user.id)
        .maybeSingle(),
    ]);

    const firstError =
      customers.error ??
      invoiceCounters.error ??
      invoices.error ??
      debts.error ??
      payments.error ??
      credits.error ??
      cashiers.error ??
      store.error;
    if (firstError) throw firstError;

    const exportedAt = new Date().toISOString();
    const backup = {
      format: "bukuhutang-v2",
      version: 2,
      exported_at: exportedAt,
      user_id: user.id,
      tables: {
        customers: customers.data ?? [],
        invoice_counters: invoiceCounters.data ?? [],
        invoices: invoices.data ?? [],
        debt_items: debts.data ?? [],
        payments: payments.data ?? [],
        credit_transactions: credits.data ?? [],
        cashiers: cashiers.data ?? [],
        store_settings: store.data ? [store.data] : [],
      },
    };

    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="buku-piutang-${exportedAt.slice(0, 10)}.json"`,
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return jsonError("Silakan masuk terlebih dahulu.", 401);
    console.error(error);
    if (isMissingDatabaseSchema(error))
      return jsonError(databaseSetupMessage, 503);
    return jsonError("Cadangan belum dapat dibuat.");
  }
}
