"use client";

import { useMemo } from "react";
import { BarChart3, ReceiptText, TrendingUp, UserRound } from "lucide-react";
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

type Props = { data: LedgerData };

export function TrendPanel({ data }: Props) {
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
          a.name.localeCompare(b.name, "id"),
      )
      .slice(0, 8);
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
    <aside className="hidden min-w-0 flex-col overflow-y-auto border-l border-border bg-muted/20 lg:flex">
      <div className="border-b border-border/80 bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold tracking-tight">Grafik tren</h2>
            <p className="mt-0.5 text-xs capitalize text-muted-foreground">
              {trend.monthLabel}
            </p>
          </div>
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <TrendingUp className="size-4" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <div className="rounded-2xl border border-border/80 bg-card p-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold">Aktivitas harian</p>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-chart-1" /> Piutang
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-chart-2" /> Pembayaran
              </span>
            </div>
          </div>
          <ChartContainer
            config={chartConfig}
            initialDimension={{ width: 280, height: 176 }}
            className="mt-3 h-44 w-full aspect-auto"
          >
            <LineChart
              accessibilityLayer
              data={trend.daily}
              margin={{ top: 4, right: 6, bottom: 0, left: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                ticks={ticks}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                width={42}
                tickLine={false}
                axisLine={false}
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
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="payment"
                stroke="var(--color-payment)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
            <ReceiptText className="size-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-[10px] text-muted-foreground">
              Piutang bulan ini
            </p>
            <p className="mt-1 break-words text-sm font-bold tabular-nums">
              {rupiah.format(trend.totalDebt)}
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
            <BarChart3
              className="size-4 text-emerald-800 dark:text-emerald-300"
              aria-hidden="true"
            />
            <p className="mt-2 text-[10px] text-muted-foreground">
              Pembayaran bulan ini
            </p>
            <p className="mt-1 break-words text-sm font-bold tabular-nums text-emerald-900 dark:text-emerald-300">
              {rupiah.format(trend.totalPayment)}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
          <div className="flex items-center gap-3 border-b border-border/70 p-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <UserRound className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Peringkat piutang
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                8 pelanggan dengan catatan piutang terbanyak
              </p>
            </div>
          </div>
          {trend.rankedCustomers.length ? (
            <ol className="divide-y divide-border/60">
              {trend.rankedCustomers.map((customer, index) => (
                <li
                  key={customer.id}
                  className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5"
                >
                  <span
                    className={`grid size-7 place-items-center rounded-lg text-[11px] font-bold tabular-nums ${index === 0 ? "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}
                  >
                    {index + 1}
                  </span>
                  <span className="truncate text-xs font-semibold">
                    {customer.name}
                  </span>
                  <span className="whitespace-nowrap text-[11px] font-medium tabular-nums text-muted-foreground">
                    {customer.debt_count} piutang
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="p-4 text-center text-xs text-muted-foreground">
              Belum ada pelanggan.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
