import { requireApiUser } from "@/lib/supabase/server";
import { databaseSetupMessage, isMissingDatabaseSchema } from "@/lib/supabase/errors";

type Row = Record<string, unknown>;
type Backup = { exported_at?: unknown; user_id?: unknown; tables?: Record<string, unknown> };

function rows(value: unknown): Row[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item));
}

function text(value: unknown, fallback = "") { return value == null ? fallback : String(value); }
function integer(value: unknown, fallback = 0) { const number = Math.round(Number(value)); return Number.isFinite(number) ? number : fallback; }

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireApiUser();
    const raw = await request.text();
    if (raw.length > 5_000_000) return Response.json({ ok: false, message: "Berkas cadangan terlalu besar." }, { status: 413 });
    const backup = JSON.parse(raw) as Backup;
    if (!backup.tables || typeof backup.tables !== "object") return Response.json({ ok: false, message: "Format cadangan tidak dikenali." }, { status: 400 });

    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const fingerprint = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const { data: duplicate, error: duplicateError } = await supabase.from("import_batches").select("row_count").eq("owner_id", user.id).eq("fingerprint", fingerprint).maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate) return Response.json({ ok: true, duplicate: true, imported: 0, rowCount: duplicate.row_count });

    const now = new Date().toISOString();
    const sourceUserId = text(backup.user_id);
    const customerRows = rows(backup.tables.customers);
    const debtRows = rows(backup.tables.debt_items);
    const paymentRows = rows(backup.tables.payments);
    const creditRows = rows(backup.tables.credit_transactions);

    const customers = customerRows.map((row) => ({
      id: text(row.id, crypto.randomUUID()), owner_id: user.id, source_user_id: sourceUserId,
      name: text(row.name, "Tanpa nama"), phone: text(row.phone), created_at: text(row.created_at, now),
    }));
    const debts = debtRows.map((row) => ({
      id: text(row.id, crypto.randomUUID()), owner_id: user.id, customer_id: text(row.customer_id), amount: integer(row.amount),
      created_at: text(row.created_at, now), date: text(row.date, text(row.created_at, now).slice(0, 10)),
      invoice_no: text(row.invoice_no), item: text(row.item), cashier: text(row.kasir ?? row.cashier), qty: Math.max(1, integer(row.qty, 1)),
    }));
    const payments = paymentRows.map((row) => ({
      id: text(row.id, crypto.randomUUID()), owner_id: user.id, debt_item_id: text(row.debt_item_id), amount: integer(row.amount),
      paid_at: text(row.paid_at, now), received_by: text(row.received_by),
    }));
    const credits = creditRows.map((row) => ({
      id: text(row.id, crypto.randomUUID()), owner_id: user.id, customer_id: text(row.customer_id), amount: integer(row.amount),
      note: text(row.note), created_at: text(row.created_at, now),
    }));

    if (customers.length) {
      const { error } = await supabase.from("customers").upsert(customers, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
    }
    if (debts.length) {
      const { error } = await supabase.from("debt_items").upsert(debts, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
    }
    if (payments.length) {
      const { error } = await supabase.from("payments").upsert(payments, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
    }
    if (credits.length) {
      const { error } = await supabase.from("credit_transactions").upsert(credits, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
    }

    const rowCount = customers.length + debts.length + payments.length + credits.length;
    const { error: importError } = await supabase.from("import_batches").insert({
      id: crypto.randomUUID(), owner_id: user.id, fingerprint, exported_at: text(backup.exported_at), imported_at: now, row_count: rowCount,
    });
    if (importError) throw importError;

    return Response.json({ ok: true, duplicate: false, imported: rowCount, counts: { customers: customers.length, debts: debts.length, payments: payments.length, credits: credits.length } });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ ok: false, message: "Silakan masuk terlebih dahulu." }, { status: 401 });
    if (isMissingDatabaseSchema(error)) return Response.json({ ok: false, message: databaseSetupMessage }, { status: 503 });
    const message = error instanceof SyntaxError ? "Berkas bukan JSON yang valid." : "Cadangan belum dapat dipulihkan.";
    return Response.json({ ok: false, message }, { status: 400 });
  }
}
