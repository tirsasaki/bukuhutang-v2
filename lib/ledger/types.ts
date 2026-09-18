export type Customer = {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  balance: number;
  credit_balance: number;
  debt_count: number;
  last_debt_at: string | null;
  last_payment_at: string | null;
  last_payment_amount: number;
  last_activity_at: string;
};
export type Debt = {
  id: string;
  customer_id: string;
  amount: number;
  paid_amount: number;
  created_at: string;
  date: string;
  invoice_no: string;
  item: string;
  cashier: string;
  qty: number;
  unit_price: number | null;
  wholesale_price: number | null;
  price_mode: "retail" | "wholesale";
  invoice_id: string | null;
};
export type Payment = {
  id: string;
  debt_item_id: string;
  customer_id: string;
  amount: number;
  paid_at: string;
  received_by: string;
  source: "cash" | "credit";
};
export type Cashier = {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
};
export type StoreInformation = { name: string; address: string };
export type LedgerData = {
  customers: Customer[];
  debts: Debt[];
  payments: Payment[];
  cashiers: Cashier[];
  store: StoreInformation;
  importSummary?: {
    import_count?: number;
    row_count?: number;
    last_import_at?: string | null;
  };
};
export type DebtDraft = {
  id: string;
  item: string;
  qty: string;
  unitPrice: string;
  wholesaleTotal: string;
  discount: string;
  priceMode: "retail" | "wholesale";
};
export type ShareStyle = "formal" | "detailed" | "friendly";
export type ShareDisplayOptions = {
  storeName: boolean;
  storeAddress: boolean;
  invoiceNumber: boolean;
  customerName: boolean;
};

export type PostAction = (
  payload: Record<string, unknown>,
) => Promise<Record<string, unknown>>;
export type SubmitForm = (
  event: React.FormEvent<HTMLFormElement>,
  action: string,
  close: () => void,
) => Promise<void>;
