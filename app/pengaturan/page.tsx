"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BookOpenText, Loader2, PencilLine, Plus, Store, UsersRound } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Cashier = {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export default function StoreSettingsPage() {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cashier | null>(null);

  const loadCashiers = useCallback(async () => {
    try {
      const response = await fetch("/api/cashiers", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Daftar kasir belum dapat dibuka.");
      setCashiers(result.cashiers);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Daftar kasir belum dapat dibuka.");
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
        body: JSON.stringify({ action: editing ? "update" : "create", id: editing?.id, ...values }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Kasir belum dapat disimpan.");
      await loadCashiers();
      setDialogOpen(false);
      setEditing(null);
      toast.success(editing ? "Informasi kasir diperbarui." : "Kasir baru ditambahkan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kasir belum dapat disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function setActive(cashier: Cashier, isActive: boolean) {
    setCashiers((current) => current.map((item) => item.id === cashier.id ? { ...item, is_active: isActive } : item));
    try {
      const response = await fetch("/api/cashiers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set_active", id: cashier.id, isActive }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Status kasir belum dapat diubah.");
      toast.success(isActive ? `${cashier.name} diaktifkan.` : `${cashier.name} dinonaktifkan.`);
    } catch (error) {
      setCashiers((current) => current.map((item) => item.id === cashier.id ? { ...item, is_active: cashier.is_active } : item));
      toast.error(error instanceof Error ? error.message : "Status kasir belum dapat diubah.");
    }
  }

  const activeCount = cashiers.filter((cashier) => cashier.is_active).length;

  return (
    <main className="min-h-screen bg-muted/40 text-foreground">
      <Toaster richColors position="top-right" />
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon-sm"><Link href="/" aria-label="Kembali ke buku piutang"><ArrowLeft className="size-4" /></Link></Button>
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><BookOpenText className="size-5" /></div>
          <div><p className="font-bold leading-tight">Pengaturan Toko</p><p className="text-xs text-muted-foreground">Kasir dan operasional</p></div>
        </div>
        <Button className="gap-2" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="size-4" /> Tambah kasir</Button>
      </header>

      <div className="mx-auto max-w-5xl p-4 lg:p-8">
        <section className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><UsersRound className="size-5" /></div><div><p className="text-sm text-muted-foreground">Kasir aktif</p><p className="text-2xl font-bold">{activeCount}</p></div></div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><Store className="size-5" /></div><div><p className="text-sm text-muted-foreground">Total kasir tercatat</p><p className="text-2xl font-bold">{cashiers.length}</p></div></div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div><h1 className="text-lg font-bold">Informasi kasir</h1><p className="mt-1 text-sm text-muted-foreground">Kasir aktif akan muncul saat mencatat piutang dan pembayaran.</p></div>
          </div>
          {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Membuka daftar kasir…</div> : cashiers.length ? (
            <Table>
              <TableHeader><TableRow><TableHead>Nama kasir</TableHead><TableHead>Nomor WhatsApp</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Tindakan</TableHead></TableRow></TableHeader>
              <TableBody>{cashiers.map((cashier) => (
                <TableRow key={cashier.id}>
                  <TableCell className="font-semibold">{cashier.name}</TableCell>
                  <TableCell>{cashier.phone || "Belum diisi"}</TableCell>
                  <TableCell><div className="flex items-center gap-2"><Switch checked={cashier.is_active} onCheckedChange={(checked) => void setActive(cashier, checked)} aria-label={`${cashier.is_active ? "Nonaktifkan" : "Aktifkan"} ${cashier.name}`} /><Badge variant={cashier.is_active ? "default" : "secondary"}>{cashier.is_active ? "Aktif" : "Nonaktif"}</Badge></div></TableCell>
                  <TableCell className="text-right"><Button variant="outline" size="sm" className="gap-2" onClick={() => { setEditing(cashier); setDialogOpen(true); }}><PencilLine className="size-4" /> Ubah</Button></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center"><UsersRound className="mx-auto size-10 text-muted-foreground" /><h2 className="mt-4 font-bold">Belum ada kasir</h2><p className="mt-1 text-sm text-muted-foreground">Tambahkan tiga kasir Anda agar nama dapat dipilih saat mencatat transaksi.</p><Button className="mt-5" onClick={() => setDialogOpen(true)}>Tambah kasir pertama</Button></div>
          )}
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}>
        <DialogContent><form key={editing?.id ?? "new"} onSubmit={saveCashier}>
          <DialogHeader><DialogTitle>{editing ? "Ubah informasi kasir" : "Tambah kasir"}</DialogTitle><DialogDescription>Nama kasir akan digunakan pada catatan transaksi toko.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-5">
            <div className="space-y-2"><Label htmlFor="cashierName">Nama kasir</Label><Input id="cashierName" name="name" defaultValue={editing?.name ?? ""} maxLength={100} required autoFocus /></div>
            <div className="space-y-2"><Label htmlFor="cashierPhone">Nomor WhatsApp</Label><Input id="cashierPhone" name="phone" defaultValue={editing?.phone ?? ""} maxLength={30} inputMode="tel" placeholder="Contoh: 0812 3456 7890" /></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Simpan</Button></DialogFooter>
        </form></DialogContent>
      </Dialog>
    </main>
  );
}
