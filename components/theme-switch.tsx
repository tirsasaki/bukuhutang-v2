"use client";

import { iconButtonClass } from "@/components/brand-logo";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type Props = {
  className?: string;
};

/** Tombol ikon pengubah tema terang/gelap (bulan saat terang, matahari saat gelap). */
export function ThemeSwitch({ className }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const dark = mounted && resolvedTheme === "dark";
  const label = dark ? "Gunakan mode terang" : "Gunakan mode gelap";
  const Icon = dark ? Sun : Moon;

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={!mounted}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn(iconButtonClass, "disabled:opacity-60", className)}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
