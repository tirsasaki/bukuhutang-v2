"use client";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ArrowDownToLine,
  BookOpenText,
  LogOut,
  Plus,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  storeName: string;
  hasSelected: boolean;
  setImportOpen: (open: boolean) => void;
  setDebtOpen: (open: boolean) => void;
};
export function LedgerHeader({
  storeName,
  hasSelected,
  setImportOpen,
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
    "size-9 rounded-lg border border-border/70 bg-card text-muted-foreground shadow-none hover:bg-muted hover:text-primary";

  return (
    <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 border-b border-border/70 bg-card px-4 py-3 sm:flex sm:justify-between lg:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <BookOpenText className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight tracking-tight sm:text-base">
            Buku Piutang
          </p>
          <p
            className="mt-1 truncate text-[11px] text-muted-foreground"
            title={storeName}
          >
            {storeName}
          </p>
        </div>
      </div>
      <div className="col-span-2 row-start-2 grid grid-cols-2 gap-2 sm:ml-auto sm:flex">
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-1.5 rounded-lg border-border/80 bg-card px-3 text-xs! font-medium! text-muted-foreground shadow-none hover:text-primary"
          onClick={() => setImportOpen(true)}
        >
          <ArrowDownToLine className="size-3.5" aria-hidden="true" />
          Impor cadangan
        </Button>
        <Button
          type="button"
          className="h-9 gap-1.5 rounded-lg px-3 text-xs! font-semibold! shadow-sm"
          disabled={!hasSelected}
          onClick={() => setDebtOpen(true)}
        >
          <Plus className="size-4" aria-hidden="true" />
          Catat piutang
        </Button>
      </div>
      <nav
        aria-label="Pengaturan dan akun"
        className="col-start-2 row-start-1 flex items-center gap-1.5 sm:ml-1 sm:border-l sm:border-border/80 sm:pl-3"
      >
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
          className={`${utilityButton} hover:border-destructive/20 hover:bg-destructive/5 hover:text-destructive`}
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
