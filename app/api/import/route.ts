import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

export const runtime = "edge";

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
    const user = await getChatGPTUser();
    const host = new URL(request.url).hostname;
    const owner = user?.userId ?? ((host === "localhost" || host === "127.0.0.1") ? "local-preview" : null);
    if (!owner) return Response.json({ ok: false, message: "Silakan masuk terlebih dahulu." }, { status: 401 });
    if (!env.DB) return Response.json({ ok: false, message: "Penyimpanan belum tersedia." }, { status: 503 });
    const raw = await request.text();
    if (raw.length > 5_000_000) return Response.json({ ok: false, message: "Berkas cadangan terlalu besar." }, { status: 413 });
    const backup = JSON.parse(raw) as Backup;
    if (!backup.tables || typeof backup.tables !== "object") return Response.json({ ok: false, message: "Format cadangan tidak dikenali." }, { status: 400 });

    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const fingerprint = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const duplicate = await env.DB.prepare("SELECT row_count FROM import_batches WHERE owner_id = ? AND fingerprint = ?").bind(owner, fingerprint).first<{ row_count: number }>();
    if (duplicate) return Response.json({ ok: true, duplicate: true, imported: 0, rowCount: duplicate.row_count });

    const sourceUserId = text(backup.user_id);
    const customerRows = rows(backup.tables.customers);
    const debtRows = rows(backup.tables.debt_items);
    const paymentRows = rows(backup.tables.payments);
    const creditRows = rows(backup.tables.credit_transactions);
    const statements = [];

    for (const row of customerRows) statements.push(env.DB.prepare(`
      INSERT OR IGNORE INTO customers (id, owner_id, source_user_id, name, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(text(row.id, crypto.randomUUID()), owner, sourceUserId, text(row.name, "Tanpa nama"), text(row.phone), text(row.created_at, new Date().toISOString())));
    for (const row of debtRows) statements.push(env.DB.prepare(`
      INSERT OR IGNORE INTO debt_items (id, owner_id, customer_id, amount, created_at, date, invoice_no, item, cashier, qty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(text(row.id, crypto.randomUUID()), owner, text(row.customer_id), integer(row.amount), text(row.created_at, new Date().toISOString()), text(row.date, text(row.created_at).slice(0, 10)), text(row.invoice_no), text(row.item), text(row.kasir), Math.max(1, integer(row.qty, 1))));
    for (const row of paymentRows) statements.push(env.DB.prepare(`
      INSERT OR IGNORE INTO payments (id, owner_id, debt_item_id, amount, paid_at, received_by) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(text(row.id, crypto.randomUUID()), owner, text(row.debt_item_id), integer(row.amount), text(row.paid_at, new Date().toISOString()), text(row.received_by)));
    for (const row of creditRows) statements.push(env.DB.prepare(`
      INSERT OR IGNORE INTO credit_transactions (id, owner_id, customer_id, amount, note, created_at) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(text(row.id, crypto.randomUUID()), owner, text(row.customer_id), integer(row.amount), text(row.note), text(row.created_at, new Date().toISOString())));

    const rowCount = customerRows.length + debtRows.length + paymentRows.length + creditRows.length;
    statements.push(env.DB.prepare(`INSERT INTO import_batches (id, owner_id, fingerprint, exported_at, imported_at, row_count) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), owner, fingerprint, text(backup.exported_at), new Date().toISOString(), rowCount));
    await env.DB.batch(statements);
    return Response.json({ ok: true, duplicate: false, imported: rowCount, counts: { customers: customerRows.length, debts: debtRows.length, payments: paymentRows.length, credits: creditRows.length } });
  } catch (error) {
    console.error(error);
    const message = error instanceof SyntaxError ? "Berkas bukan JSON yang valid." : "Cadangan belum dapat dipulihkan.";
    return Response.json({ ok: false, message }, { status: 400 });
  }
}
