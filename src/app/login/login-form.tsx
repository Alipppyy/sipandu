"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button, Field, Input } from "@/components/ui/primitives";
import { post } from "@/lib/client/api";

const DEMO_ACCOUNTS = [
  { label: "Administrator RW", email: "admin@sipandu.rw" },
  { label: "Sekretaris / Operator", email: "sekretaris@sipandu.rw" },
  { label: "Ketua RT 01", email: "rt01@sipandu.rw" },
  { label: "Warga (portal pribadi)", email: "warga@sipandu.rw" },
];

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("admin@sipandu.rw");
  const [password, setPassword] = React.useState("sipandu123");
  const [show, setShow] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await post<{ user: { role: string } }>("/api/auth/login", { email, password });
      const target = res?.user?.role === "WARGA" ? "/warga" : "/dashboard";
      router.replace(target);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk");
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in-up">
      <h2 className="text-xl font-bold tracking-tight">Masuk ke SIPANDU RW</h2>
      <p className="mt-1 text-[13.5px] text-muted">
        Silakan masuk menggunakan akun pengurus atau warga.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@sipandu.rw"
            autoComplete="username"
            required
          />
        </Field>

        <Field label="Kata sandi" required>
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:text-foreground"
              aria-label={show ? "Sembunyikan" : "Tampilkan"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        {error && (
          <div className="animate-fade-in rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" loading={loading} className="w-full">
          {!loading && <LogIn className="h-4 w-4" />}
          Masuk
        </Button>
      </form>

      <div className="mt-7 rounded-xl border border-dashed border-line bg-surface-muted/50 p-4">
        <p className="mb-2.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
          Akun demo
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] normal-case tracking-normal text-primary">
            sandi: sipandu123
          </span>
        </p>
        <div className="space-y-1">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                setEmail(a.email);
                setPassword("sipandu123");
              }}
              className="group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface"
            >
              <span>
                <span className="block text-[13px] font-medium">{a.label}</span>
                <span className="block text-[11.5px] text-muted">{a.email}</span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
        <p className="mt-2.5 border-t border-line pt-2.5 text-[11.5px] text-muted">
          Akun lain: bendahara@sipandu.rw, rt02–rt05@sipandu.rw, warga@sipandu.rw
        </p>
      </div>

      <p className="mt-5 text-center text-[12px] text-muted">
        Belum punya akun warga?{" "}
        <Link href="/#cek-tagihan" className="font-medium text-primary hover:underline">
          Cek tagihan tanpa login
        </Link>
      </p>
    </div>
  );
}
