import type { Debt, DebtDraft } from "./types";
export const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
export const receiptNumber = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});
export const RECEIPT_WIDTH = 28;
export const shortDate = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : shortDate.format(date);
}

export function asNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
// crypto.randomUUID hanya tersedia di konteks aman (HTTPS/localhost).
// Saat diakses lewat HTTP biasa (mis. IP Tailscale) fungsinya undefined,
// jadi pakai getRandomValues yang tersedia di semua konteks.
export function uuid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function newDebtDraft(): DebtDraft {
  return {
    id: uuid(),
    item: "",
    qty: "1",
    unitPrice: "",
    wholesaleTotal: "",
    discount: "",
    priceMode: "retail",
  };
}
export function debtPricing(
  debt: Pick<
    Debt,
    "amount" | "qty" | "unit_price" | "wholesale_price" | "price_mode"
  >,
) {
  const savedPrice =
    debt.price_mode === "wholesale"
      ? debt.wholesale_price
      : debt.unit_price;
  if (savedPrice == null) {
    return {
      unitPrice: debt.amount / Math.max(1, debt.qty),
      grossAmount: debt.amount,
      discount: 0,
    };
  }
  const grossAmount = Math.max(0, debt.qty * savedPrice);
  return {
    unitPrice: savedPrice,
    grossAmount,
    discount: Math.max(0, grossAmount - debt.amount),
  };
}
export function receiptDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year.slice(-2)}` : value;
}
export function receiptDivider(character: "=" | "-") {
  return character.repeat(RECEIPT_WIDTH);
}
export function receiptRow(left: string, right: string, width = RECEIPT_WIDTH) {
  return `${left}${" ".repeat(Math.max(1, width - left.length - right.length))}${right}`;
}
export function whatsappNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}
