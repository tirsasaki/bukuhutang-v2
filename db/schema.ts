import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  sourceUserId: text("source_user_id"),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_customers_owner_name").on(table.ownerId, table.name)]);

export const debtItems = sqliteTable("debt_items", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  amount: integer("amount").notNull(),
  createdAt: text("created_at").notNull(),
  date: text("date").notNull(),
  invoiceNo: text("invoice_no").notNull().default(""),
  item: text("item").notNull().default(""),
  cashier: text("cashier").notNull().default(""),
  qty: integer("qty").notNull().default(1),
}, (table) => [
  index("idx_debt_items_owner_customer").on(table.ownerId, table.customerId),
  index("idx_debt_items_owner_date").on(table.ownerId, table.date),
]);

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  debtItemId: text("debt_item_id").notNull().references(() => debtItems.id),
  amount: integer("amount").notNull(),
  paidAt: text("paid_at").notNull(),
  receivedBy: text("received_by").notNull().default(""),
}, (table) => [index("idx_payments_owner_debt").on(table.ownerId, table.debtItemId)]);

export const creditTransactions = sqliteTable("credit_transactions", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  amount: integer("amount").notNull(),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_credit_owner_customer").on(table.ownerId, table.customerId)]);

export const importBatches = sqliteTable("import_batches", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  fingerprint: text("fingerprint").notNull(),
  exportedAt: text("exported_at").notNull().default(""),
  importedAt: text("imported_at").notNull(),
  rowCount: integer("row_count").notNull().default(0),
}, (table) => [uniqueIndex("idx_import_owner_fingerprint").on(table.ownerId, table.fingerprint)]);
