"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDownToLine, BookOpenText, CheckCircle2, ChevronRight, CircleDollarSign, Clock3, Copy, Loader2, LogOut, MessageCircle, PencilLine, Plus, Search, Settings2, Share2, Trash2, UploadCloud, UserPlus, UsersRound, WalletCards } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Customer = { id: string; name: string; phone: string; created_at: string; balance: number; credit_balance: number; debt_count: number; last_debt_at: string | null; last_payment_at: string | null; last_payment_amount: number; last_activity_at: string };
type Debt = { id: string; customer_id: string; amount: number; paid_amount: number; created_at: string; date: string; invoice_no: string; item: string; cashier: string; qty: number; unit_price: number | null; wholesale_price: number | null; price_mode: "retail" | "wholesale"; invoice_id: string | null };
type Payment = { id: string; debt_item_id: string; customer_id: string; amount: number; paid_at: string; received_by: string; source: "cash" | "credit" };
type Cashier = { id: string; name: string; phone: string; is_active: boolean };
type StoreInformation = { name: string; address: string };
type LedgerData = { customers: Customer[]; debts: Debt[]; payments: Payment[]; cashiers: Cashier[]; store: StoreInformation; importSummary?: { import_count?: number; row_count?: number; last_import_at?: string | null } };
type DebtDraft = { id: string; item: string; qty: string; unitPrice: string; wholesalePrice: string; priceMode: "retail" | "wholesale" };
type ShareStyle = "formal" | "detailed" | "friendly";

const emptyData: LedgerData = { customers: [], debts: [], payments: [], cashiers: [], store: { name: "Toko Anda", address: "" } };
const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const receiptNumber = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const shortDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : shortDate.format(date);
}

