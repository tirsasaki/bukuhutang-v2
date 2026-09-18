import type { DebtDraft } from "./types";
export const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
export const receiptNumber = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});
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
export function newDebtDraft(): DebtDraft {
  return {
    id: crypto.randomUUID(),
    item: "",
    qty: "1",
    unitPrice: "",
    wholesalePrice: "",
    priceMode: "retail",
  };
}
export function receiptDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year.slice(-2)}` : value;
}
export function receiptRow(left: string, right: string, width = 34) {
  return `${left}${" ".repeat(Math.max(1, width - left.length - right.length))}${right}`;
}
export function whatsappNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}
