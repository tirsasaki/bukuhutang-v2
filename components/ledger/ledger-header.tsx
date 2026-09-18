"use client";
import { Button } from "@/components/ui/button";
import { ThemeSwitch } from "@/components/theme-switch";
import { rupiah } from "@/lib/ledger/format";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  BookOpenText,
  CircleDollarSign,
  Clock3,
  LogOut,
  Plus,
  Settings2,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  storeName: string;
  hasSelected: boolean;
  openBalance: number;
  needsFollowUp: number;
  paidThisMonth: number;
  paymentCountThisMonth: number;
  setDebtOpen: (open: boolean) => void;
};
type StatChipProps = {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  iconClassName: string;
  valueClassName: string;
};

function StatChip({
  label,
  value,
  note,
  icon: Icon,
  iconClassName,
  valueClassName,
}: StatChipProps) {
  return (
    <div className="min-w-[150px] snap-start rounded-xl bg-background/55 px-2.5 py-1.5 shadow-[0_1px_8px_rgba(15,23,42,0.025)] ring-1 ring-border/40 lg:min-w-0 lg:flex-1 lg:bg-transparent lg:shadow-none lg:ring-0">
      <div className="flex items-center gap-2">
        <span
          className={`grid size-7 shrink-0 place-items-center rounded-full ${iconClassName}`}
        >
          <Icon className="size-3" aria-hidden="true" />
        </span>
        <dl className="min-w-0">
          <dt className="truncate text-[10px] font-medium text-muted-foreground xl:text-[11px]">
            {label}
          </dt>
          <dd
            className={`truncate text-base font-bold tracking-tight tabular-nums xl:text-lg ${valueClassName}`}
            title={value}
          >
            {value}
          </dd>
          <dd className="mt-0.5 hidden truncate text-[9px] text-muted-foreground 2xl:block">
            {note}
          </dd>
        </dl>
      </div>
    </div>
  );
}

export function LedgerHeader({
  storeName,
  hasSelected,
  openBalance,
  needsFollowUp,
  paidThisMonth,
  paymentCountThisMonth,
  setDebtOpen,
}: Props) {
  const router = useRouter();
  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const utilityButton =
    "size-8 rounded-lg border border-border/60 bg-background/65 text-muted-foreground shadow-none transition-none hover:bg-background/65 hover:text-muted-foreground";

  const stats: StatChipProps[] = [
    {
      label: "Total belum lunas",
      value: rupiah.format(openBalance),
      note: `${needsFollowUp} pelanggan belum lunas`,
      icon: CircleDollarSign,
      iconClassName: "bg-sky-100 text-sky-900 dark:bg-sky-400/15 dark:text-sky-300",
      valueClassName: "text-primary",
    },
    {
      label: "Perlu ditagih",
      value: String(needsFollowUp),
      note: needsFollowUp
        ? "Pelanggan dengan sisa piutang"
        : "Semua pelanggan sudah lunas",
      icon: Clock3,
      iconClassName:
        "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-300",
      valueClassName: "text-amber-900 dark:text-amber-300",
    },
    {
      label: "Pembayaran bulan ini",
      value: rupiah.format(paidThisMonth),
      note: `${paymentCountThisMonth} alokasi pembayaran tunai`,
      icon: WalletCards,
      iconClassName:
        "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-300",
      valueClassName: "text-emerald-900 dark:text-emerald-300",
    },
  ];

  return (
    <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1.5 border-b border-border/60 bg-card/85 px-3 py-1.5 backdrop-blur-xl sm:px-4 lg:h-[72px] lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-x-3 lg:px-4 lg:py-1.5">
      <div className="flex min-w-0 items-center gap-2 lg:min-w-[140px]">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_3px_10px_rgba(11,79,85,0.12)]">
          <BookOpenText className="size-4.5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight tracking-tight">
            Buku Piutang
          </p>
          <p
            className="mt-0.5 truncate text-[10px] text-muted-foreground"
            title={storeName}
          >
            {storeName}
          </p>
        </div>
      </div>

      <div className="col-span-2 row-start-2 -mx-3 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-4 sm:px-4 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:mx-0 lg:min-w-0 lg:gap-0 lg:overflow-visible lg:px-0 lg:[&>*+*]:border-l lg:[&>*+*]:border-border/60">
        {stats.map((stat) => (
          <StatChip key={stat.label} {...stat} />
        ))}
      </div>

      <nav
        aria-label="Tindakan, pengaturan, dan akun"
        className="col-start-2 row-start-1 flex items-center gap-1 lg:col-start-3 lg:ml-0 lg:border-l lg:border-border/60 lg:pl-2.5"
      >
        <Button
          type="button"
          size="icon-sm"
          className="rounded-lg shadow-none transition-none hover:bg-primary hover:text-primary-foreground 2xl:w-auto 2xl:px-2.5"
          disabled={!hasSelected}
          onClick={() => setDebtOpen(true)}
          aria-label="Catat piutang"
          title="Catat piutang"
        >
          <Plus className="size-4" aria-hidden="true" />
          <span className="hidden text-xs font-semibold 2xl:inline">
            Catat piutang
          </span>
        </Button>
        <ThemeSwitch
          compact
          className="h-8 rounded-lg px-1.5 transition-none hover:bg-card hover:text-muted-foreground"
        />
        <Button asChild variant="ghost" size="icon" className={utilityButton}>
          <Link
            href="/pengaturan"
            aria-label="Buka pengaturan toko"
            title="Pengaturan toko"
          >
            <Settings2 className="size-4" aria-hidden="true" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={utilityButton}
          aria-label="Keluar dari akun"
          title="Keluar dari akun"
          onClick={() => void signOut()}
        >
          <LogOut className="size-4" aria-hidden="true" />
        </Button>
      </nav>
    </header>
  );
}
