"use client";

import { useState } from "react";
import { BookOpenText, Loader2, LockKeyhole } from "lucide-react";
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
    <main className="grid min-h-screen place-items-center bg-muted/40 px-4 py-10">
      <ThemeSwitch className="fixed right-4 top-4" />
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-xl shadow-primary/5 sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <BookOpenText className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Buku Piutang</h1>
            <p className="text-sm text-muted-foreground">Masuk untuk membuka catatan toko</p>
          </div>
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">
          <LockKeyhole className="mt-0.5 size-5 shrink-0 text-primary" />
          <p>Catatan pelanggan hanya dapat dibuka oleh akun yang telah terdaftar.</p>
        </div>

        <form onSubmit={signIn} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Alamat email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Kata sandi</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {message && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Masuk
          </Button>
        </form>
      </section>
    </main>
  );
}
