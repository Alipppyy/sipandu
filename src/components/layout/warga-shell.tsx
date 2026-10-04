"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Moon, Sun, ChevronDown, Home, Wallet, CalendarDays, Megaphone } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { useTheme } from "@/components/providers";
import { post } from "@/lib/client/api";
import { cn, avatarColorClass, initials } from "@/lib/utils";

const TABS = [
  { id: "ringkasan", label: "Ringkasan", icon: Home },
  { id: "tagihan", label: "Tagihan", icon: Wallet },
  { id: "kegiatan", label: "Kegiatan", icon: CalendarDays },
  { id: "pengumuman", label: "Pengumuman", icon: Megaphone },
] as const;

export type WargaTab = (typeof TABS)[number]["id"];

export function WargaShell({
  user,
  tab,
  onTabChange,
  children,
}: {
  user: SessionUser;
  tab: WargaTab;
  onTabChange: (t: WargaTab) => void;
  children: React.ReactNode;
}) {
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  async function logout() {
    setLoggingOut(true);
    await post("/api/auth/logout").catch(() => null);
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="hidden sm:block">
              <span className="block text-[15px] font-bold leading-tight">SIPANDU RW</span>
              <span className="block text-[10.5px] text-muted">Portal Warga</span>
            </span>
          </Link>

          <div className="flex-1" />

          <button
            onClick={toggle}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            title={theme === "dark" ? "Mode terang" : "Mode gelap"}
          >
            {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 transition-colors hover:bg-surface-muted"
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white",
                  avatarColorClass(user.avatarColor),
                )}
              >
                {initials(user.name)}
              </span>
              <span className="hidden max-w-[120px] truncate text-[13px] font-medium sm:block">{user.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="animate-scale-in absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
                  <div className="border-b border-line px-4 py-3">
                    <p className="truncate text-[13px] font-semibold">{user.name}</p>
                    <p className="truncate text-[11.5px] text-muted">{user.email}</p>
                  </div>
                  <div className="p-1.5">
                    <Link
                      href="/"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                    >
                      <Home className="h-4 w-4" />
                      Beranda RW
                    </Link>
                    <button
                      onClick={logout}
                      disabled={loggingOut}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-danger transition-colors hover:bg-danger-soft disabled:opacity-60"
                    >
                      <LogOut className="h-4 w-4" />
                      Keluar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tab nav */}
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onTabChange(t.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-all",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-muted hover:bg-surface-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5 sm:py-7">{children}</main>
    </div>
  );
}
