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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

import type { Customer, SubmitForm } from "@/lib/ledger/types";
type Props = {
  customerOpen: boolean;
  setCustomerOpen: (open: boolean) => void;
  editCustomerOpen: boolean;
  setEditCustomerOpen: (open: boolean) => void;
  selected: Customer | null;
  saving: boolean;
  submitForm: SubmitForm;
};
export function CustomerDialogs({
  customerOpen,
  setCustomerOpen,
  editCustomerOpen,
  setEditCustomerOpen,
  selected,
  saving,
  submitForm,
}: Props) {
  return (
    <>
      <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
        <DialogContent>
          <form
            onSubmit={(event) =>
              void submitForm(event, "create_customer", () =>
                setCustomerOpen(false),
              )
            }
          >
            <DialogHeader>
              <DialogTitle>Tambah pelanggan</DialogTitle>
              <DialogDescription>
                Simpan nama dan nomor yang dapat dihubungi.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-5">
              <div className="space-y-2">
                <Label htmlFor="name">Nama pelanggan</Label>
                <Input id="name" name="name" required autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Nomor telepon</Label>
                <Input id="phone" name="phone" inputMode="tel" />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCustomerOpen(false)}
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

      <Dialog open={editCustomerOpen} onOpenChange={setEditCustomerOpen}>
        <DialogContent>
          <form
            key={selected?.id}
            onSubmit={(event) =>
              void submitForm(event, "update_customer", () =>
                setEditCustomerOpen(false),
              )
            }
          >
            <DialogHeader>
              <DialogTitle>Ubah data pelanggan</DialogTitle>
              <DialogDescription>
                Perbarui nama dan nomor WhatsApp tanpa mengubah riwayat piutang.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-5">
              <div className="space-y-2">
                <Label htmlFor="editName">Nama pelanggan</Label>
                <Input
                  id="editName"
                  name="name"
                  defaultValue={selected?.name ?? ""}
                  maxLength={100}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPhone">Nomor WhatsApp</Label>
                <Input
                  id="editPhone"
                  name="phone"
                  defaultValue={selected?.phone ?? ""}
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
                onClick={() => setEditCustomerOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving || !selected}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Simpan perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
