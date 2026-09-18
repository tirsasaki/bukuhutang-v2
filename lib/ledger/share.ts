import { receiptDate, receiptNumber, receiptRow, rupiah } from "./format";
import type { Customer, Debt, ShareStyle, StoreInformation } from "./types";
export function buildShareMessages(
  selected: Customer | null,
  selectedDebts: Debt[],
  store: StoreInformation,
): Record<ShareStyle, string> {
  if (!selected) return { formal: "", detailed: "", friendly: "" };
  const openDebts = selectedDebts.filter(
    (debt) => debt.amount - debt.paid_amount > 0,
  );
  const creditNote =
    selected.credit_balance > 0
      ? `\nSaldo kelebihan bayar tersedia: ${rupiah.format(selected.credit_balance)}.`
      : "";
  const receiptGroups = new Map<string, Debt[]>();
  [...openDebts]
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.created_at.localeCompare(b.created_at),
    )
    .forEach((debt) => {
      const key = `${debt.invoice_no || "TANPA NOTA"}|${debt.date}`;
      receiptGroups.set(key, [...(receiptGroups.get(key) ?? []), debt]);
    });
  const receiptSections = [...receiptGroups.values()]
    .map((debts) => {
      const first = debts[0];
      const lines = debts.flatMap((debt) => {
        const unitPrice =
          debt.price_mode === "wholesale"
            ? debt.wholesale_price
            : debt.unit_price;
        const calculatedPrice =
          unitPrice ?? Math.round(debt.amount / Math.max(1, debt.qty));
        const remaining = debt.amount - debt.paid_amount;
        const itemLines = [
          (debt.item || "PIUTANG").toUpperCase(),
          receiptRow(
            ` ${debt.qty} x ${receiptNumber.format(calculatedPrice)}`,
            receiptNumber.format(debt.amount),
          ),
        ];
        if (debt.paid_amount > 0)
          itemLines.push(receiptRow(" SISA", receiptNumber.format(remaining)));
        return itemLines;
      });
      return [
        `INV  : ${first.invoice_no || "TANPA NOTA"}`,
        `TGL  : ${receiptDate(first.date)}`,
        ...lines,
      ].join("\n");
    })
    .join("\n\n");
  const receipt = [
    "STRUK TAGIHAN",
    "==================================",
    store.name.toUpperCase(),
    ...(store.address ? [store.address.toUpperCase()] : []),
    "----------------------------------",
    `NAMA : ${selected.name.toUpperCase()}`,
    "----------------------------------",
    receiptSections || "TIDAK ADA PIUTANG TERBUKA",
    "----------------------------------",
    receiptRow("TOTAL SISA", `Rp ${receiptNumber.format(selected.balance)}`),
    `STATUS: ${selected.balance > 0 ? "BELUM LUNAS" : "LUNAS"}`,
    ...(selected.credit_balance > 0
      ? [
          receiptRow(
            "SALDO TERSIMPAN",
            `Rp ${receiptNumber.format(selected.credit_balance)}`,
          ),
        ]
      : []),
    "==================================",
  ].join("\n");
  return {
    formal: `Yth. Bapak/Ibu ${selected.name},\n\nKami menyampaikan informasi saldo piutang Anda di ${store.name}.\nTotal sisa piutang: ${rupiah.format(selected.balance)}.${creditNote}\n\nMohon pembayaran dapat dilakukan saat memungkinkan. Jika sudah melakukan pembayaran, silakan abaikan pesan ini.\n\nTerima kasih.\n${store.name}${store.address ? `\n${store.address}` : ""}`,
    detailed: `\`\`\`\n${receipt}\n\`\`\``,
    friendly: `Halo Kak ${selected.name} 👋\n\nSemoga kabarnya baik. Kami ingin mengingatkan bahwa masih ada sisa piutang sebesar ${rupiah.format(selected.balance)} di ${store.name}.${creditNote}\n\nBoleh dibayarkan saat sudah memungkinkan, ya. Jika sudah membayar, pesan ini dapat diabaikan. Terima kasih banyak 🙏\n\n${store.name}`,
  };
}
