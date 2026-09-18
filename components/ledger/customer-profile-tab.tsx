"use client";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import {
  CalendarDays,
  Clock3,
  FileText,
  PencilLine,
  Phone,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { formatDate, rupiah } from "@/lib/ledger/format";
import type { Customer } from "@/lib/ledger/types";

type Props = {
  selected: Customer;
  setEditCustomerOpen: (open: boolean) => void;
};
export function CustomerProfileTab({ selected, setEditCustomerOpen }: Props) {
  const details = [
    { label: "Nama pelanggan", value: selected.name, icon: UserRound },
    {
      label: "Kontak WhatsApp",
      value: selected.phone ? "Nomor tersimpan" : "Belum diisi",
      icon: Phone,
    },
    {
      label: "Pelanggan sejak",
      value: formatDate(selected.created_at),
      icon: CalendarDays,
    },
    {
      label: "Aktivitas terakhir",
      value: formatDate(selected.last_activity_at),
      icon: Clock3,
    },
    {
      label: "Jumlah catatan",
      value: `${selected.debt_count} piutang`,
      icon: FileText,
    },
    {
      label: "Saldo kelebihan bayar",
      value: rupiah.format(selected.credit_balance),
      icon: WalletCards,
    },
  ];
  return (
    <TabsContent value="profile" className="m-0 p-4 @xl:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">Informasi pelanggan</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Identitas, aktivitas, dan saldo pelanggan dalam satu tempat.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-lg text-xs! font-medium! shadow-none"
          onClick={() => setEditCustomerOpen(true)}
        >
          <PencilLine className="size-3.5" aria-hidden="true" />
          Ubah data
        </Button>
      </div>
      <dl className="mt-5 grid overflow-hidden rounded-xl border border-border/80 @xl:grid-cols-2">
        {details.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex items-start gap-3 border-b border-border/60 p-4 last:border-b-0 @xl:odd:border-r @xl:[&:nth-last-child(2)]:border-b-0"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted/70 text-muted-foreground">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <dt className="text-[11px] text-muted-foreground">{label}</dt>
              <dd
                className={`mt-1 break-words text-sm font-semibold ${label === "Saldo kelebihan bayar" ? "text-emerald-800 tabular-nums" : ""}`}
              >
                {value}
              </dd>
            </div>
          </div>
        ))}
      </dl>
      <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Nomor WhatsApp disembunyikan untuk menjaga privasi. Gunakan Ubah data
        untuk memperbaruinya.
      </p>
    </TabsContent>
  );
}
