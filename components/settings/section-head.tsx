import type { ComponentType, ReactNode } from "react";

/** Kepala bagian pengaturan: kotak ikon, judul, deskripsi, dan tindakan opsional. */
export function SectionHead({
  icon: Icon,
  title,
  description,
  action,
  className = "mb-4",
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-[38px] shrink-0 place-items-center rounded-[11px] bg-secondary text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-[15px] font-extrabold tracking-tight">{title}</h2>
          <p className="text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}