function asNumber(value: unknown) { const number = Number(value); return Number.isFinite(number) ? number : 0; }
function newDebtDraft(): DebtDraft { return { id: crypto.randomUUID(), item: "", qty: "1", unitPrice: "", wholesalePrice: "", priceMode: "retail" }; }
function receiptDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year.slice(-2)}` : value;
}
function receiptRow(left: string, right: string, width = 34) {
  return `${left}${" ".repeat(Math.max(1, width - left.length - right.length))}${right}`;
}
function whatsappNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export default function Home() {
  const router = useRouter();
  const [data, setData] = useState<LedgerData>(emptyData);
  const [selectedId, setSelectedId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [customerSort, setCustomerSort] = useState<"latest" | "oldest" | "largest" | "smallest">("latest");
  const [customerStatus, setCustomerStatus] = useState<"all" | "unpaid" | "paid">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [debtOpen, setDebtOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStyle, setShareStyle] = useState<ShareStyle>("formal");
  const [paymentMode, setPaymentMode] = useState<"partial" | "all">("partial");
  const [useCredit, setUseCredit] = useState(false);
  const [paymentCashAmount, setPaymentCashAmount] = useState("");
  const [paymentCreditAmount, setPaymentCreditAmount] = useState("0");
  const [invoiceItems, setInvoiceItems] = useState<DebtDraft[]>(() => [newDebtDraft()]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const loadData = useCallback(async () => {
    try {
      const response = await fetch("/api/ledger", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Data tidak dapat dibuka.");
      const normalized: LedgerData = {
        customers: result.customers.map((row: Customer) => ({ ...row, balance: asNumber(row.balance), credit_balance: asNumber(row.credit_balance), debt_count: asNumber(row.debt_count), last_payment_amount: asNumber(row.last_payment_amount) })),
        debts: result.debts.map((row: Debt) => ({ ...row, amount: asNumber(row.amount), paid_amount: asNumber(row.paid_amount), qty: asNumber(row.qty), unit_price: row.unit_price == null ? null : asNumber(row.unit_price), wholesale_price: row.wholesale_price == null ? null : asNumber(row.wholesale_price) })),
        payments: result.payments.map((row: Payment) => ({ ...row, amount: asNumber(row.amount) })),
        cashiers: result.cashiers ?? [],
        store: result.store ?? { name: "Toko Anda", address: "" },
        importSummary: result.importSummary,
      };
      setData(normalized);
      setSelectedId((current) => current && normalized.customers.some((customer) => customer.id === current) ? current : normalized.customers[0]?.id ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Data tidak dapat dibuka.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const selected = data.customers.find((customer) => customer.id === selectedId) ?? null;
  const visibleCustomers = useMemo(() => data.customers
    .filter((customer) => `${customer.name} ${customer.phone}`.toLowerCase().includes(query.toLowerCase()))
    .filter((customer) => customerStatus === "all" || (customerStatus === "unpaid" ? customer.balance > 0 : customer.balance <= 0))
    .sort((a, b) => {
      if (customerSort === "largest") return b.balance - a.balance || a.name.localeCompare(b.name, "id");
      if (customerSort === "smallest") return a.balance - b.balance || a.name.localeCompare(b.name, "id");
      const activityA = new Date(a.last_activity_at).getTime();
      const activityB = new Date(b.last_activity_at).getTime();
      return customerSort === "oldest" ? activityA - activityB : activityB - activityA;
    }), [customerSort, customerStatus, data.customers, query]);
  const selectedDebts = useMemo(() => data.debts.filter((debt) => debt.customer_id === selectedId).sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)), [data.debts, selectedId]);
  const selectedPayments = useMemo(() => data.payments.filter((payment) => payment.customer_id === selectedId).sort((a, b) => b.paid_at.localeCompare(a.paid_at)), [data.payments, selectedId]);
  const oldestOpenDebt = useMemo(() => [...selectedDebts]
    .filter((debt) => debt.amount - debt.paid_amount > 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))[0] ?? null, [selectedDebts]);
  const shareMessages = useMemo<Record<ShareStyle, string>>(() => {
    if (!selected) return { formal: "", detailed: "", friendly: "" };
    const openDebts = selectedDebts.filter((debt) => debt.amount - debt.paid_amount > 0);
    const creditNote = selected.credit_balance > 0 ? `\nSaldo kelebihan bayar tersedia: ${rupiah.format(selected.credit_balance)}.` : "";
    const receiptGroups = new Map<string, Debt[]>();
    [...openDebts].sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at)).forEach((debt) => {
      const key = `${debt.invoice_no || "TANPA NOTA"}|${debt.date}`;
      receiptGroups.set(key, [...(receiptGroups.get(key) ?? []), debt]);
    });
    const receiptSections = [...receiptGroups.values()].map((debts) => {
      const first = debts[0];
      const lines = debts.flatMap((debt) => {
        const unitPrice = debt.price_mode === "wholesale" ? debt.wholesale_price : debt.unit_price;
        const calculatedPrice = unitPrice ?? Math.round(debt.amount / Math.max(1, debt.qty));
        const remaining = debt.amount - debt.paid_amount;
        const itemLines = [
          (debt.item || "PIUTANG").toUpperCase(),
          receiptRow(` ${debt.qty} x ${receiptNumber.format(calculatedPrice)}`, receiptNumber.format(debt.amount)),
        ];
        if (debt.paid_amount > 0) itemLines.push(receiptRow(" SISA", receiptNumber.format(remaining)));
        return itemLines;
      });
      return [`INV  : ${first.invoice_no || "TANPA NOTA"}`, `TGL  : ${receiptDate(first.date)}`, ...lines].join("\n");
    }).join("\n\n");
    const receipt = [
      "STRUK TAGIHAN",
      "==================================",
      data.store.name.toUpperCase(),
      ...(data.store.address ? [data.store.address.toUpperCase()] : []),
      "----------------------------------",
      `NAMA : ${selected.name.toUpperCase()}`,
      "----------------------------------",
      receiptSections || "TIDAK ADA PIUTANG TERBUKA",
      "----------------------------------",
      receiptRow("TOTAL SISA", `Rp ${receiptNumber.format(selected.balance)}`),
      `STATUS: ${selected.balance > 0 ? "BELUM LUNAS" : "LUNAS"}`,
      ...(selected.credit_balance > 0 ? [receiptRow("SALDO TERSIMPAN", `Rp ${receiptNumber.format(selected.credit_balance)}`)] : []),
      "==================================",
    ].join("\n");
    return {
      formal: `Yth. Bapak/Ibu ${selected.name},\n\nKami menyampaikan informasi saldo piutang Anda di ${data.store.name}.\nTotal sisa piutang: ${rupiah.format(selected.balance)}.${creditNote}\n\nMohon pembayaran dapat dilakukan saat memungkinkan. Jika sudah melakukan pembayaran, silakan abaikan pesan ini.\n\nTerima kasih.\n${data.store.name}${data.store.address ? `\n${data.store.address}` : ""}`,
      detailed: `\`\`\`\n${receipt}\n\`\`\``,
      friendly: `Halo Kak ${selected.name} 👋\n\nSemoga kabarnya baik. Kami ingin mengingatkan bahwa masih ada sisa piutang sebesar ${rupiah.format(selected.balance)} di ${data.store.name}.${creditNote}\n\nBoleh dibayarkan saat sudah memungkinkan, ya. Jika sudah membayar, pesan ini dapat diabaikan. Terima kasih banyak 🙏\n\n${data.store.name}`,
    };
  }, [data.store, selected, selectedDebts]);
  const shareMessage = shareMessages[shareStyle];
  const openBalance = data.customers.reduce((total, customer) => total + Math.max(0, customer.balance), 0);
  const paidThisMonth = data.payments.filter((payment) => payment.source !== "credit" && payment.paid_at.slice(0, 7) === new Date().toISOString().slice(0, 7)).reduce((total, payment) => total + payment.amount, 0);
  const needsFollowUp = data.customers.filter((customer) => customer.balance > 0).length;
  const activeCashiers = data.cashiers.filter((cashier) => cashier.is_active);
  const invoiceTotal = useMemo(() => invoiceItems.reduce((total, row) => {
    const qty = Math.max(0, Math.round(asNumber(row.qty)));
    const price = row.priceMode === "wholesale" ? asNumber(row.wholesalePrice) : asNumber(row.unitPrice);
    return total + qty * Math.max(0, price);
  }, 0), [invoiceItems]);

  const postAction = useCallback(async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/ledger", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || "Perubahan belum tersimpan.");
    await loadData();
    return result;
  }, [loadData]);

  async function submitForm(event: React.FormEvent<HTMLFormElement>, action: string, close: () => void) {
    event.preventDefault();
    setSaving(true);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const result = await postAction({ action, ...values, customerId: action === "create_customer" ? undefined : selectedId });
      if (action === "create_payment") {
        const message = values.payAll === "true"
          ? asNumber(result.overpayment) > 0
            ? `Piutang lunas · kelebihan ${rupiah.format(asNumber(result.overpayment))} dicatat sebagai saldo pelanggan.`
            : `Seluruh piutang ${selected?.name ?? "pelanggan"} sudah lunas.`
          : `Pembayaran ${rupiah.format(asNumber(result.paidAmount) + asNumber(result.creditUsed))} tersimpan${asNumber(result.settledCount) ? ` · ${asNumber(result.settledCount)} piutang lama lunas` : ""}.`;
        toast.success(message);
      } else {
        toast.success(action === "create_debt" ? "Piutang baru tersimpan." : action === "update_customer" ? "Data pelanggan diperbarui." : "Pelanggan ditambahkan.");
      }
      close();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Perubahan belum tersimpan."); }
    finally { setSaving(false); }
  }

  function updateInvoiceItem(id: string, values: Partial<DebtDraft>) {
    setInvoiceItems((current) => current.map((row) => row.id === id ? { ...row, ...values } : row));
  }

  async function submitDebtInvoice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const result = await postAction({
        action: "create_debt",
        customerId: selected.id,
        date: values.date,
        cashier: values.cashier,
        items: invoiceItems.map(({ item, qty, unitPrice, wholesalePrice, priceMode }) => ({ item, qty, unitPrice, wholesalePrice, priceMode })),
      });
      toast.success(`Piutang ${result.invoiceNo} berhasil ditambahkan · ${rupiah.format(asNumber(result.total))}`);
      setDebtOpen(false);
      setInvoiceItems([newDebtDraft()]);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Piutang belum tersimpan."); }
    finally { setSaving(false); }
  }

  async function copyDebtDetails() {
    try {
      await navigator.clipboard.writeText(shareMessage);
      toast.success("Rincian piutang berhasil disalin.");
    } catch {
      toast.error("Rincian belum dapat disalin. Pilih teks lalu salin secara manual.");
    }
  }

  function openWhatsApp() {
    if (!selected) return;
    const phone = whatsappNumber(selected.phone);
    if (!phone) {
      toast.error("Nomor WhatsApp pelanggan belum diisi.");
      return;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(shareMessage)}`, "_blank", "noopener,noreferrer");
  }

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    setSaving(true);
    let imported = 0;
    let duplicates = 0;
    try {
      for (const file of Array.from(files)) {
        const raw = await file.text();
        const response = await fetch("/api/import", { method: "POST", headers: { "content-type": "application/json" }, body: raw });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(`${file.name}: ${result.message || "gagal diimpor"}`);
        if (result.duplicate) duplicates += 1; else imported += Number(result.imported || 0);
      }
      await loadData();
      toast.success(imported ? `${imported} catatan berhasil dipulihkan.` : `${duplicates} cadangan sudah pernah diimpor.`);
      setImportOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Cadangan belum dapat dipulihkan."); }
    finally { setSaving(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => unknown } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: unknown) => { try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined); } catch { /* Dukungan bersifat opsional. */ } };
    register({ name: "get_debt_summary", title: "Lihat ringkasan piutang", description: "Membaca jumlah pelanggan dan total sisa piutang yang sedang tampil.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: async () => ({ customerCount: data.customers.length, openBalance, needsFollowUp }) });
    register({ name: "create_customer", title: "Tambah pelanggan", description: "Menambahkan pelanggan baru ke buku piutang.", inputSchema: { type: "object", properties: { name: { type: "string" }, phone: { type: "string" } }, required: ["name"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async (input: { name: string; phone?: string }) => postAction({ action: "create_customer", ...input }) });
    register({ name: "update_customer", title: "Ubah data pelanggan", description: "Mengubah nama dan nomor WhatsApp pelanggan yang sudah ada.", inputSchema: { type: "object", properties: { customerId: { type: "string" }, name: { type: "string" }, phone: { type: "string" } }, required: ["customerId", "name"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async (input: { customerId: string; name: string; phone?: string }) => postAction({ action: "update_customer", ...input }) });
    register({ name: "record_debt", title: "Catat piutang", description: "Mencatat satu barang dalam nota piutang baru. Nomor nota dibuat otomatis.", inputSchema: { type: "object", properties: { customerId: { type: "string" }, item: { type: "string" }, qty: { type: "number" }, unitPrice: { type: "number" }, wholesalePrice: { type: "number" }, priceMode: { type: "string", enum: ["retail", "wholesale"] }, date: { type: "string" }, cashier: { type: "string" } }, required: ["customerId", "item", "qty", "unitPrice", "date"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async (input: Record<string, unknown>) => postAction({ action: "create_debt", ...input }) });
    register({ name: "record_payment", title: "Catat pembayaran", description: "Mencatat pembayaran sebagian atau melunasi seluruh piutang. Saldo kelebihan hanya digunakan jika creditAmount diisi.", inputSchema: { type: "object", properties: { customerId: { type: "string" }, amount: { type: "number", description: "Jumlah uang tunai yang diterima" }, creditAmount: { type: "number", description: "Saldo kelebihan bayar yang sengaja digunakan" }, receivedBy: { type: "string" }, payAll: { type: "boolean" } }, required: ["customerId", "amount", "receivedBy"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async (input: Record<string, unknown>) => postAction({ action: "create_payment", ...input }) });
    return () => lifecycle.abort();
  }, [data.customers.length, needsFollowUp, openBalance, postAction]);

  const summaryCards = [
    ["Total belum lunas", rupiah.format(openBalance), CircleDollarSign, `${needsFollowUp} pelanggan`],
    ["Perlu ditagih", String(needsFollowUp), Clock3, needsFollowUp ? "Masih memiliki saldo" : "Semua lunas"],
    ["Pembayaran bulan ini", rupiah.format(paidThisMonth), WalletCards, `${data.payments.filter((p) => p.source !== "credit" && p.paid_at.slice(0, 7) === new Date().toISOString().slice(0, 7)).length} transaksi`],
    ["Catatan dipulihkan", String(asNumber(data.importSummary?.row_count)), ArrowDownToLine, `${asNumber(data.importSummary?.import_count)} berkas cadangan`],
  ] as const;

  return (
    <main className="min-h-screen bg-background text-foreground lg:h-screen lg:overflow-hidden">
      <Toaster richColors position="top-right" />
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
        <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><BookOpenText className="size-5" /></div><div><p className="text-base font-bold leading-tight tracking-tight">Buku Piutang</p><p className="text-xs text-muted-foreground">{data.store.name}</p></div></div>
        <div className="flex items-center gap-2"><Button variant="outline" size="sm" className="hidden gap-2 sm:flex" onClick={() => setImportOpen(true)}><ArrowDownToLine className="size-4" /> Impor cadangan</Button><Button asChild variant="ghost" size="icon-sm"><Link href="/pengaturan" aria-label="Buka pengaturan toko" title="Pengaturan toko"><Settings2 className="size-4" /></Link></Button><Button variant="ghost" size="icon-sm" aria-label="Keluar dari akun" title="Keluar" onClick={() => void signOut()}><LogOut className="size-4" /></Button><Button size="sm" className="gap-2 shadow-sm" disabled={!selected} onClick={() => setDebtOpen(true)}><Plus className="size-4" /> Catat piutang</Button></div>
      </header>

      <section className="grid border-b border-border bg-card px-4 py-3 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        {summaryCards.map(([label, value, Icon, note]) => <div key={label} className="flex items-center gap-3 border-border px-2 py-2 first:pl-0 lg:border-r lg:px-5 lg:first:pl-0 lg:last:border-r-0"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Icon className="size-5" /></div><div className="min-w-0"><p className="truncate text-xs font-medium text-muted-foreground">{label}</p><p className="truncate text-lg font-bold tracking-tight">{value}</p><p className="text-xs text-muted-foreground">{note}</p></div></div>)}
      </section>

      <div className="grid lg:h-[calc(100vh-153px)] lg:grid-cols-[400px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-card lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="sticky top-0 z-10 space-y-3 border-b border-border bg-card/95 p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><UsersRound className="size-5" /></div><div><h1 className="text-lg font-bold tracking-tight">Daftar pelanggan</h1><p className="text-xs text-muted-foreground">{data.customers.length} pelanggan tersimpan</p></div></div><Button size="sm" className="gap-2" onClick={() => setCustomerOpen(true)}><UserPlus className="size-4" /> Tambah</Button></div>
            <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama atau nomor WhatsApp…" className="h-10 rounded-xl bg-muted/40 pl-9" /></div>
            <div className="grid grid-cols-[1fr_auto] gap-2"><select value={customerSort} onChange={(event) => setCustomerSort(event.target.value as typeof customerSort)} aria-label="Urutkan pelanggan" className="h-9 min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"><option value="latest">Aktivitas terbaru</option><option value="oldest">Aktivitas terlama</option><option value="largest">Piutang terbesar</option><option value="smallest">Piutang terkecil</option></select><span className="flex h-9 items-center rounded-lg border border-border bg-muted/40 px-3 text-xs font-medium text-muted-foreground">{visibleCustomers.length} tampil</span></div>
            <div className="grid grid-cols-3 rounded-xl bg-muted p-1">{([{ id: "all", label: "Semua", count: data.customers.length }, { id: "unpaid", label: "Menunggak", count: data.customers.filter((customer) => customer.balance > 0).length }, { id: "paid", label: "Lunas", count: data.customers.filter((customer) => customer.balance <= 0).length }] as const).map((filter) => <button key={filter.id} type="button" onClick={() => setCustomerStatus(filter.id)} className={`rounded-lg px-2 py-2 text-xs font-semibold transition-all ${customerStatus === filter.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{filter.label} <span className="ml-1 opacity-70">{filter.count}</span></button>)}</div>
          </div>
          <div className="p-3">
            {!loading && visibleCustomers.length > 0 && <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><span>Pelanggan</span><span>Saldo piutang</span></div>}
            {loading && <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Membuka catatan…</div>}
            {!loading && !visibleCustomers.length && <div className="m-2 rounded-2xl border border-dashed p-8 text-center"><div className="mx-auto grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground"><UsersRound className="size-5" /></div><p className="mt-3 font-semibold">{data.customers.length ? "Pelanggan tidak ditemukan" : "Belum ada pelanggan"}</p><p className="mt-1 text-sm text-muted-foreground">{data.customers.length ? "Coba ubah pencarian atau pilihan status." : "Impor cadangan lama atau tambahkan pelanggan baru."}</p><div className="mt-4 flex justify-center gap-2">{data.customers.length ? <Button variant="outline" size="sm" onClick={() => { setQuery(""); setCustomerStatus("all"); }}>Tampilkan semua</Button> : <><Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>Impor</Button><Button size="sm" onClick={() => setCustomerOpen(true)}>Tambah</Button></>}</div></div>}
            <div className="space-y-2">{visibleCustomers.map((customer) => <button type="button" key={customer.id} onClick={() => setSelectedId(customer.id)} className={`group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-3 py-3.5 text-left transition-all ${selectedId === customer.id ? "border-primary/30 bg-secondary shadow-sm ring-1 ring-primary/10" : "border-border/70 bg-card hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-sm"}`}><span className={`grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold ${selectedId === customer.id ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>{customer.name.slice(0, 2).toUpperCase()}</span><span className="min-w-0"><span className="flex items-center gap-2"><span className="truncate font-semibold">{customer.name}</span><span className={`size-2 shrink-0 rounded-full ${customer.balance > 0 ? "bg-amber-500" : "bg-emerald-500"}`} /></span><span className="mt-1 block truncate text-xs text-muted-foreground">{customer.phone || "Nomor belum diisi"}</span><span className="mt-1.5 flex flex-wrap items-center gap-1.5"><span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{customer.debt_count} catatan</span><span className="text-[10px] text-muted-foreground">Aktif {formatDate(customer.last_activity_at)}</span>{customer.credit_balance > 0 && <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Saldo {rupiah.format(customer.credit_balance)}</span>}</span></span><span className="flex min-w-[105px] items-center justify-end gap-1"><span className="text-right"><span className={`block text-sm font-extrabold tracking-tight ${customer.balance > 0 ? "text-foreground" : "text-emerald-700"}`}>{rupiah.format(customer.balance)}</span><span className={`mt-1 block text-[10px] font-semibold uppercase tracking-wide ${customer.balance > 0 ? "text-amber-700" : "text-emerald-700"}`}>{customer.balance > 0 ? "Belum lunas" : "Lunas"}</span></span><ChevronRight className={`size-4 transition-transform group-hover:translate-x-0.5 ${selectedId === customer.id ? "text-primary" : "text-muted-foreground"}`} /></span></button>)}</div>
          </div>
        </aside>

        <section className="min-w-0 overflow-y-auto bg-muted/40 p-4 lg:p-6">
          {!selected ? <div className="grid min-h-[420px] place-items-center"><div className="max-w-sm text-center"><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-secondary text-primary"><UploadCloud className="size-8" /></div><h2 className="mt-4 text-xl font-bold">Pulihkan buku piutang lama</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Berkas dari repositori cadangan Anda sudah didukung. Pilih kedua berkas JSON; data yang sama akan dilewati otomatis.</p><Button className="mt-5" onClick={() => setImportOpen(true)}>Pilih cadangan JSON</Button></div></div> : (
            <div className="mx-auto max-w-6xl">
              <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-2xl bg-primary text-base font-bold text-primary-foreground">{selected.name.slice(0, 2).toUpperCase()}</div><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-bold tracking-tight">{selected.name}</h2>{selected.balance > 0 ? <Badge variant="destructive">Perlu ditagih</Badge> : <Badge className="bg-emerald-700">Lunas</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{selected.phone || "Nomor belum diisi"} · Sejak {formatDate(selected.created_at)}</p></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" className="gap-2" disabled={selected.balance <= 0} onClick={() => { setShareStyle("detailed"); setShareOpen(true); }}><Share2 className="size-4" /> Bagikan rincian</Button><Button variant="outline" onClick={() => setDebtOpen(true)}>Tambah piutang</Button><Button disabled={selected.balance <= 0} onClick={() => { setPaymentMode("partial"); setUseCredit(false); setPaymentCashAmount(""); setPaymentCreditAmount("0"); setPaymentOpen(true); }}>Catat pembayaran</Button></div></div>
              <div className="mb-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-border bg-card p-4 shadow-sm"><p className="text-sm text-muted-foreground">Sisa piutang</p><p className="mt-1 text-2xl font-extrabold tracking-tight">{rupiah.format(selected.balance)}</p>{selected.credit_balance > 0 && <p className="mt-1 text-xs font-medium text-emerald-700">Saldo kelebihan: {rupiah.format(selected.credit_balance)}</p>}</div><div className="rounded-2xl border border-border bg-card p-4 shadow-sm"><p className="text-sm text-muted-foreground">Piutang terakhir</p><p className="mt-1 text-lg font-bold">{formatDate(selected.last_debt_at)}</p></div><div className="rounded-2xl border border-border bg-card p-4 shadow-sm"><p className="text-sm text-muted-foreground">Pembayaran terakhir</p><p className="mt-1 text-lg font-bold">{selected.last_payment_at ? rupiah.format(selected.last_payment_amount) : "Belum ada"}</p></div></div>
              <Tabs defaultValue="ledger" className="rounded-2xl border border-border bg-card shadow-sm"><div className="flex flex-col justify-between gap-3 border-b border-border p-3 sm:flex-row sm:items-center"><TabsList><TabsTrigger value="ledger">Buku piutang</TabsTrigger><TabsTrigger value="payments">Pembayaran</TabsTrigger><TabsTrigger value="profile">Data pelanggan</TabsTrigger></TabsList><p className="px-2 text-sm text-muted-foreground">{selectedDebts.length + selectedPayments.length} transaksi</p></div>
                <TabsContent value="ledger" className="m-0"><Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Nota</TableHead><TableHead>Barang / keterangan</TableHead><TableHead className="text-right">Piutang</TableHead><TableHead className="text-right">Sisa</TableHead></TableRow></TableHeader><TableBody>{selectedDebts.map((debt) => { const appliedPrice = debt.price_mode === "wholesale" ? debt.wholesale_price : debt.unit_price; return <TableRow key={debt.id}><TableCell className="whitespace-nowrap">{formatDate(debt.date)}</TableCell><TableCell><Badge variant="outline">{debt.invoice_no || "Tanpa nota"}</Badge></TableCell><TableCell><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{debt.item || "Piutang"}</p>{debt.price_mode === "wholesale" && <Badge variant="secondary">Grosir</Badge>}</div><p className="text-xs text-muted-foreground">{debt.qty} × {rupiah.format(appliedPrice ?? debt.amount / Math.max(1, debt.qty))}{debt.cashier ? ` · ${debt.cashier}` : ""}</p></TableCell><TableCell className="text-right font-semibold">{rupiah.format(debt.amount)}</TableCell><TableCell className={`text-right font-semibold ${debt.amount - debt.paid_amount <= 0 ? "text-emerald-700" : ""}`}>{rupiah.format(debt.amount - debt.paid_amount)}</TableCell></TableRow>; })}</TableBody></Table>{!selectedDebts.length && <p className="p-8 text-center text-sm text-muted-foreground">Belum ada piutang untuk pelanggan ini.</p>}</TabsContent>
                <TabsContent value="payments" className="m-0"><Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Diterima oleh</TableHead><TableHead className="text-right">Nominal</TableHead></TableRow></TableHeader><TableBody>{selectedPayments.map((payment) => <TableRow key={payment.id}><TableCell>{formatDate(payment.paid_at)}</TableCell><TableCell>{payment.source === "credit" ? <span className="flex items-center gap-2"><Badge variant="secondary">Saldo kredit</Badge> Kelebihan bayar</span> : payment.received_by || "Tidak dicatat"}</TableCell><TableCell className="text-right font-semibold text-emerald-700">{rupiah.format(payment.amount)}</TableCell></TableRow>)}</TableBody></Table>{!selectedPayments.length && <p className="p-8 text-center text-sm text-muted-foreground">Belum ada pembayaran.</p>}</TabsContent>
                <TabsContent value="profile" className="p-6"><div className="mb-5 flex items-center justify-between gap-4"><div><h3 className="font-semibold">Informasi pelanggan</h3><p className="mt-1 text-sm text-muted-foreground">Nama dan nomor yang digunakan untuk menghubungi pelanggan.</p></div><Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => setEditCustomerOpen(true)}><PencilLine className="size-4" /> Ubah data</Button></div><dl className="grid gap-5 sm:grid-cols-2"><div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nama pelanggan</dt><dd className="mt-1 font-semibold">{selected.name}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nomor WhatsApp</dt><dd className="mt-1 font-semibold">{selected.phone || "Belum diisi"}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mulai tercatat</dt><dd className="mt-1 font-semibold">{formatDate(selected.created_at)}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Jumlah catatan</dt><dd className="mt-1 font-semibold">{selected.debt_count} piutang</dd></div></dl></TabsContent>
              </Tabs>
            </div>
          )}
        </section>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}><DialogContent><DialogHeader><DialogTitle>Pulihkan cadangan lama</DialogTitle><DialogDescription>Pilih satu atau beberapa berkas JSON dari folder <strong>backups</strong>. Identitas lama dipertahankan agar catatan ganda dapat dilewati dengan aman.</DialogDescription></DialogHeader><button type="button" onClick={() => fileRef.current?.click()} className="grid min-h-44 place-items-center rounded-2xl border-2 border-dashed border-border bg-muted/40 p-6 text-center transition-colors hover:border-primary/40 hover:bg-secondary/50"><span><UploadCloud className="mx-auto size-9 text-primary" /><span className="mt-3 block font-semibold">Pilih berkas cadangan JSON</span><span className="mt-1 block text-sm text-muted-foreground">Anda dapat memilih kedua berkas sekaligus</span></span></button><input ref={fileRef} type="file" accept="application/json,.json" multiple className="hidden" onChange={(event) => void importFiles(event.target.files)} /><div className="flex items-start gap-2 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0" /><p>Impor yang sama tidak akan menggandakan pelanggan, piutang, atau pembayaran.</p></div><DialogFooter><Button variant="outline" onClick={() => setImportOpen(false)}>Batal</Button><Button onClick={() => fileRef.current?.click()} disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Pilih berkas</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={customerOpen} onOpenChange={setCustomerOpen}><DialogContent><form onSubmit={(event) => void submitForm(event, "create_customer", () => setCustomerOpen(false))}><DialogHeader><DialogTitle>Tambah pelanggan</DialogTitle><DialogDescription>Simpan nama dan nomor yang dapat dihubungi.</DialogDescription></DialogHeader><div className="space-y-4 py-5"><div className="space-y-2"><Label htmlFor="name">Nama pelanggan</Label><Input id="name" name="name" required autoFocus /></div><div className="space-y-2"><Label htmlFor="phone">Nomor telepon</Label><Input id="phone" name="phone" inputMode="tel" /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setCustomerOpen(false)}>Batal</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Simpan</Button></DialogFooter></form></DialogContent></Dialog>

      <Dialog open={editCustomerOpen} onOpenChange={setEditCustomerOpen}><DialogContent><form key={selected?.id} onSubmit={(event) => void submitForm(event, "update_customer", () => setEditCustomerOpen(false))}><DialogHeader><DialogTitle>Ubah data pelanggan</DialogTitle><DialogDescription>Perbarui nama dan nomor WhatsApp tanpa mengubah riwayat piutang.</DialogDescription></DialogHeader><div className="space-y-4 py-5"><div className="space-y-2"><Label htmlFor="editName">Nama pelanggan</Label><Input id="editName" name="name" defaultValue={selected?.name ?? ""} maxLength={100} required autoFocus /></div><div className="space-y-2"><Label htmlFor="editPhone">Nomor WhatsApp</Label><Input id="editPhone" name="phone" defaultValue={selected?.phone ?? ""} maxLength={30} inputMode="tel" placeholder="Contoh: 0812 3456 7890" /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setEditCustomerOpen(false)}>Batal</Button><Button type="submit" disabled={saving || !selected}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Simpan perubahan</Button></DialogFooter></form></DialogContent></Dialog>

      <Dialog open={debtOpen} onOpenChange={setDebtOpen}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl"><form onSubmit={(event) => void submitDebtInvoice(event)}><DialogHeader><DialogTitle>Catat piutang {selected?.name}</DialogTitle><DialogDescription>Tambahkan seluruh barang dalam satu nota. Nomor nota akan dibuat otomatis saat disimpan.</DialogDescription></DialogHeader><div className="space-y-5 py-5"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="date">Tanggal nota</Label><Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div><div className="space-y-2"><Label htmlFor="cashier">Kasir</Label><select id="cashier" name="cashier" required={activeCashiers.length > 0} disabled={!activeCashiers.length} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"><option value="">{activeCashiers.length ? "Pilih kasir" : "Tambahkan kasir di Pengaturan Toko"}</option>{activeCashiers.map((cashier) => <option key={cashier.id} value={cashier.name}>{cashier.name}</option>)}</select></div></div><div className="space-y-3"><div className="hidden grid-cols-[minmax(190px,2fr)_90px_minmax(130px,1fr)_130px_minmax(130px,1fr)_120px_40px] gap-2 px-1 text-xs font-medium text-muted-foreground lg:grid"><span>Barang / keterangan</span><span>Jumlah</span><span>Harga eceran</span><span>Jenis harga</span><span>Harga grosir</span><span className="text-right">Jumlah harga</span><span /></div>{invoiceItems.map((row, index) => { const qty = Math.max(0, Math.round(asNumber(row.qty))); const appliedPrice = row.priceMode === "wholesale" ? asNumber(row.wholesalePrice) : asNumber(row.unitPrice); const subtotal = qty * Math.max(0, appliedPrice); return <div key={row.id} className="grid gap-3 rounded-xl border border-border bg-muted/30 p-3 lg:grid-cols-[minmax(190px,2fr)_90px_minmax(130px,1fr)_130px_minmax(130px,1fr)_120px_40px] lg:items-end lg:gap-2 lg:border-0 lg:bg-transparent lg:p-0"><div className="space-y-1.5"><Label className="lg:sr-only" htmlFor={`item-${row.id}`}>Barang / keterangan</Label><Input id={`item-${row.id}`} value={row.item} onChange={(event) => updateInvoiceItem(row.id, { item: event.target.value })} placeholder={`Barang ${index + 1}`} maxLength={200} required autoFocus={index === 0} /></div><div className="space-y-1.5"><Label className="lg:sr-only" htmlFor={`qty-${row.id}`}>Jumlah</Label><Input id={`qty-${row.id}`} value={row.qty} onChange={(event) => updateInvoiceItem(row.id, { qty: event.target.value })} type="number" min="1" step="1" inputMode="numeric" required /></div><div className="space-y-1.5"><Label className="lg:sr-only" htmlFor={`unit-${row.id}`}>Harga eceran (Rp)</Label><Input id={`unit-${row.id}`} value={row.unitPrice} onChange={(event) => updateInvoiceItem(row.id, { unitPrice: event.target.value })} type="number" min="1" step="1" inputMode="numeric" placeholder="Rp" required /></div><div className="space-y-1.5"><Label className="lg:sr-only" htmlFor={`mode-${row.id}`}>Jenis harga</Label><select id={`mode-${row.id}`} value={row.priceMode} onChange={(event) => updateInvoiceItem(row.id, { priceMode: event.target.value as DebtDraft["priceMode"] })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"><option value="retail">Eceran</option><option value="wholesale">Grosir</option></select></div><div className="space-y-1.5"><Label className="lg:sr-only" htmlFor={`wholesale-${row.id}`}>Harga grosir (Rp)</Label><Input id={`wholesale-${row.id}`} value={row.wholesalePrice} onChange={(event) => updateInvoiceItem(row.id, { wholesalePrice: event.target.value })} type="number" min="1" step="1" inputMode="numeric" placeholder={row.priceMode === "wholesale" ? "Wajib diisi" : "Opsional"} required={row.priceMode === "wholesale"} disabled={row.priceMode !== "wholesale"} /></div><div className="flex h-9 items-center justify-between lg:justify-end"><span className="text-xs text-muted-foreground lg:hidden">Jumlah harga</span><span className="font-semibold">{rupiah.format(subtotal)}</span></div><Button type="button" variant="ghost" size="icon-sm" aria-label={`Hapus barang ${index + 1}`} disabled={invoiceItems.length === 1} onClick={() => setInvoiceItems((current) => current.filter((item) => item.id !== row.id))}><Trash2 className="size-4" /></Button></div>; })}<Button type="button" variant="outline" size="sm" className="gap-2" disabled={invoiceItems.length >= 50} onClick={() => setInvoiceItems((current) => [...current, newDebtDraft()])}><Plus className="size-4" /> Tambah barang</Button></div><div className="flex items-center justify-between rounded-xl bg-secondary p-4"><div><p className="text-sm text-secondary-foreground">Total nota</p><p className="text-xs text-muted-foreground">{invoiceItems.length} jenis barang</p></div><p className="text-2xl font-extrabold tracking-tight">{rupiah.format(invoiceTotal)}</p></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setDebtOpen(false)}>Batal</Button><Button type="submit" disabled={saving || !selected || invoiceTotal <= 0 || !activeCashiers.length}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Simpan piutang</Button></DialogFooter></form></DialogContent></Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Bagikan rincian piutang {selected?.name}</DialogTitle><DialogDescription>Pilih gaya pesan, lalu salin teks atau buka percakapan WhatsApp. Pesan tidak dikirim otomatis.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="grid gap-2 sm:grid-cols-3">{([{ id: "formal", title: "Ringkas & formal", note: "Cocok untuk pemberitahuan umum" }, { id: "detailed", title: "Struk tagihan", note: "Tampilan rapi dengan pembatas dan nota" }, { id: "friendly", title: "Pengingat ramah", note: "Bahasa santai dan sopan" }] as const).map((option) => <button key={option.id} type="button" onClick={() => setShareStyle(option.id)} className={`rounded-xl border p-3 text-left transition-colors ${shareStyle === option.id ? "border-primary bg-secondary" : "border-border hover:bg-muted"}`}><span className="block font-semibold">{option.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.note}</span></button>)}</div><div className="space-y-2"><Label htmlFor="sharePreview">Pratinjau pesan</Label><textarea id="sharePreview" readOnly value={shareMessage} rows={16} className={`w-full resize-y rounded-xl border border-input bg-muted/30 px-3 py-3 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 ${shareStyle === "detailed" ? "font-mono" : ""}`} /></div>{!selected?.phone && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Nomor WhatsApp pelanggan belum diisi. Rincian tetap dapat disalin.</p>}</div><DialogFooter><Button type="button" variant="outline" className="gap-2" onClick={() => void copyDebtDetails()}><Copy className="size-4" /> Salin rincian</Button><Button type="button" className="gap-2 bg-emerald-700 hover:bg-emerald-800" disabled={whatsappNumber(selected?.phone ?? "").length < 9} onClick={openWhatsApp}><MessageCircle className="size-4" /> Buka WhatsApp</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}><DialogContent><form onSubmit={(event) => void submitForm(event, "create_payment", () => setPaymentOpen(false))}><DialogHeader><DialogTitle>Catat pembayaran {selected?.name}</DialogTitle><DialogDescription>Pembayaran dialokasikan otomatis dari piutang paling lama.</DialogDescription></DialogHeader><input type="hidden" name="payAll" value={paymentMode === "all" ? "true" : "false"} /><input type="hidden" name="creditAmount" value={useCredit ? paymentCreditAmount : "0"} /><div className="space-y-4 py-5"><div className="rounded-xl bg-secondary p-4"><div className="flex items-end justify-between gap-4"><div><p className="text-sm text-secondary-foreground">Sisa piutang pelanggan</p><p className="mt-1 text-2xl font-bold">{rupiah.format(selected?.balance ?? 0)}</p></div>{(selected?.credit_balance ?? 0) > 0 && <div className="text-right"><p className="text-xs text-muted-foreground">Saldo tersimpan</p><p className="font-bold text-emerald-700">{rupiah.format(selected?.credit_balance ?? 0)}</p></div>}</div></div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => { setPaymentMode("partial"); setPaymentCashAmount(""); }} className={`rounded-xl border p-3 text-left transition-colors ${paymentMode === "partial" ? "border-primary bg-secondary" : "border-border hover:bg-muted"}`}><span className="block font-semibold">Bayar sebagian</span><span className="mt-1 block text-xs text-muted-foreground">Masukkan jumlah pembayaran</span></button><button type="button" onClick={() => { setPaymentMode("all"); setPaymentCashAmount(String(Math.max(0, (selected?.balance ?? 0) - (useCredit ? asNumber(paymentCreditAmount) : 0)))); }} className={`rounded-xl border p-3 text-left transition-colors ${paymentMode === "all" ? "border-primary bg-secondary" : "border-border hover:bg-muted"}`}><span className="block font-semibold">Lunasi semua</span><span className="mt-1 block text-xs text-muted-foreground">Kelebihan disimpan sebagai saldo</span></button></div>{(selected?.credit_balance ?? 0) > 0 && <div className="rounded-xl border border-emerald-700/20 p-3"><button type="button" onClick={() => { const next = !useCredit; const credit = next ? Math.min(selected?.credit_balance ?? 0, selected?.balance ?? 0) : 0; setUseCredit(next); setPaymentCreditAmount(String(credit)); if (paymentMode === "all") setPaymentCashAmount(String(Math.max(0, (selected?.balance ?? 0) - credit))); }} className="flex w-full items-center justify-between text-left"><span><span className="block font-semibold">Gunakan saldo kelebihan bayar</span><span className="mt-0.5 block text-xs text-muted-foreground">Saldo tidak digunakan sampai pilihan ini diaktifkan</span></span><span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${useCredit ? "bg-emerald-700" : "bg-muted"}`}><span className={`block size-4 rounded-full bg-white transition-transform ${useCredit ? "translate-x-4" : ""}`} /></span></button>{useCredit && <div className="mt-3 space-y-2"><Label htmlFor="creditAmount">Saldo yang digunakan</Label><Input id="creditAmount" type="number" min="0" max={Math.min(selected?.credit_balance ?? 0, selected?.balance ?? 0)} value={paymentCreditAmount} onChange={(event) => { const value = event.target.value; setPaymentCreditAmount(value); if (paymentMode === "all") setPaymentCashAmount(String(Math.max(0, (selected?.balance ?? 0) - asNumber(value)))); }} inputMode="numeric" /></div>}</div>}<div className="space-y-2"><Label htmlFor="paymentAmount">{paymentMode === "all" ? "Uang diterima" : "Pembayaran tunai"}</Label><Input id="paymentAmount" name="amount" type="number" min="0" max={paymentMode === "partial" ? Math.max(0, (selected?.balance ?? 0) - (useCredit ? asNumber(paymentCreditAmount) : 0)) : undefined} value={paymentCashAmount} onChange={(event) => setPaymentCashAmount(event.target.value)} required autoFocus inputMode="numeric" />{paymentMode === "partial" ? oldestOpenDebt && <p className="text-xs leading-5 text-muted-foreground">Pembayaran masuk ke nota {oldestOpenDebt.invoice_no || "terlama"} terlebih dahulu. Sisa nota tersebut: {rupiah.format(oldestOpenDebt.amount - oldestOpenDebt.paid_amount)}.</p> : <p className="text-xs leading-5 text-muted-foreground">Kebutuhan pelunasan setelah saldo: {rupiah.format(Math.max(0, (selected?.balance ?? 0) - (useCredit ? asNumber(paymentCreditAmount) : 0)))}. Uang selebihnya akan disimpan sebagai saldo pelanggan.</p>}</div><div className="space-y-2"><Label htmlFor="receivedBy">Diterima oleh</Label><select id="receivedBy" name="receivedBy" required disabled={!activeCashiers.length} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"><option value="">{activeCashiers.length ? "Pilih kasir" : "Tambahkan kasir di Pengaturan Toko"}</option>{activeCashiers.map((cashier) => <option key={cashier.id} value={cashier.name}>{cashier.name}</option>)}</select></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>Batal</Button><Button type="submit" disabled={saving || !selected || !activeCashiers.length || asNumber(paymentCashAmount) + (useCredit ? asNumber(paymentCreditAmount) : 0) <= 0}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}{paymentMode === "all" ? "Lunasi dan simpan saldo" : "Simpan pembayaran"}</Button></DialogFooter></form></DialogContent></Dialog>
    </main>
  );
}
