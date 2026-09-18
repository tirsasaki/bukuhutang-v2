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
import { Copy, MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { whatsappNumber } from "@/lib/ledger/format";
import { buildShareMessages } from "@/lib/ledger/share";
import type {
  Customer,
  Debt,
  LedgerData,
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
  const shareMessages = useMemo(
    () => buildShareMessages(selected, selectedDebts, store),
    [selected, selectedDebts, store],
  );
  const shareMessage = shareMessages[shareStyle];
  async function copyDebtDetails() {
    try {
      await navigator.clipboard.writeText(shareMessage);
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
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bagikan rincian piutang {selected?.name}</DialogTitle>
          <DialogDescription>
            Pilih gaya pesan, lalu salin teks atau buka percakapan WhatsApp.
            Pesan tidak dikirim otomatis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                {
                  id: "formal",
                  title: "Ringkas & formal",
                  note: "Cocok untuk pemberitahuan umum",
                },
                {
                  id: "detailed",
                  title: "Struk tagihan",
                  note: "Tampilan rapi dengan pembatas dan nota",
                },
                {
                  id: "friendly",
                  title: "Pengingat ramah",
                  note: "Bahasa santai dan sopan",
                },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setShareStyle(option.id)}
                className={`rounded-xl border p-3 text-left transition-colors ${shareStyle === option.id ? "border-primary bg-secondary" : "border-border hover:bg-muted"}`}
              >
                <span className="block font-semibold">{option.title}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {option.note}
                </span>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sharePreview">Pratinjau pesan</Label>
            <textarea
              id="sharePreview"
              readOnly
              value={shareMessage}
              rows={16}
              className={`w-full resize-y rounded-xl border border-input bg-muted/30 px-3 py-3 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 ${shareStyle === "detailed" ? "font-mono" : ""}`}
            />
          </div>
          {!selected?.phone && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
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
            <Copy className="size-4" /> Salin rincian
          </Button>
          <Button
            type="button"
            className="gap-2 bg-emerald-700 hover:bg-emerald-800"
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
