"use client";

import { useMemo } from "react";
import { ReceiptText, TrendingUp, UsersRound, WalletCards } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { rupiah } from "@/lib/ledger/format";
import type { LedgerData } from "@/lib/ledger/types";

const chartConfig = {
  debt: { label: "Piutang", color: "var(--chart-1)" },
  payment: { label: "Pembayaran", color: "var(--chart-2)" },
} satisfies ChartConfig;

const compactNumber = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const rankColorClasses = [
  "border border-warning-border bg-warning-bg text-warning-fg",
  "border border-border bg-muted text-foreground",
  "border border-bronze-border bg-bronze-bg text-bronze-fg",
];

type Props = {
  data: LedgerData;
  selectedId: string;
  onSelectCustomer: (id: string) => void;
};

export function TrendPanel({ data, selectedId, onSelectCustomer }: Props) {
  const trend = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const monthPrefix = `${year}-${month}`;
    const dayCount = now.getDate();
    const daily = Array.from({ length: dayCount }, (_, index) => ({
      day: String(index + 1),
      debt: 0,
      payment: 0,
    }));

    for (const debt of data.debts) {
      if (!debt.date.startsWith(monthPrefix)) continue;
      const day = Number(debt.date.slice(8, 10));
      if (daily[day - 1]) daily[day - 1].debt += debt.amount;
    }
    for (const payment of data.payments) {
      if (
        payment.source === "credit" ||
        !payment.paid_at.startsWith(monthPrefix)
      )
        continue;
      const day = Number(payment.paid_at.slice(8, 10));
      if (daily[day - 1]) daily[day - 1].payment += payment.amount;
    }

    const totalDebt = daily.reduce((sum, item) => sum + item.debt, 0);
    const totalPayment = daily.reduce((sum, item) => sum + item.payment, 0);
    const rankedCustomers = [...data.customers]
      .sort(
        (a, b) =>
          b.debt_count - a.debt_count ||
          b.balance - a.balance ||
          a.name.localeCompare(b.name, "id"),
      )
      .slice(0, 6);
    const monthLabel = new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
    }).format(now);

    return { daily, totalDebt, totalPayment, rankedCustomers, monthLabel };
  }, [data.customers, data.debts, data.payments]);

  const ticks = [1, 5, 10, 15, 20, 25, 30]
    .filter((day) => day <= trend.daily.length)
    .map(String);

  return (
    <aside className="hidden min-h-0 min-w-0 flex-col overflow-y-auto border-l border-border bg-muted desk:flex">
      <div className="flex items-center justify-between border-b border-border-soft bg-card p-4">
        <div>
          <h2 className="text-[15px] font-extrabold tracking-tight">
            Grafik tren
          </h2>
          <p className="text-[11.5px] text-muted-foreground capitalize">
            {trend.monthLabel}
          </p>
        </div>
        <div className="grid size-[38px] shrink-0 place-items-center rounded-[11px] bg-secondary text-primary">
          <TrendingUp className="size-4" aria-hidden="true" />
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3.5">
        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-xs">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold">Aktivitas harian</p>
            <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-chart-1" /> Piutang
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-chart-2" /> Bayar
              </span>
            </div>
          </div>
          <ChartContainer
            config={chartConfig}
            initialDimension={{ width: 270, height: 148 }}
            className="aspect-auto h-[148px] w-full"
          >
            <LineChart
              accessibilityLayer
              data={trend.daily}
              margin={{ top: 6, right: 6, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="var(--border-soft)"
              />
              <XAxis
                dataKey="day"
                ticks={ticks}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tick={{ fontSize: 9.5, fill: "var(--subtle-foreground)" }}
              />
              <YAxis
                width={34}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 9.5, fill: "var(--subtle-foreground)" }}
                tickFormatter={(value) => compactNumber.format(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) =>
                      `Tanggal ${String(label)} ${trend.monthLabel}`
                    }
                    formatter={(value, name) => (
                      <div className="flex min-w-40 items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {name === "debt" ? "Piutang" : "Pembayaran"}
                        </span>
                        <span className="font-mono font-semibold tabular-nums">
                          {rupiah.format(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="debt"
                stroke="var(--color-debt)"
                strokeWidth={2.4}
                strokeLinecap="round"
                dot={false}
                activeDot={{ r: 4, fill: "var(--card)", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="payment"
                stroke="var(--color-payment)"
                strokeWidth={2.4}
                strokeLinecap="round"
                dot={false}
                activeDot={{ r: 4, fill: "var(--card)", strokeWidth: 2 }}
              />
            </LineChart>
          </ChartContainer>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[14px] border border-border bg-card p-[13px]">
            <ReceiptText className="size-[15px] text-primary" aria-hidden="true" />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Piutang bulan ini
            </p>
            <p className="mt-[3px] text-sm font-extrabold break-words tabular-nums">
              {rupiah.format(trend.totalDebt)}
            </p>
          </div>
          <div className="rounded-[14px] border border-border bg-card p-[13px]">
            <WalletCards className="size-3.5 text-success-fg" aria-hidden="true" />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Pembayaran masuk
            </p>
            <p className="mt-[3px] text-sm font-extrabold break-words text-success-fg tabular-nums">
              {rupiah.format(trend.totalPayment)}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center gap-2.5 px-3.5 py-[13px]">
            <div className="grid size-[34px] shrink-0 place-items-center rounded-[11px] bg-secondary text-primary">
              <UsersRound className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.08em] text-subtle-foreground uppercase">
                Peringkat piutang
              </p>
              <p className="text-[11.5px] text-muted-foreground">
                Pelanggan dengan catatan terbanyak
              </p>
            </div>
          </div>
          {trend.rankedCustomers.length ? (
            <ol>
              {trend.rankedCustomers.map((customer, index) => (
                <li key={customer.id} className="border-t border-border-soft">
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(customer.id)}
                    aria-current={selectedId === customer.id ? "true" : undefined}
                    className={`grid w-full grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 px-3.5 py-[9px] text-left transition-colors hover:bg-card-hover focus-visible:bg-card-hover focus-visible:outline-none ${selectedId === customer.id ? "bg-secondary/60" : ""}`}
                  >
                    <span
                      className={`grid size-[26px] place-items-center rounded-lg text-[11px] font-extrabold tabular-nums ${rankColorClasses[index] ?? "bg-background text-muted-foreground"}`}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-bold">
                        {customer.name}
                      </span>
                      <span className="block text-[10.5px] text-muted-foreground tabular-nums">
                        {rupiah.format(customer.balance)}
                      </span>
                    </span>
                    <span className="text-[11px] font-semibold whitespace-nowrap text-muted-foreground tabular-nums">
                      {customer.debt_count} nota
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="border-t border-border-soft p-4 text-center text-xs text-muted-foreground">
              Belum ada pelanggan.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
