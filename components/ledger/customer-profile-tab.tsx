"use client";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import {
  CalendarDays,
  CircleDollarSign,
  Clock3,
  FileText,
  PencilLine,
  Phone,
  UserRound,
} from "lucide-react";

import { formatDate, rupiah } from "@/lib/ledger/format";
import type { Customer } from "@/lib/ledger/types";
type Props = {
  selected: Customer;
  setEditCustomerOpen: (open: boolean) => void;
};
export function CustomerProfileTab({ selected, setEditCustomerOpen }: Props) {
  return (
    <TabsContent value="profile" className="m-0 p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">Informasi pelanggan</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ringkasan identitas dan aktivitas pelanggan. Nomor WhatsApp
            disembunyikan untuk menjaga privasi.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-2"
          onClick={() => setEditCustomerOpen(true)}
        >
          <PencilLine className="size-4" /> Ubah data
        </Button>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <UserRound className="size-5" />
          </span>
          <span className="min-w-0">
            <dt className="text-xs font-medium text-muted-foreground">
              Nama pelanggan
            </dt>
            <dd className="mt-1 truncate font-bold">{selected.name}</dd>
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <Phone className="size-5" />
          </span>
          <span>
            <dt className="text-xs font-medium text-muted-foreground">
              Kontak WhatsApp
            </dt>
            <dd className="mt-1 font-bold">
              {selected.phone ? "Nomor tersimpan" : "Belum diisi"}
            </dd>
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <CalendarDays className="size-5" />
          </span>
          <span>
            <dt className="text-xs font-medium text-muted-foreground">
              Mulai tercatat
            </dt>
            <dd className="mt-1 font-bold">
              {formatDate(selected.created_at)}
            </dd>
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <FileText className="size-5" />
          </span>
          <span>
            <dt className="text-xs font-medium text-muted-foreground">
              Jumlah catatan
            </dt>
            <dd className="mt-1 font-bold">{selected.debt_count} piutang</dd>
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <Clock3 className="size-5" />
          </span>
          <span>
            <dt className="text-xs font-medium text-muted-foreground">
              Aktivitas terakhir
            </dt>
            <dd className="mt-1 font-bold">
              {formatDate(selected.last_activity_at)}
            </dd>
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <CircleDollarSign className="size-5" />
          </span>
          <span>
            <dt className="text-xs font-medium text-muted-foreground">
              Saldo kelebihan bayar
            </dt>
            <dd className="mt-1 font-bold text-emerald-700">
              {rupiah.format(selected.credit_balance)}
            </dd>
          </span>
        </div>
      </dl>
    </TabsContent>
  );
}
