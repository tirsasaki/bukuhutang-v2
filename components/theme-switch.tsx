"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type Props = {
  compact?: boolean;
  className?: string;
};

export function ThemeSwitch({ compact = false, className }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const dark = mounted && resolvedTheme === "dark";
  const label = dark ? "Gunakan mode terang" : "Gunakan mode gelap";

  return (
    <div
      className={cn(
        "flex h-9 items-center gap-2 rounded-lg border border-border/70 bg-card px-2.5 text-muted-foreground shadow-none transition-colors hover:bg-muted hover:text-foreground",
        compact ? "px-2" : "sm:px-3",
        className,
      )}
      title={label}
    >
      <Sun
        className={cn(
          "size-3.5 transition-colors",
          !dark && "text-amber-500",
        )}
        aria-hidden="true"
      />
      <Switch
        size="sm"
        checked={dark}
        disabled={!mounted}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label={label}
      />
      <Moon
        className={cn(
          "size-3.5 transition-colors",
          dark && "text-sky-300",
        )}
        aria-hidden="true"
      />
      {!compact && (
        <span className="hidden text-xs font-semibold lg:inline">
          {dark ? "Gelap" : "Terang"}
        </span>
      )}
    </div>
  );
}
