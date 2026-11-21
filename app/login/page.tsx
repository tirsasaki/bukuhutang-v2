"use client";

import { useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ThemeSwitch } from "@/components/theme-switch";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const values = new FormData(event.currentTarget);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(values.get("email") ?? "").trim(),
      password: String(values.get("password") ?? ""),
    });

    if (error) {
      setMessage("Alamat email atau kata sandi tidak sesuai.");
      setLoading(false);
      return;
    }

    const nextPath = new URLSearchParams(window.location.search).get("lanjut");
    window.location.assign(nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/");
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_20%_20%,rgba(19,133,124,0.10),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(11,79,85,0.10),transparent_45%)] bg-background px-4 py-6 sm:p-6">
      <section className="w-full max-w-[420px] rounded-3xl border border-border bg-card p-6 shadow-[0_10px_30px_rgba(15,38,42,0.10)] sm:p-8 dark:shadow-[0_12px_32px_rgba(0,0,0,0.42)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-[11px]">
            <BrandLogo className="size-11" />
            <div className="min-w-0">
              <h1 className="text-[19px] font-extrabold tracking-tight">
                Buku Piutang
              </h1>
              <p className="text-[12.5px] text-muted-foreground">
                Masuk untuk membuka catatan toko
              </p>
            </div>
          </div>
          <ThemeSwitch />
        </div>

        <div className="my-[22px] flex gap-2.5 rounded-[14px] bg-secondary px-3.5 py-[13px] text-[12.5px] text-secondary-foreground">
          <LockKeyhole
            className="mt-px size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <p>
            Catatan pelanggan hanya dapat dibuka oleh akun terdaftar. Data
            tiap akun dipisahkan otomatis di Supabase.
          </p>
        </div>

        <form onSubmit={signIn} className="grid gap-3.5">
          <div className="space-y-[5px]">
            <Label htmlFor="email">Alamat email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nama@toko.id"
              className="h-10 rounded-[10px]"
              required
              autoFocus
            />
          </div>
          <div className="space-y-[5px]">
            <Label htmlFor="password">Kata sandi</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="h-10 rounded-[10px]"
              required
            />
          </div>
          {message && (
            <p
              role="alert"
              className="rounded-xl border border-danger-border bg-danger-bg px-3 py-2 text-xs text-destructive"
            >
              {message}
            </p>
          )}
          <Button
            type="submit"
            className="mt-1 h-11 w-full"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Masuk ke Buku Piutang
          </Button>
        </form>
      </section>
    </main>
  );
}
