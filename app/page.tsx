import { LedgerPage } from "@/components/ledger/ledger-page";
import { readLedgerData } from "@/lib/ledger/read";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

async function LedgerContent() {
  const initialData = await readLedgerData();
  return <LedgerPage initialData={initialData} />;
}

function LedgerLoading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background text-foreground">
      <div className="text-center">
        <Loader2 className="mx-auto size-7 animate-spin text-primary" />
        <p className="mt-3 text-sm font-medium">Membuka buku piutang…</p>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LedgerLoading />}>
      <LedgerContent />
    </Suspense>
  );
}
