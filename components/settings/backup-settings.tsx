"use client";

import { ImportDialog } from "@/components/ledger/import-dialog";
import { SectionHead } from "@/components/settings/section-head";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Cloud,
  CloudDownload,
  CloudUpload,
  Download,
  FileJson2,
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

function Notice({
  tone,
  title,
  text,
}: {
  tone: "danger" | "warning";
  title: string;
  text: string;
}) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-sm ${tone === "danger" ? "border-danger-border bg-danger-bg" : "border-warning-border bg-warning-bg"}`}
    >
      <AlertCircle
        className={`mt-0.5 size-4 shrink-0 ${tone === "danger" ? "text-destructive" : "text-warning-fg"}`}
        aria-hidden="true"
      />
      <div>
        <p className="text-[13px] font-bold">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
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
      <section className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
        <SectionHead
          icon={Cloud}
          title="Cadangan & Pemulihan Data"
          description="Format JSON bukuhutang-v2 · Menyimpan maks. 3 cadangan terbaru di GitHub privat."
          action={
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 gap-1.5 text-xs sm:h-8"
                disabled={downloading}
                onClick={() => void downloadBackup()}
              >
                {downloading ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="size-3.5" aria-hidden="true" />
                )}
                {downloading ? "Menyiapkan…" : "Unduh JSON"}
              </Button>
              <Button
                type="button"
                variant="success"
                size="sm"
                className="h-10 gap-1.5 text-xs sm:h-8"
                disabled={uploadingGithub || loadingGithub || !githubConfigured}
                onClick={() => void uploadToGitHub()}
              >
                {uploadingGithub ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <CloudUpload className="size-3.5" aria-hidden="true" />
                )}
                {uploadingGithub ? "Menyimpan…" : "Simpan ke GitHub"}
              </Button>
            </div>
          }
        />

        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold tracking-wide text-subtle-foreground uppercase">
            Riwayat cadangan GitHub
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            aria-label="Muat ulang daftar cadangan GitHub"
            disabled={loadingGithub}
            onClick={() => void loadGitHubBackups()}
          >
            <RefreshCw
              className={`size-3.5 ${loadingGithub ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Muat ulang
          </Button>
        </div>

        {loadingGithub ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border-soft bg-background p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Membuka riwayat cadangan…
          </div>
        ) : githubError ? (
          <Notice
            tone="danger"
            title="GitHub belum dapat dihubungi"
            text={githubError}
          />
        ) : !githubConfigured ? (
          <Notice
            tone="warning"
            title="GitHub belum terhubung"
            text="Tambahkan token repositori pada konfigurasi server untuk mulai menyimpan cadangan."
          />
        ) : githubBackups.length ? (
          <ul className="grid gap-2">
            {githubBackups.map((backup, index) => {
              const restoring = restoringPath === backup.path;
              const timeInformation = backupTimeInformation(backup);
              return (
                <li
                  key={backup.sha || backup.path}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-soft bg-background px-3.5 py-[11px]"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 font-mono text-[12.5px] font-bold break-all">
                      {backup.name}
                      {index === 0 && (
                        <span className="rounded-full border border-success-border bg-success-bg px-[9px] py-[3px] font-sans text-[11px] font-bold text-success-fg">
                          Terbaru
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {timeInformation
                        ? `${timeInformation.date}, ${timeInformation.time}`
                        : "Cadangan lama"}{" "}
                      · {formatSize(backup.size)}
                      {backup.legacy ? " · Format lama" : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-full gap-1.5 text-xs sm:h-8 sm:w-auto"
                    disabled={Boolean(restoringPath)}
                    onClick={() => void restoreFromGitHub(backup)}
                  >
                    {restoring ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <CloudDownload className="size-3.5" aria-hidden="true" />
                    )}
                    {restoring ? "Memulihkan…" : "Pulihkan"}
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <CloudUpload
              className="mx-auto size-7 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm font-bold">Belum ada cadangan GitHub</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Simpan cadangan pertama untuk membuat riwayat pemulihan.
            </p>
          </div>
        )}

        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-border-soft p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-info-bg text-info-fg">
              <RotateCcw className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold">Impor dari perangkat</p>
              <p className="text-xs leading-5 text-muted-foreground">
                Pulihkan cadangan JSON terbaru atau berkas format lama.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5 text-xs sm:h-8"
            onClick={() => setImportOpen(true)}
          >
            <FileJson2 className="size-3.5" aria-hidden="true" />
            Pilih berkas JSON
          </Button>
        </div>

        <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
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
