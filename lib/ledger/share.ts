import {
  debtPricing,
  receiptDate,
  receiptNumber,
  receiptRow,
  rupiah,
} from "./format";
import type {
  Customer,
  Debt,
  ShareDisplayOptions,
  ShareStyle,
  StoreInformation,
} from "./types";
export function buildShareMessages(
  selected: Customer | null,
  selectedDebts: Debt[],
  store: StoreInformation,
  options: ShareDisplayOptions = {
    storeName: true,
    storeAddress: true,
    invoiceNumber: true,
    customerName: true,
  },
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
        const { unitPrice, grossAmount, discount } = debtPricing(debt);
        const remaining = debt.amount - debt.paid_amount;
        const itemLines = [
          (debt.item || "PIUTANG").toUpperCase(),
          receiptRow(
            ` ${debt.qty} x ${receiptNumber.format(unitPrice)}`,
            receiptNumber.format(discount > 0 ? grossAmount : debt.amount),
          ),
        ];
        if (discount > 0) {
          itemLines.push(
            receiptRow(" DISKON", `-${receiptNumber.format(discount)}`),
            receiptRow(" SUBTOTAL", receiptNumber.format(debt.amount)),
          );
        }
        if (debt.paid_amount > 0)
          itemLines.push(receiptRow(" SISA", receiptNumber.format(remaining)));
        return itemLines;
      });
      return [
        ...(options.invoiceNumber
          ? [`INV  : ${first.invoice_no || "TANPA NOTA"}`]
          : []),
        `TGL  : ${receiptDate(first.date)}`,
        ...lines,
      ].join("\n");
    })
    .join("\n\n");
  const informativeSections = [...receiptGroups.values()]
    .map((debts) => {
      const first = debts[0];
      const heading = [
        options.invoiceNumber
          ? `Nota ${first.invoice_no || "tanpa nomor"}`
          : null,
        `tanggal ${receiptDate(first.date)}`,
      ]
        .filter(Boolean)
        .join(" · ");
      const lines = debts.map((debt) => {
        const { unitPrice, grossAmount, discount } = debtPricing(debt);
        const remaining = debt.amount - debt.paid_amount;
        const paymentNote =
          debt.paid_amount > 0
            ? `; sudah dibayar ${rupiah.format(debt.paid_amount)}, sisa ${rupiah.format(remaining)}`
            : "";
        const priceDetail =
          discount > 0
            ? `${debt.qty} × ${rupiah.format(unitPrice)} = ${rupiah.format(grossAmount)}; diskon ${rupiah.format(discount)}; subtotal ${rupiah.format(debt.amount)}`
            : `${debt.qty} × ${rupiah.format(unitPrice)} = ${rupiah.format(debt.amount)}`;
        return `• ${debt.item || "Piutang"}: ${priceDetail}${paymentNote}`;
      });
      return `${heading}\n${lines.join("\n")}`;
    })
    .join("\n\n");
  const shownStoreName = options.storeName ? store.name : "";
  const shownCustomerName = options.customerName ? selected.name : "";
  const customerGreeting = shownCustomerName ? ` ${shownCustomerName}` : "";
  const storeContext = shownStoreName ? ` di ${shownStoreName}` : "";
  const storeSignature = [
    shownStoreName,
    options.storeAddress ? store.address : "",
  ]
    .filter(Boolean)
    .join("\n");
  const receipt = [
    "STRUK TAGIHAN",
    "==================================",
    ...(shownStoreName ? [shownStoreName.toUpperCase()] : []),
    ...(options.storeAddress && store.address
      ? [store.address.toUpperCase()]
      : []),
    ...(shownStoreName || (options.storeAddress && store.address)
      ? ["----------------------------------"]
      : []),
    ...(shownCustomerName
      ? [
          `NAMA : ${shownCustomerName.toUpperCase()}`,
          "----------------------------------",
        ]
      : []),
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
    formal: `Halo${customerGreeting} 👋\n\nBerikut rincian piutangnya${storeContext}:\n\n${informativeSections || "Tidak ada piutang terbuka."}\n\nTotal sisa piutang: ${rupiah.format(selected.balance)}.${creditNote}\n\nBisa dibayarkan saat sudah memungkinkan, ya. Kalau ada rincian yang ingin ditanyakan, silakan kabari kami. Terima kasih 🙏${storeSignature ? `\n\n${storeSignature}` : ""}`,
    detailed: `\`\`\`\n${receipt}\n\`\`\``,
    friendly: `Hai${customerGreeting} 👋\n\nMau mengingatkan, masih ada piutang${storeContext} dengan rincian berikut:\n\n${informativeSections || "Tidak ada piutang terbuka."}\n\nTotal sisanya ${rupiah.format(selected.balance)}.${creditNote}\n\nBoleh dibayarkan saat sudah memungkinkan, ya. Kalau sudah membayar atau ada rincian yang perlu dicek, kabari kami saja. Terima kasih banyak 🙏${storeSignature ? `\n\n${storeSignature}` : ""}`,
  };
}
