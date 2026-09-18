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

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <BookOpenText className="size-5" />
        </div>
        <div>
          <p className="text-base font-bold leading-tight tracking-tight">
            Buku Piutang
          </p>
          <p className="text-xs text-muted-foreground">{storeName}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden gap-2 sm:flex"
          onClick={() => setImportOpen(true)}
        >
          <ArrowDownToLine className="size-4" /> Impor cadangan
        </Button>
        <Button asChild variant="ghost" size="icon-sm">
          <Link
            href="/pengaturan"
            aria-label="Buka pengaturan toko"
            title="Pengaturan toko"
          >
            <Settings2 className="size-4" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Keluar dari akun"
          title="Keluar"
          onClick={() => void signOut()}
        >
          <LogOut className="size-4" />
        </Button>
        <Button
          size="sm"
          className="gap-2 shadow-sm"
          disabled={!hasSelected}
          onClick={() => setDebtOpen(true)}
        >
          <Plus className="size-4" /> Catat piutang
        </Button>
      </div>
    </header>
  );
}
