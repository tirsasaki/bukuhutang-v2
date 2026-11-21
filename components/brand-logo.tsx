import { BookOpenText } from "lucide-react";
import { cn } from "@/lib/utils";

/** Logo Buku Piutang: kotak gradien teal dengan ikon buku. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid size-[38px] shrink-0 place-items-center rounded-xl bg-linear-135 from-[#0b4f55] to-[#16857d] text-white shadow-[0_4px_12px_rgba(11,79,85,0.22)]",
        className,
      )}
    >
      <BookOpenText className="size-[18px]" aria-hidden="true" />
    </div>
  );
}

export const iconButtonClass =
  "grid size-[34px] shrink-0 place-items-center rounded-[10px] border border-border bg-card text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none";
