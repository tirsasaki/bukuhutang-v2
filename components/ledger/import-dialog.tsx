"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

type Props = {
  importOpen: boolean;
  setImportOpen: (open: boolean) => void;
  saving: boolean;
  setSaving: (open: boolean) => void;
  loadData: () => Promise<void>;
};
export function ImportDialog({
  importOpen,
  setImportOpen,
  saving,
  setSaving,
  loadData,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    setSaving(true);
    let imported = 0;
    let duplicates = 0;
    try {
      for (const file of Array.from(files)) {
        const raw = await file.text();
        const response = await fetch("/api/import", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: raw,
        });
        const result = await response.json();
        if (!response.ok || !result.ok)
          throw new Error(`${file.name}: ${result.message || "gagal diimpor"}`);
        if (result.duplicate) duplicates += 1;
        else imported += Number(result.imported || 0);
      }
      await loadData();
      toast.success(
        imported
          ? `${imported} catatan berhasil dipulihkan.`
          : `${duplicates} cadangan sudah pernah diimpor.`,
      );
      setImportOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Cadangan belum dapat dipulihkan.",
      );
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Dialog open={importOpen} onOpenChange={setImportOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pulihkan cadangan data</DialogTitle>
          <DialogDescription>
            Pilih satu atau beberapa berkas JSON cadangan Buku Piutang.
            Identitas data dipertahankan agar catatan ganda dapat dilewati.
          </DialogDescription>
        </DialogHeader>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="grid min-h-44 place-items-center rounded-2xl border-2 border-dashed border-border bg-muted/40 p-6 text-center transition-colors hover:border-primary/40 hover:bg-secondary/50"
        >
          <span>
            <UploadCloud className="mx-auto size-9 text-primary" />
            <span className="mt-3 block font-semibold">
              Pilih berkas cadangan JSON
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Cadangan terbaru dan format lama didukung
            </span>
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          multiple
          className="hidden"
          onChange={(event) => void importFiles(event.target.files)}
        />
        <div className="flex items-start gap-2 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>
            Impor yang sama tidak akan menggandakan pelanggan, transaksi,
            kasir, atau informasi toko.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setImportOpen(false)}>
            Batal
          </Button>
          <Button onClick={() => fileRef.current?.click()} disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}Pilih
            berkas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
