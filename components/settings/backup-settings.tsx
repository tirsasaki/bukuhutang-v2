"use client";

import { ImportDialog } from "@/components/ledger/import-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CloudDownload,
  CloudUpload,
  Download,
  FileJson2,
  GitBranch,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Props = { afterImport: () => Promise<void> };

type GitHubBackup = {
  name: string;
  path: string;
  sha: string;
  size: number;
  createdAt: string | null;
  legacy: boolean;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function backupTimeInformation(backup: GitHubBackup) {
  if (!backup.createdAt) return null;
  const createdAt = new Date(backup.createdAt);
  if (Number.isNaN(createdAt.getTime())) return null;
  return {
    date: new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(createdAt),
    time: new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: "Asia/Jakarta",
    }).format(createdAt),
  };
}

export function BackupSettings({ afterImport }: Props) {
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [githubBackups, setGithubBackups] = useState<GitHubBackup[]>([]);
  const [githubConfigured, setGithubConfigured] = useState(true);
  const [githubError, setGithubError] = useState("");
  const [loadingGithub, setLoadingGithub] = useState(true);
  const [uploadingGithub, setUploadingGithub] = useState(false);
  const [restoringPath, setRestoringPath] = useState<string | null>(null);

  const loadGitHubBackups = useCallback(async (showError = true) => {
    setLoadingGithub(true);
    setGithubError("");
    try {
      const response = await fetch("/api/github-backups", {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(
          result.message || "Cadangan GitHub belum dapat dibuka.",
        );
      setGithubConfigured(result.configured);
      setGithubBackups(result.backups ?? []);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Cadangan GitHub belum dapat dibuka.";
      setGithubError(message);
      if (showError)
        toast.error(message);
    } finally {
      setLoadingGithub(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      () => void loadGitHubBackups(false),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [loadGitHubBackups]);

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

  async function uploadToGitHub() {
    setUploadingGithub(true);
    try {
      const response = await fetch("/api/github-backups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "upload" }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(
          result.message || "Cadangan belum dapat disimpan ke GitHub.",
        );
      await loadGitHubBackups(false);
      toast.success("Cadangan terbaru berhasil disimpan ke GitHub.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Cadangan belum dapat disimpan ke GitHub.",
      );
    } finally {
      setUploadingGithub(false);
    }
  }

  async function restoreFromGitHub(backup: GitHubBackup) {
    setRestoringPath(backup.path);
    try {
      const readResponse = await fetch("/api/github-backups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "read", path: backup.path }),
      });
      const readResult = await readResponse.json();
      if (!readResponse.ok || !readResult.ok)
        throw new Error(
          readResult.message || "Cadangan belum dapat diambil dari GitHub.",
        );

      const importResponse = await fetch("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(readResult.backup),
      });
      const importResult = await importResponse.json();
      if (!importResponse.ok || !importResult.ok)
        throw new Error(
          importResult.message || "Cadangan belum dapat dipulihkan.",
        );
      await afterImport();
      toast.success(
        importResult.duplicate
          ? "Cadangan ini sudah pernah dipulihkan."
          : `${Number(importResult.imported || 0)} catatan berhasil dipulihkan dari GitHub.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Cadangan belum dapat dipulihkan.",
      );
    } finally {
      setRestoringPath(null);
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
              Simpan seluruh data toko ke GitHub atau unduh salinan ke perangkat.
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="overflow-hidden rounded-2xl border border-primary/20 bg-secondary/35">
            <div className="flex flex-col gap-4 border-b border-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <GitBranch className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold">Cadangan GitHub</h3>
                    <Badge variant="outline" className="bg-background/70">
                      Repositori privat
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Riwayat tersimpan di tirsasaki/bukuhutang-backup.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="shrink-0 bg-background"
                  aria-label="Muat ulang daftar cadangan GitHub"
                  disabled={loadingGithub}
                  onClick={() => void loadGitHubBackups()}
                >
                  <RefreshCw
                    className={`size-4 ${loadingGithub ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                </Button>
                <Button
                  type="button"
                  className="h-9 flex-1 gap-2 rounded-lg text-xs! font-semibold! sm:flex-none"
                  disabled={
                    uploadingGithub || loadingGithub || !githubConfigured
                  }
                  onClick={() => void uploadToGitHub()}
                >
                  {uploadingGithub ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <CloudUpload className="size-4" aria-hidden="true" />
                  )}
                  {uploadingGithub ? "Menyimpan…" : "Simpan ke GitHub"}
                </Button>
              </div>
            </div>

            {loadingGithub ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Membuka riwayat cadangan…
              </div>
            ) : githubError ? (
              <div className="flex items-start gap-3 p-4 text-sm">
                <AlertCircle
                  className="mt-0.5 size-5 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold">GitHub belum dapat dihubungi</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {githubError}
                  </p>
                </div>
              </div>
            ) : !githubConfigured ? (
              <div className="flex items-start gap-3 p-4 text-sm">
                <AlertCircle
                  className="mt-0.5 size-5 shrink-0 text-amber-900 dark:text-amber-300"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold">GitHub belum terhubung</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Tambahkan token repositori pada konfigurasi server untuk
                    mulai menyimpan cadangan.
                  </p>
                </div>
              </div>
            ) : githubBackups.length ? (
              <div className="divide-y divide-border/70">
                {githubBackups.map((backup) => {
                  const restoring = restoringPath === backup.path;
                  const timeInformation = backupTimeInformation(backup);
                  return (
                    <div
                      key={backup.sha || backup.path}
                      className="flex flex-col gap-3 bg-background/55 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-background text-primary">
                          <CheckCircle2 className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {timeInformation?.date ?? "Cadangan lama"}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                            {timeInformation && (
                              <>
                                <Clock3 className="size-3.5" aria-hidden="true" />
                                <span>Pukul {timeInformation.time}</span>
                                <span aria-hidden="true">·</span>
                              </>
                            )}
                            <span>
                              {formatSize(backup.size)}
                              {backup.legacy ? " · Format lama" : " · GitHub"}
                            </span>
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-background shadow-none"
                        disabled={Boolean(restoringPath)}
                        onClick={() => void restoreFromGitHub(backup)}
                      >
                        {restoring ? (
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <CloudDownload
                            className="size-4"
                            aria-hidden="true"
                          />
                        )}
                        {restoring ? "Memulihkan…" : "Pulihkan"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-7 text-center">
                <CloudUpload
                  className="mx-auto size-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-semibold">
                  Belum ada cadangan GitHub
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Simpan cadangan pertama untuk membuat riwayat pemulihan.
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-300">
                <Download className="size-4" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-sm font-bold">Unduh ke perangkat</h3>
              <p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">
                Simpan salinan JSON yang dapat dipindahkan atau diarsipkan
                sendiri.
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
                {downloading ? "Menyiapkan…" : "Unduh cadangan"}
              </Button>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <span className="grid size-9 place-items-center rounded-lg bg-sky-50 text-sky-900 dark:bg-sky-400/15 dark:text-sky-300">
                <RotateCcw className="size-4" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-sm font-bold">Impor dari perangkat</h3>
              <p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">
                Pulihkan cadangan terbaru atau berkas format lama dari perangkat.
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
        </div>
        <p className="flex items-start gap-2 border-t border-border/70 bg-secondary/30 px-5 py-3 text-xs leading-5 text-secondary-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Token GitHub hanya digunakan oleh server. Berkas yang ditampilkan
          dibatasi untuk akun yang sedang masuk.
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
