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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy, MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { whatsappNumber } from "@/lib/ledger/format";
import { buildShareMessages } from "@/lib/ledger/share";
import type {
  Customer,
  Debt,
  LedgerData,
  ShareDisplayOptions,
  ShareStyle,
} from "@/lib/ledger/types";
type Props = {
  shareOpen: boolean;
  setShareOpen: (open: boolean) => void;
  selected: Customer | null;
  selectedDebts: Debt[];
  store: LedgerData["store"];
};
export function ShareDialog({
  shareOpen,
  setShareOpen,
  selected,
  selectedDebts,
  store,
}: Props) {
  const [shareStyle, setShareStyle] = useState<ShareStyle>("detailed");
  const [displayOptions, setDisplayOptions] = useState<ShareDisplayOptions>({
    storeName: true,
    storeAddress: true,
    invoiceNumber: true,
    customerName: true,
  });
  const shareMessages = useMemo(
    () => buildShareMessages(selected, selectedDebts, store, displayOptions),
    [displayOptions, selected, selectedDebts, store],
  );
  const shareMessage = shareMessages[shareStyle];
  async function copyDebtDetails() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareMessage);
      } else {
        // Cadangan untuk HTTP biasa: Clipboard API hanya ada di konteks aman.
        const area = document.createElement("textarea");
        area.value = shareMessage;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(area);
        if (!copied) throw new Error("copy failed");
      }
      toast.success("Rincian piutang berhasil disalin.");
    } catch {
      toast.error(
        "Rincian belum dapat disalin. Pilih teks lalu salin secara manual.",
      );
    }
  }

  function openWhatsApp() {
    if (!selected) return;
    const phone = whatsappNumber(selected.phone);
    if (!phone) {
      toast.error("Nomor WhatsApp pelanggan belum diisi.");
      return;
    }
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(shareMessage)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <Dialog open={shareOpen} onOpenChange={setShareOpen}>
      <DialogContent
        className="sm:max-w-[720px]"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            Bagikan rincian piutang{selected ? ` · ${selected.name}` : ""}
          </DialogTitle>
          <DialogDescription>
            Pilih gaya pesan, atur elemen yang ditampilkan, lalu salin atau
            buka WhatsApp. Pesan tidak dikirim otomatis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5 py-1">
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                {
                  id: "formal",
                  title: "Santai & informatif",
                  note: "Ringkas dengan rincian item",
                },
                {
                  id: "detailed",
                  title: "Struk tagihan",
                  note: "Rapi dengan garis & nomor nota",
                },
                {
                  id: "friendly",
                  title: "Pengingat ramah",
                  note: "Bahasa sopan & hangat",
                },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setShareStyle(option.id)}
                aria-pressed={shareStyle === option.id}
                className={`rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${shareStyle === option.id ? "border-ring bg-secondary" : "border-border bg-card hover:bg-card-hover"}`}
              >
                <span className="block text-[12.5px] font-bold">{option.title}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {option.note}
                </span>
              </button>
            ))}
          </div>
          <div className="rounded-xl bg-background p-2.5">
            <p className="px-1 pb-2 text-[11px] font-bold tracking-wide text-subtle-foreground uppercase">
              Informasi yang ditampilkan
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {(
                [
                  ["storeName", "Nama toko"],
                  ["storeAddress", "Alamat toko"],
                  ["invoiceNumber", "Nomor nota (INV)"],
                  ["customerName", "Nama pelanggan"],
                ] as const
              ).map(([key, label]) => (
                <Label
                  key={key}
                  htmlFor={`share-${key}`}
                  className="flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-lg border border-border-soft bg-card px-2.5 py-2 text-foreground"
                >
                  <span className="text-xs font-medium">{label}</span>
                  <Switch
                    id={`share-${key}`}
                    size="sm"
                    checked={displayOptions[key]}
                    disabled={key === "storeAddress" && !store.address}
                    onCheckedChange={(checked) =>
                      setDisplayOptions((current) => ({
                        ...current,
                        [key]: checked,
                      }))
                    }
                  />
                </Label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sharePreview">Pratinjau pesan WhatsApp</Label>
            <textarea
              id="sharePreview"
              readOnly
              value={shareMessage}
              rows={14}
              className="w-full resize-y rounded-[14px] border border-[#c5e6cb] bg-[#e7f6e9] px-4 py-3.5 font-mono text-xs leading-[1.55] text-[#112a16] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 dark:border-[#1f4736] dark:bg-[#10251c] dark:text-[#d6f5e1]"
            />
          </div>
          {!selected?.phone && (
            <p className="rounded-xl border border-warning-border bg-warning-bg p-3 text-xs text-warning-fg">
              Nomor WhatsApp pelanggan belum diisi. Rincian tetap dapat disalin.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => void copyDebtDetails()}
          >
            <Copy className="size-4" /> Salin teks
          </Button>
          <Button
            type="button"
            variant="success"
            className="gap-2"
            disabled={whatsappNumber(selected?.phone ?? "").length < 9}
            onClick={openWhatsApp}
          >
            <MessageCircle className="size-4" /> Buka WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
