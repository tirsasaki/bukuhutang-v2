"use client";
import type { PostAction } from "@/lib/ledger/types";
import { useEffect } from "react";
export function useLedgerTools(
  customerCount: number,
  openBalance: number,
  needsFollowUp: number,
  postAction: PostAction,
) {
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options?: { signal?: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: unknown) => {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => undefined);
      } catch {
        /* Dukungan bersifat opsional. */
      }
    };
    register({
      name: "get_debt_summary",
      title: "Lihat ringkasan piutang",
      description:
        "Membaca jumlah pelanggan dan total sisa piutang yang sedang tampil.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async () => ({
        customerCount: customerCount,
        openBalance,
        needsFollowUp,
      }),
    });
    register({
      name: "create_customer",
      title: "Tambah pelanggan",
      description: "Menambahkan pelanggan baru ke buku piutang.",
      inputSchema: {
        type: "object",
        properties: { name: { type: "string" }, phone: { type: "string" } },
        required: ["name"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input: { name: string; phone?: string }) =>
        postAction({ action: "create_customer", ...input }),
    });
    register({
      name: "update_customer",
      title: "Ubah data pelanggan",
      description: "Mengubah nama dan nomor WhatsApp pelanggan yang sudah ada.",
      inputSchema: {
        type: "object",
        properties: {
          customerId: { type: "string" },
          name: { type: "string" },
          phone: { type: "string" },
        },
        required: ["customerId", "name"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input: {
        customerId: string;
        name: string;
        phone?: string;
      }) => postAction({ action: "update_customer", ...input }),
    });
    register({
      name: "record_debt",
      title: "Catat piutang",
      description:
        "Mencatat satu barang dalam nota piutang baru. Nomor nota dibuat otomatis.",
      inputSchema: {
        type: "object",
        properties: {
          customerId: { type: "string" },
          item: { type: "string" },
          qty: { type: "number" },
          unitPrice: { type: "number" },
          wholesalePrice: { type: "number" },
          priceMode: { type: "string", enum: ["retail", "wholesale"] },
          date: { type: "string" },
          cashier: { type: "string" },
        },
        required: ["customerId", "item", "qty", "unitPrice", "date"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input: Record<string, unknown>) =>
        postAction({ action: "create_debt", ...input }),
    });
    register({
      name: "record_payment",
      title: "Catat pembayaran",
      description:
        "Mencatat pembayaran sebagian atau melunasi seluruh piutang. Saldo kelebihan hanya digunakan jika creditAmount diisi.",
      inputSchema: {
        type: "object",
        properties: {
          customerId: { type: "string" },
          amount: {
            type: "number",
            description: "Jumlah uang tunai yang diterima",
          },
          creditAmount: {
            type: "number",
            description: "Saldo kelebihan bayar yang sengaja digunakan",
          },
          receivedBy: { type: "string" },
          payAll: { type: "boolean" },
        },
        required: ["customerId", "amount", "receivedBy"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input: Record<string, unknown>) =>
        postAction({ action: "create_payment", ...input }),
    });
    return () => lifecycle.abort();
  }, [customerCount, needsFollowUp, openBalance, postAction]);
}
