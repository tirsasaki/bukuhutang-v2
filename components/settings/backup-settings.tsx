"use client";

import { Button } from "@/components/ui/button";
import {
  Download,
  FileJson2,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ImportDialog } from "@/components/ledger/import-dialog";

type Props = { afterImport: () => Promise<void> };

export function BackupSettings({ afterImport }: Props) {
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function downloadBackup() {
    setDownloading(true);
    try {
      const response = await fetch("/api/backup", { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || "Cadangan belum dapat dibuat.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename =
        disposition.match(/filename="([^"]+)"/)?.[1] ??
        `buku-piutang-${new Date().toISOString().slice(0, 10)}.json`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Cadangan lengkap berhasil diunduh.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Cadangan belum dapat dibuat.",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <section className="mb-5 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex items-start gap-3 border-b border-border/70 p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <FileJson2 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold">Cadangan data</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Simpan salinan lengkap buku piutang atau pulihkan data dari berkas
              JSON.
            </p>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <Download className="size-4" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-sm font-bold">Unduh cadangan</h3>
            <p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">
              Mencakup pelanggan, nota, pembayaran, saldo, kasir, dan informasi
              toko.
            </p>
            <Button
              className="mt-4 h-9 w-full gap-2 rounded-lg text-xs! font-semibold!"
              disabled={downloading}
              onClick={() => void downloadBackup()}
            >
              {downloading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="size-4" aria-hidden="true" />
              )}
              {downloading ? "Menyiapkan cadangan…" : "Unduh cadangan sekarang"}
            </Button>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <span className="grid size-9 place-items-center rounded-lg bg-sky-50 text-sky-700">
              <RotateCcw className="size-4" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-sm font-bold">Pulihkan cadangan</h3>
            <p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">
              Mendukung cadangan terbaru dan berkas cadangan lama yang sudah
              digunakan.
            </p>
            <Button
              variant="outline"
              className="mt-4 h-9 w-full gap-2 rounded-lg text-xs! font-semibold! shadow-none"
              onClick={() => setImportOpen(true)}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Pilih berkas JSON
            </Button>
          </div>
        </div>
        <p className="flex items-start gap-2 border-t border-border/70 bg-secondary/30 px-5 py-3 text-xs leading-5 text-secondary-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Berkas dibuat khusus untuk akun yang sedang masuk. Simpan di tempat
          yang aman karena berisi data pelanggan dan transaksi.
        </p>
      </section>
      <ImportDialog
        importOpen={importOpen}
        setImportOpen={setImportOpen}
        saving={importing}
        setSaving={setImporting}
        loadData={afterImport}
      />
    </>
  );
}
