"use client";
import { Button } from "@/components/ui/button";
import { ThemeSwitch } from "@/components/theme-switch";
import { rupiah } from "@/lib/ledger/format";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  BookOpenText,
  CircleDollarSign,
  LogOut,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  storeName: string;
  openBalance: number;
};

function OpenBalanceSummary({ openBalance }: { openBalance: number }) {
  const formattedBalance = rupiah.format(openBalance);

  return (
    <div className="flex min-w-0 items-center gap-2.5 md:justify-end">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-900 dark:bg-sky-400/15 dark:text-sky-300">
        <CircleDollarSign className="size-3.5" aria-hidden="true" />
      </span>
      <dl className="flex min-w-0 items-center gap-2 lg:block">
        <dt className="hidden text-[10px] font-medium text-muted-foreground lg:block">
          Total belum lunas
        </dt>
        <dd
          className="min-w-[11ch] truncate text-base font-bold tracking-tight text-primary tabular-nums lg:mt-0.5 lg:text-lg"
          title={formattedBalance}
        >
          {formattedBalance}
        </dd>
      </dl>
    </div>
  );
}

export function LedgerHeader({
  storeName,
  openBalance,
}: Props) {
  const router = useRouter();
  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const utilityButton =
    "size-8 rounded-lg border border-border/60 bg-background/65 text-muted-foreground shadow-none transition-colors duration-200 hover:border-border hover:bg-background hover:text-foreground";

  return (
    <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-2 border-b border-border/60 bg-card/85 px-3 py-2 backdrop-blur-xl sm:px-4 md:flex md:h-[68px] md:gap-3 md:py-0 lg:px-5">
      <div className="flex min-w-0 items-center gap-2 md:shrink-0">
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

      <div className="col-span-2 row-start-2 min-w-0 border-t border-border/50 pt-2 md:ml-auto md:shrink-0 md:border-t-0 md:border-r md:border-border/60 md:pt-0 md:pr-3">
        <OpenBalanceSummary openBalance={openBalance} />
      </div>

      <nav
        aria-label="Pengaturan dan akun"
        className="col-start-2 row-start-1 flex shrink-0 items-center gap-1"
      >
        <ThemeSwitch
          compact
          className="h-8 rounded-lg px-1 transition-colors duration-200 [&>svg]:hidden sm:px-1.5 sm:[&>svg]:block"
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
