import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

export const runtime = "edge";

async function ownerId(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    const host = new URL(request.url).hostname;
    if (host === "localhost" || host === "127.0.0.1") return "local-preview";
    throw new Error("UNAUTHORIZED");
  }
  return user.userId;
}

function jsonError(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

export async function GET(request: Request) {
  try {
    const owner = await ownerId(request);
    if (!env.DB) return jsonError("Penyimpanan belum tersedia.", 503);

    const customerRows = await env.DB.prepare(`
      SELECT c.id, c.name, c.phone, c.created_at,
        COALESCE(d.total_debt, 0) - COALESCE(p.total_paid, 0) - COALESCE(cr.credit, 0) AS balance,
        COALESCE(d.debt_count, 0) AS debt_count,
        d.last_debt_at, p.last_payment_at, COALESCE(p.last_payment_amount, 0) AS last_payment_amount
      FROM customers c
      LEFT JOIN (
        SELECT customer_id, SUM(amount) total_debt, COUNT(*) debt_count, MAX(date) last_debt_at
        FROM debt_items WHERE owner_id = ? GROUP BY customer_id
      ) d ON d.customer_id = c.id
      LEFT JOIN (
        SELECT di.customer_id, SUM(p.amount) total_paid, MAX(p.paid_at) last_payment_at,
          (SELECT p2.amount FROM payments p2 JOIN debt_items d2 ON d2.id = p2.debt_item_id
           WHERE d2.customer_id = di.customer_id AND p2.owner_id = ? ORDER BY p2.paid_at DESC LIMIT 1) last_payment_amount
        FROM payments p JOIN debt_items di ON di.id = p.debt_item_id
        WHERE p.owner_id = ? GROUP BY di.customer_id
      ) p ON p.customer_id = c.id
      LEFT JOIN (
        SELECT customer_id, SUM(amount) credit FROM credit_transactions WHERE owner_id = ? GROUP BY customer_id
      ) cr ON cr.customer_id = c.id
      WHERE c.owner_id = ?
      ORDER BY CASE WHEN balance > 0 THEN 0 ELSE 1 END, balance DESC, c.name COLLATE NOCASE
    `).bind(owner, owner, owner, owner, owner).all();

    const debtRows = await env.DB.prepare(`
      SELECT d.id, d.customer_id, d.amount, d.created_at, d.date, d.invoice_no, d.item, d.cashier, d.qty,
        COALESCE(SUM(p.amount), 0) paid_amount
      FROM debt_items d LEFT JOIN payments p ON p.debt_item_id = d.id AND p.owner_id = ?
      WHERE d.owner_id = ? GROUP BY d.id ORDER BY d.date DESC, d.created_at DESC
    `).bind(owner, owner).all();

    const paymentRows = await env.DB.prepare(`
      SELECT p.id, p.debt_item_id, d.customer_id, p.amount, p.paid_at, p.received_by
      FROM payments p JOIN debt_items d ON d.id = p.debt_item_id
      WHERE p.owner_id = ? ORDER BY p.paid_at DESC
    `).bind(owner).all();

    const importSummary = await env.DB.prepare(`
      SELECT COUNT(*) import_count, COALESCE(SUM(row_count), 0) row_count, MAX(imported_at) last_import_at
      FROM import_batches WHERE owner_id = ?
    `).bind(owner).first();

    return Response.json({ ok: true, customers: customerRows.results, debts: debtRows.results, payments: paymentRows.results, importSummary });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return jsonError("Silakan masuk terlebih dahulu.", 401);
    console.error(error);
    return jsonError("Data piutang belum dapat dibuka.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const owner = await ownerId(request);
    if (!env.DB) return jsonError("Penyimpanan belum tersedia.", 503);
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "");

    if (action === "create_customer") {
      const name = String(body.name ?? "").trim();
      const phone = String(body.phone ?? "").trim();
      if (!name) return jsonError("Nama pelanggan wajib diisi.");
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO customers (id, owner_id, name, phone, created_at) VALUES (?, ?, ?, ?, ?)")
        .bind(id, owner, name, phone, new Date().toISOString()).run();
      return Response.json({ ok: true, id });
    }

    if (action === "create_debt") {
      const customerId = String(body.customerId ?? "");
      const amount = Math.round(Number(body.amount));
      const item = String(body.item ?? "").trim();
      const date = String(body.date ?? "");
      const customer = await env.DB.prepare("SELECT id FROM customers WHERE id = ? AND owner_id = ?").bind(customerId, owner).first();
      if (!customer) return jsonError("Pelanggan tidak ditemukan.", 404);
      if (!Number.isFinite(amount) || amount <= 0 || !item || !date) return jsonError("Lengkapi barang, tanggal, dan nominal piutang.");
      const id = crypto.randomUUID();
      await env.DB.prepare(`INSERT INTO debt_items
        (id, owner_id, customer_id, amount, created_at, date, invoice_no, item, cashier, qty)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, owner, customerId, amount, new Date().toISOString(), date, String(body.invoiceNo ?? ""), item, String(body.cashier ?? ""), Math.max(1, Math.round(Number(body.qty) || 1))).run();
      return Response.json({ ok: true, id });
    }

    if (action === "create_payment") {
      const customerId = String(body.customerId ?? "");
      let remaining = Math.round(Number(body.amount));
      if (!Number.isFinite(remaining) || remaining <= 0) return jsonError("Nominal pembayaran harus lebih dari nol.");
      const openDebts = await env.DB.prepare(`
        SELECT d.id, d.amount - COALESCE(SUM(p.amount), 0) remaining
        FROM debt_items d LEFT JOIN payments p ON p.debt_item_id = d.id
        WHERE d.owner_id = ? AND d.customer_id = ? GROUP BY d.id HAVING remaining > 0 ORDER BY d.date ASC
      `).bind(owner, customerId).all<{ id: string; remaining: number }>();
      if (!openDebts.results.length) return jsonError("Pelanggan ini tidak mempunyai piutang terbuka.");
      const statements = [];
      for (const debt of openDebts.results) {
        if (remaining <= 0) break;
        const paid = Math.min(remaining, Number(debt.remaining));
        statements.push(env.DB.prepare("INSERT INTO payments (id, owner_id, debt_item_id, amount, paid_at, received_by) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(crypto.randomUUID(), owner, debt.id, paid, new Date().toISOString(), String(body.receivedBy ?? "")));
        remaining -= paid;
      }
      await env.DB.batch(statements);
      return Response.json({ ok: true, overpayment: remaining });
    }

    return jsonError("Tindakan tidak dikenal.");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return jsonError("Silakan masuk terlebih dahulu.", 401);
    console.error(error);
    return jsonError("Perubahan belum dapat disimpan.", 500);
  }
}
