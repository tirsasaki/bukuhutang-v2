"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    console.error("Gagal membuka buku piutang", error);
  }, [error]);

  function retry() {
    setRetrying(true);
    reset();
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 text-foreground">
      <section className="w-full max-w-md rounded-3xl border bg-card p-7 text-center shadow-xl shadow-primary/5 sm:p-9">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="mt-5 text-xl font-bold">Data belum dapat dibuka</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Koneksi ke layanan data mungkin sedang terganggu. Coba lagi tanpa perlu
          keluar dari akun.
        </p>
        <Button className="mt-6 w-full" size="lg" onClick={retry} disabled={retrying}>
          <RefreshCw className={retrying ? "animate-spin" : ""} />
          {retrying ? "Mencoba lagi…" : "Coba lagi"}
        </Button>
        {error.digest && (
          <p className="mt-4 text-xs text-muted-foreground">
            Kode galat: {error.digest}
          </p>
        )}
      </section>
    </main>
  );
}
