"use client";
import { ThemeSwitch } from "@/components/theme-switch";
import { rupiah } from "@/lib/ledger/format";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BrandLogo, iconButtonClass } from "@/components/brand-logo";
import {
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

const headerIconButton = iconButtonClass;

function OpenBalancePill({ openBalance }: { openBalance: number }) {
  const formatted = rupiah.format(openBalance);
  return (
    <div
      className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border-soft bg-background py-1.5 pr-3.5 pl-2"
      title={`Total belum lunas: ${formatted}`}
    >
      <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-info-bg text-info-fg">
        <CircleDollarSign className="size-4" aria-hidden="true" />
      </span>
      <dl className="min-w-0">
        <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          Total belum lunas
        </dt>
        <dd className="truncate text-base leading-tight font-extrabold tracking-tight text-primary tabular-nums">
          {formatted}
        </dd>
      </dl>
    </div>
  );
}

export function LedgerHeader({ storeName, openBalance }: Props) {
  const router = useRouter();
  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-card/95 backdrop-blur-xl md:static md:bg-card">
      <div className="flex h-14 items-center justify-between gap-3 px-3 sm:h-16 sm:gap-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-[11px]">
          <BrandLogo className="size-9 sm:size-[38px]" />
          <div className="min-w-0">
            <p className="truncate text-[15px] leading-tight font-extrabold tracking-tight">
              Buku Piutang
            </p>
            <p
              className="mt-0.5 flex min-w-0 items-center gap-[5px] text-[11px] text-muted-foreground"
              title={storeName}
            >
              <span className="size-1.5 shrink-0 rounded-full bg-success-dot" />
              <span className="truncate">{storeName}</span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3.5">
          <div className="hidden sm:block">
            <OpenBalancePill openBalance={openBalance} />
          </div>
          <nav
            aria-label="Pengaturan dan akun"
            className="flex items-center gap-1.5"
          >
            <ThemeSwitch />
            <Link
              href="/pengaturan"
              aria-label="Buka pengaturan toko"
              title="Pengaturan toko"
              className={headerIconButton}
            >
              <Settings2 className="size-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              className={headerIconButton}
              aria-label="Keluar dari akun"
              title="Keluar dari akun"
              onClick={() => void signOut()}
            >
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>

      {/* Ponsel: total belum lunas tampil sebagai baris ringkas di bawah header. */}
      <div className="flex items-center justify-between gap-3 border-t border-border-soft bg-background/70 px-3 py-2 sm:hidden">
        <span className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          <span className="grid size-6 place-items-center rounded-md bg-info-bg text-info-fg">
            <CircleDollarSign className="size-3.5" aria-hidden="true" />
          </span>
          Total belum lunas
        </span>
        <span className="truncate text-[15px] font-extrabold tracking-tight text-primary tabular-nums">
          {rupiah.format(openBalance)}
        </span>
      </div>
    </header>
  );
}
