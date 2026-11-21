"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  PencilLine,
  Plus,
  Save,
  Store,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BrandLogo, iconButtonClass } from "@/components/brand-logo";
import { BackupSettings } from "@/components/settings/backup-settings";
import { SectionHead } from "@/components/settings/section-head";
import { ThemeSwitch } from "@/components/theme-switch";
import { Toaster } from "@/components/ui/sonner";

const th =
  "h-auto px-3.5 py-2.5 text-[11px] font-bold tracking-[0.04em] text-subtle-foreground uppercase";

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-[9px] py-[3px] text-[11px] font-bold ${active ? "border-success-border bg-success-bg text-success-fg" : "border-border bg-background text-muted-foreground"}`}
    >
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}

type Cashier = {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
type StoreInformation = {
  name: string;
  address: string;
  updated_at: string | null;
};

export default function StoreSettingsPage() {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [store, setStore] = useState<StoreInformation>({
    name: "Toko Anda",
    address: "",
    updated_at: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStore, setSavingStore] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cashier | null>(null);

  const loadCashiers = useCallback(async () => {
    try {
      const [cashierResponse, storeResponse] = await Promise.all([
        fetch("/api/cashiers", { cache: "no-store" }),
        fetch("/api/store", { cache: "no-store" }),
      ]);
      const [cashierResult, storeResult] = await Promise.all([
        cashierResponse.json(),
        storeResponse.json(),
      ]);
      if (!cashierResponse.ok || !cashierResult.ok)
        throw new Error(
          cashierResult.message || "Daftar kasir belum dapat dibuka.",
        );
      if (!storeResponse.ok || !storeResult.ok)
        throw new Error(
          storeResult.message || "Informasi toko belum dapat dibuka.",
        );
      setCashiers(cashierResult.cashiers);
      setStore(storeResult.store);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Daftar kasir belum dapat dibuka.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCashiers(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCashiers]);

  async function saveCashier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch("/api/cashiers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: editing ? "update" : "create",
          id: editing?.id,
          ...values,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.message || "Kasir belum dapat disimpan.");
      await loadCashiers();
      setDialogOpen(false);
      setEditing(null);
      toast.success(
        editing ? "Informasi kasir diperbarui." : "Kasir baru ditambahkan.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Kasir belum dapat disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveStore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingStore(true);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch("/api/store", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(
          result.message || "Informasi toko belum dapat disimpan.",
        );
      setStore(result.store);
      toast.success("Informasi toko diperbarui.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Informasi toko belum dapat disimpan.",
      );
    } finally {
      setSavingStore(false);
    }
  }

  async function setActive(cashier: Cashier, isActive: boolean) {
    setCashiers((current) =>
      current.map((item) =>
        item.id === cashier.id ? { ...item, is_active: isActive } : item,
      ),
    );
    try {
      const response = await fetch("/api/cashiers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "set_active",
          id: cashier.id,
          isActive,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.message || "Status kasir belum dapat diubah.");
      toast.success(
        isActive
          ? `${cashier.name} diaktifkan.`
          : `${cashier.name} dinonaktifkan.`,
      );
    } catch (error) {
      setCashiers((current) =>
        current.map((item) =>
          item.id === cashier.id
            ? { ...item, is_active: cashier.is_active }
            : item,
        ),
      );
      toast.error(
        error instanceof Error
          ? error.message
          : "Status kasir belum dapat diubah.",
      );
    }
  }

  const activeCount = cashiers.filter((cashier) => cashier.is_active).length;

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <Toaster richColors position="top-right" />
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-card/95 px-3 backdrop-blur-xl sm:h-16 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-[11px]">
          <Link
            href="/"
            aria-label="Kembali ke buku piutang"
            title="Kembali"
            className={iconButtonClass}
          >
            <ArrowLeft className="size-[15px]" aria-hidden="true" />
          </Link>
          <BrandLogo className="hidden size-9 min-[380px]:grid sm:size-[38px]" />
          <div className="min-w-0">
            <p className="truncate text-[15px] leading-tight font-extrabold tracking-tight">
              Pengaturan Toko
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {store.name}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeSwitch />
          <Button
            size="sm"
            className="h-[34px] gap-1.5 px-2.5 text-xs sm:h-8"
            aria-label="Tambah kasir"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
            <span className="hidden min-[400px]:inline">Tambah kasir</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[920px] flex-col gap-[18px] px-3 pt-4 pb-10 sm:px-5 sm:pt-6">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
          <SectionHead
            icon={Store}
            title="Informasi toko"
            description="Nama dan alamat tampil pada header serta struk tagihan WhatsApp."
          />
          {loading ? (
            <div className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Membuka informasi
              toko…
            </div>
          ) : (
            <form
              key={store.updated_at ?? "new-store"}
              onSubmit={saveStore}
              className="grid max-w-[640px] gap-3"
            >
              <div className="space-y-[5px]">
                <Label htmlFor="storeName">Nama toko</Label>
                <Input
                  id="storeName"
                  name="name"
                  defaultValue={store.name}
                  maxLength={100}
                  placeholder="Contoh: Toko Berkah"
                  required
                />
              </div>
              <div className="space-y-[5px]">
                <Label htmlFor="storeAddress">Alamat toko</Label>
                <Textarea
                  id="storeAddress"
                  name="address"
                  defaultValue={store.address}
                  maxLength={500}
                  rows={2}
                  placeholder="Alamat lengkap toko"
                  className="min-h-16 resize-y"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  className="h-10 w-full gap-1.5 text-xs sm:h-8 sm:w-auto"
                  disabled={savingStore}
                >
                  {savingStore ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  {savingStore ? "Menyimpan…" : "Simpan informasi toko"}
                </Button>
              </div>
            </form>
          )}
        </section>

        <BackupSettings afterImport={loadCashiers} />

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          <div className="border-b border-border-soft p-4 sm:p-5 sm:pb-3.5">
            <SectionHead
              icon={UsersRound}
              title="Daftar Kasir"
              description={
                loading
                  ? "Membuka daftar kasir…"
                  : `${activeCount} dari ${cashiers.length} kasir aktif muncul saat pencatatan transaksi.`
              }
              className="mb-0"
              action={
                <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-background px-[9px] py-[3px] text-[11px] font-bold text-muted-foreground">
                  {loading ? "Memuat…" : `${cashiers.length} kasir`}
                </span>
              }
            />
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Membuka daftar kasir…
            </div>
          ) : cashiers.length ? (
            <>
              <ul className="divide-y divide-border-soft sm:hidden">
                {cashiers.map((cashier) => (
                  <li
                    key={cashier.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold break-words">
                        {cashier.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                        {cashier.phone || "WhatsApp belum diisi"}
                      </p>
                      <div className="mt-1.5">
                        <ActiveBadge active={cashier.is_active} />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Switch
                        checked={cashier.is_active}
                        onCheckedChange={(checked) =>
                          void setActive(cashier, checked)
                        }
                        aria-label={`${cashier.is_active ? "Nonaktifkan" : "Aktifkan"} ${cashier.name}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Ubah ${cashier.name}`}
                        onClick={() => {
                          setEditing(cashier);
                          setDialogOpen(true);
                        }}
                      >
                        <PencilLine className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <Table className="hidden sm:table">
                <TableHeader>
                  <TableRow className="border-border-soft bg-background hover:bg-background">
                    <TableHead className={th}>Kasir</TableHead>
                    <TableHead className={th}>WhatsApp</TableHead>
                    <TableHead className={th}>Status</TableHead>
                    <TableHead className={`${th} text-right`}>
                      <span className="sr-only">Tindakan</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashiers.map((cashier) => (
                    <TableRow
                      key={cashier.id}
                      className="border-border-soft hover:bg-card-hover"
                    >
                      <TableCell className="px-3.5 py-3 text-[13px] font-bold">
                        {cashier.name}
                      </TableCell>
                      <TableCell className="px-3.5 py-3 text-[13px] text-muted-foreground tabular-nums">
                        {cashier.phone || "Belum diisi"}
                      </TableCell>
                      <TableCell className="px-3.5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Switch
                            checked={cashier.is_active}
                            onCheckedChange={(checked) =>
                              void setActive(cashier, checked)
                            }
                            aria-label={`${cashier.is_active ? "Nonaktifkan" : "Aktifkan"} ${cashier.name}`}
                          />
                          <ActiveBadge active={cashier.is_active} />
                        </div>
                      </TableCell>
                      <TableCell className="px-3.5 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => {
                            setEditing(cashier);
                            setDialogOpen(true);
                          }}
                        >
                          <PencilLine className="size-3.5" /> Ubah
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <div className="p-10 text-center">
              <UsersRound className="mx-auto size-10 text-muted-foreground" />
              <h2 className="mt-4 font-bold">Belum ada kasir</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tambahkan kasir agar nama dapat dipilih saat mencatat
                transaksi.
              </p>
              <Button className="mt-5" onClick={() => setDialogOpen(true)}>
                Tambah kasir pertama
              </Button>
            </div>
          )}
        </section>
      </div>
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <form key={editing?.id ?? "new"} onSubmit={saveCashier}>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Ubah informasi kasir" : "Tambah kasir"}
              </DialogTitle>
              <DialogDescription>
                Nama kasir akan digunakan pada catatan transaksi toko.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-5">
              <div className="space-y-2">
                <Label htmlFor="cashierName">Nama kasir</Label>
                <Input
                  id="cashierName"
                  name="name"
                  defaultValue={editing?.name ?? ""}
                  maxLength={100}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cashierPhone">Nomor WhatsApp</Label>
                <Input
                  id="cashierPhone"
                  name="phone"
                  defaultValue={editing?.phone ?? ""}
                  maxLength={30}
                  inputMode="tel"
                  placeholder="Contoh: 0812 3456 7890"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
