import {
  databaseSetupMessage,
  isMissingDatabaseSchema,
} from "@/lib/supabase/errors";
import { requireApiUser } from "@/lib/supabase/server";

type Row = Record<string, unknown>;
type Backup = {
  exported_at?: unknown;
  user_id?: unknown;
  tables?: Record<string, unknown>;
};
type Supabase = Awaited<ReturnType<typeof requireApiUser>>["supabase"];

function rows(value: unknown): Row[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Row =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}
function text(value: unknown, fallback = "") {
  return value == null ? fallback : String(value);
}
function integer(value: unknown, fallback = 0) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? number : fallback;
}
function nullableInteger(value: unknown) {
  if (value === "" || value == null) return null;
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? number : null;
}
async function insertRows(
  supabase: Supabase,
  table: string,
  values: Row[],
  onConflict = "id",
) {
  if (!values.length) return;
  const { error } = await supabase
    .from(table)
    .upsert(values, { onConflict, ignoreDuplicates: true });
  if (error) throw error;
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireApiUser();
    const raw = await request.text();
    if (raw.length > 5_000_000)
      return Response.json(
        { ok: false, message: "Berkas cadangan terlalu besar." },
        { status: 413 },
      );
    const backup = JSON.parse(raw) as Backup;
    if (!backup.tables || typeof backup.tables !== "object")
      return Response.json(
        { ok: false, message: "Format cadangan tidak dikenali." },
        { status: 400 },
      );

    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(raw),
    );
    const fingerprint = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const { data: duplicate, error: duplicateError } = await supabase
      .from("import_batches")
      .select("row_count")
      .eq("owner_id", user.id)
      .eq("fingerprint", fingerprint)
      .maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate)
      return Response.json({
        ok: true,
        duplicate: true,
        imported: 0,
        rowCount: duplicate.row_count,
      });

    const now = new Date().toISOString();
    const sourceUserId = text(backup.user_id);
    const customers: Row[] = rows(backup.tables.customers).map((row) => ({
      id: text(row.id, crypto.randomUUID()),
      owner_id: user.id,
      source_user_id: text(row.source_user_id, sourceUserId),
      name: text(row.name, "Tanpa nama"),
      phone: text(row.phone),
      created_at: text(row.created_at, now),
    }));
    const cashiers: Row[] = rows(backup.tables.cashiers).map((row) => ({
      id: text(row.id, crypto.randomUUID()),
      owner_id: user.id,
      name: text(row.name, "Kasir"),
      phone: text(row.phone),
      is_active: row.is_active !== false,
      created_at: text(row.created_at, now),
      updated_at: text(row.updated_at, now),
    }));
    const invoices: Row[] = rows(backup.tables.invoices).map((row) => ({
      id: text(row.id, crypto.randomUUID()),
      owner_id: user.id,
      customer_id: text(row.customer_id),
      invoice_no: text(row.invoice_no),
      date: text(row.date, now.slice(0, 10)),
      cashier: text(row.cashier),
      total_amount: integer(row.total_amount),
      created_at: text(row.created_at, now),
    }));
    const debts: Row[] = rows(backup.tables.debt_items).map((row) => {
      const qty = Math.max(1, integer(row.qty, 1));
      const amount = integer(row.amount);
      return {
        id: text(row.id, crypto.randomUUID()),
        owner_id: user.id,
        customer_id: text(row.customer_id),
        amount,
        created_at: text(row.created_at, now),
        date: text(row.date, text(row.created_at, now).slice(0, 10)),
        invoice_no: text(row.invoice_no),
        item: text(row.item),
        cashier: text(row.kasir ?? row.cashier),
        qty,
        unit_price:
          nullableInteger(row.unit_price) ??
          Math.max(1, Math.round(amount / qty)),
        wholesale_price: nullableInteger(row.wholesale_price),
        price_mode: row.price_mode === "wholesale" ? "wholesale" : "retail",
        invoice_id: row.invoice_id == null ? null : text(row.invoice_id),
      };
    });
    const payments: Row[] = rows(backup.tables.payments).map((row) => ({
      id: text(row.id, crypto.randomUUID()),
      owner_id: user.id,
      debt_item_id: text(row.debt_item_id),
      amount: integer(row.amount),
      paid_at: text(row.paid_at, now),
      received_by: text(row.received_by),
      source: row.source === "credit" ? "credit" : "cash",
    }));
    const credits: Row[] = rows(backup.tables.credit_transactions).map(
      (row) => ({
        id: text(row.id, crypto.randomUUID()),
        owner_id: user.id,
        customer_id: text(row.customer_id),
        amount: integer(row.amount),
        note: text(row.note),
        created_at: text(row.created_at, now),
      }),
    );

    await insertRows(supabase, "customers", customers);
    await insertRows(supabase, "cashiers", cashiers);
    await insertRows(supabase, "invoices", invoices);
    await insertRows(supabase, "debt_items", debts);
    await insertRows(supabase, "payments", payments);
    await insertRows(supabase, "credit_transactions", credits);

    const store = rows(backup.tables.store_settings)[0];
    if (store) {
      const { error } = await supabase.from("store_settings").upsert(
        {
          owner_id: user.id,
          name: text(store.name, "Toko Anda"),
          address: text(store.address),
          updated_at: text(store.updated_at, now),
        },
        { onConflict: "owner_id" },
      );
      if (error) throw error;
    }

    const counterByDate = new Map<string, number>();
    for (const row of rows(backup.tables.invoice_counters)) {
      const date = text(row.invoice_date);
      if (date)
        counterByDate.set(
          date,
          Math.max(counterByDate.get(date) ?? 0, integer(row.last_number)),
        );
    }
    for (const invoice of invoices) {
      const date = text(invoice.date);
      const sequence = Number(text(invoice.invoice_no).match(/-(\d+)$/)?.[1]);
      if (date && Number.isFinite(sequence))
        counterByDate.set(
          date,
          Math.max(counterByDate.get(date) ?? 0, sequence),
        );
    }
    if (counterByDate.size) {
      const { data: current, error: currentError } = await supabase
        .from("invoice_counters")
        .select("invoice_date,last_number")
        .eq("owner_id", user.id)
        .in("invoice_date", [...counterByDate.keys()]);
      if (currentError) throw currentError;
      for (const row of current ?? []) {
        const date = text(row.invoice_date);
        counterByDate.set(
          date,
          Math.max(counterByDate.get(date) ?? 0, integer(row.last_number)),
        );
      }
      const { error } = await supabase.from("invoice_counters").upsert(
        [...counterByDate].map(([invoiceDate, lastNumber]) => ({
          owner_id: user.id,
          invoice_date: invoiceDate,
          last_number: lastNumber,
        })),
        { onConflict: "owner_id,invoice_date" },
      );
      if (error) throw error;
    }

    const rowCount =
      customers.length +
      invoices.length +
      debts.length +
      payments.length +
      credits.length +
      cashiers.length +
      (store ? 1 : 0);
    const { error: importError } = await supabase
      .from("import_batches")
      .insert({
        id: crypto.randomUUID(),
        owner_id: user.id,
        fingerprint,
        exported_at: text(backup.exported_at),
        imported_at: now,
        row_count: rowCount,
      });
    if (importError) throw importError;
    return Response.json({
      ok: true,
      duplicate: false,
      imported: rowCount,
      counts: {
        customers: customers.length,
        invoices: invoices.length,
        debts: debts.length,
        payments: payments.length,
        credits: credits.length,
        cashiers: cashiers.length,
        stores: store ? 1 : 0,
      },
    });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return Response.json(
        { ok: false, message: "Silakan masuk terlebih dahulu." },
        { status: 401 },
      );
    if (isMissingDatabaseSchema(error))
      return Response.json(
        { ok: false, message: databaseSetupMessage },
        { status: 503 },
      );
    const message =
      error instanceof SyntaxError
        ? "Berkas bukan JSON yang valid."
        : "Cadangan belum dapat dipulihkan.";
    return Response.json({ ok: false, message }, { status: 400 });
  }
}
