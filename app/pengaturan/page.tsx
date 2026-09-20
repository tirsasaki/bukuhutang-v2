"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpenText,
  Loader2,
  MapPin,
  PencilLine,
  Phone,
  Plus,
  Save,
  Store,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { BackupSettings } from "@/components/settings/backup-settings";
import { ThemeSwitch } from "@/components/theme-switch";
import { Toaster } from "@/components/ui/sonner";

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
    <main className="min-h-screen bg-muted/40 text-foreground">
      <Toaster richColors position="top-right" />
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost" size="icon-sm">
            <Link href="/" aria-label="Kembali ke buku piutang">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <BookOpenText className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight sm:text-base">Pengaturan Toko</p>
            <p className="truncate text-xs text-muted-foreground">{store.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitch compact />
          <Button
            className="gap-2"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Tambah kasir</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-4 lg:p-8">
        <section className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">
              <Store className="size-4" />
            </div>
            <div>
              <h1 className="text-base font-bold">Informasi toko</h1>
              <p className="text-xs leading-5 text-muted-foreground">
                Nama dan alamat ini digunakan pada identitas serta struk
                tagihan.
              </p>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Membuka informasi
              toko…
            </div>
          ) : (
            <form
              key={store.updated_at ?? "new-store"}
              onSubmit={saveStore}
              className="max-w-3xl space-y-3"
            >
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="storeName" className="text-xs">
                    Nama toko
                  </Label>
                  <div className="relative">
                    <Store
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="storeName"
                      name="name"
                      defaultValue={store.name}
                      maxLength={100}
                      placeholder="Contoh: Toko Berkah"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="storeAddress" className="text-xs">
                    Alamat toko
                  </Label>
                  <div className="relative">
                    <MapPin
                      className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Textarea
                      id="storeAddress"
                      name="address"
                      defaultValue={store.address}
                      maxLength={500}
                      rows={2}
                      placeholder="Alamat lengkap toko"
                      className="min-h-16 resize-y pl-9"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" className="gap-2" disabled={savingStore}>
                  <Save className="size-4" />
                  {savingStore ? "Menyimpan…" : "Simpan informasi toko"}
                </Button>
              </div>
            </form>
          )}
        </section>

        <BackupSettings afterImport={loadCashiers} />

        <section className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                <UsersRound className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kasir aktif</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                <Store className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total kasir tercatat
                </p>
                <p className="text-2xl font-bold">{cashiers.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <UsersRound className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold">Informasi kasir</h1>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  Kasir aktif akan muncul saat mencatat piutang dan pembayaran.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-background text-xs">
              {loading ? "Memuat…" : `${cashiers.length} kasir`}
            </Badge>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Membuka daftar kasir…
            </div>
          ) : cashiers.length ? (
            <>
              <div className="space-y-2.5 p-3 sm:hidden">
                {cashiers.map((cashier) => (
                  <article
                    key={cashier.id}
                    className="rounded-xl border border-border/70 bg-background p-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-bold text-primary">
                          {cashier.name.trim().charAt(0).toUpperCase() || "K"}
                        </span>
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold">
                            {cashier.name}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 break-all text-xs text-muted-foreground">
                            <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                            {cashier.phone || "WhatsApp belum diisi"}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          cashier.is_active
                            ? "border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {cashier.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                      <label className="flex items-center gap-2 text-xs font-medium">
                        <Switch
                          checked={cashier.is_active}
                          onCheckedChange={(checked) =>
                            void setActive(cashier, checked)
                          }
                          aria-label={`${cashier.is_active ? "Nonaktifkan" : "Aktifkan"} ${cashier.name}`}
                        />
                        Status kasir
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => {
                          setEditing(cashier);
                          setDialogOpen(true);
                        }}
                      >
                        <PencilLine className="size-3.5" /> Ubah
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
              <Table className="hidden table-fixed sm:table">
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9 w-[32%] px-4 text-[11px] uppercase tracking-wide text-muted-foreground">
                      Kasir
                    </TableHead>
                    <TableHead className="h-9 w-[30%] px-4 text-[11px] uppercase tracking-wide text-muted-foreground">
                      Nomor WhatsApp
                    </TableHead>
                    <TableHead className="h-9 w-[24%] px-4 text-[11px] uppercase tracking-wide text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="h-9 w-[14%] px-4 text-right text-[11px] uppercase tracking-wide text-muted-foreground">
                      Tindakan
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashiers.map((cashier) => (
                    <TableRow key={cashier.id} className="h-14">
                      <TableCell className="px-4 py-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-bold text-primary">
                            {cashier.name.trim().charAt(0).toUpperCase() || "K"}
                          </span>
                          <span className="truncate font-semibold">
                            {cashier.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            {cashier.phone || "Belum diisi"}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={cashier.is_active}
                            onCheckedChange={(checked) =>
                              void setActive(cashier, checked)
                            }
                            aria-label={`${cashier.is_active ? "Nonaktifkan" : "Aktifkan"} ${cashier.name}`}
                          />
                          <Badge
                            variant="outline"
                            className={
                              cashier.is_active
                                ? "border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {cashier.is_active ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
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
            <div className="p-12 text-center">
              <UsersRound className="mx-auto size-10 text-muted-foreground" />
              <h2 className="mt-4 font-bold">Belum ada kasir</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tambahkan tiga kasir Anda agar nama dapat dipilih saat mencatat
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
