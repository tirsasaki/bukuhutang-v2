"use client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TabsContent } from "@/components/ui/tabs";
import {
  CalendarDays,
  Clock3,
  FileText,
  PencilLine,
  Phone,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import { formatDate, rupiah } from "@/lib/ledger/format";
import type { Customer } from "@/lib/ledger/types";

type Props = {
  selected: Customer;
  setEditCustomerOpen: (open: boolean) => void;
  saving: boolean;
  onDeleteCustomer: () => Promise<void>;
};
export function CustomerProfileTab({
  selected,
  setEditCustomerOpen,
  saving,
  onDeleteCustomer,
}: Props) {
  const details = [
    { label: "Nama pelanggan", value: selected.name, icon: UserRound },
    {
      label: "Kontak WhatsApp",
      value: selected.phone || "Belum diisi",
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
    <TabsContent value="profile" className="m-0 grid gap-3.5 p-3.5 @xl:p-5">
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        {details.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="min-w-0 rounded-2xl border border-border bg-card px-4 py-3.5"
          >
            <dt className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] text-subtle-foreground uppercase">
              <Icon className="size-3.5" aria-hidden="true" />
              {label}
            </dt>
            <dd
              className={`mt-1 text-[15px] font-bold break-words ${label === "Saldo kelebihan bayar" ? "text-success-fg tabular-nums" : ""}`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2 border-t border-border-soft pt-3.5 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-1.5 text-xs sm:h-8"
          onClick={() => setEditCustomerOpen(true)}
        >
          <PencilLine className="size-3.5" aria-hidden="true" />
          Ubah data pelanggan
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="danger-soft"
              size="sm"
              className="h-10 gap-1.5 text-xs sm:h-8"
              disabled={saving}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Hapus pelanggan
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus {selected.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini akan menghapus seluruh piutang, pembayaran, dan
                saldo milik pelanggan ini secara permanen. Data yang sudah
                dihapus tidak dapat dipulihkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Batal</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={saving}
                onClick={() => void onDeleteCustomer()}
              >
                {saving ? "Menghapus..." : "Ya, hapus pelanggan"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TabsContent>
  );
}
