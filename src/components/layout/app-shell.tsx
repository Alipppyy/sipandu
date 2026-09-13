"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Moon, Sun, LogOut, UserCog, Globe, ChevronDown, Zap, Loader2 } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { cn, avatarColorClass, initials } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { useTheme } from "@/components/providers";
import { post } from "@/lib/client/api";
import { toast } from "sonner";
import { SessionProvider } from "@/components/session-provider";

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [runningScheduler, setRunningScheduler] = React.useState(false);
  const { theme, toggle } = useTheme();
  const router = useRouter();

  React.useEffect(() => {
    const stored = localStorage.getItem("sp-sidebar");
    if (stored === "collapsed") setCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      localStorage.setItem("sp-sidebar", !c ? "collapsed" : "expanded");
      return !c;
    });
  };

  async function logout() {
    setLoggingOut(true);
    try {
      await post("/api/auth/logout");
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Gagal keluar");
      setLoggingOut(false);
    }
  }

  async function runScheduler() {
    setRunningScheduler(true);
    try {
      const res = await post<{
        summary: { trashReminders: number; activityReminders: number; delivery: { sent: number; failed: number } };
      }>("/api/wa/run");
      const s = res.summary;
      toast.success(
        `Penjadwal selesai — ${s.trashReminders} pengingat iuran, ${s.activityReminders} pengingat kegiatan, ${s.delivery.sent} pesan terkirim.`,
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menjalankan penjadwal");
    } finally {
      setRunningScheduler(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        user={user}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-muted hover:text-foreground lg:hidden"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-[13px] font-semibold">
              Selamat datang kembali, {user.name.split(" ")[0]} 👋
            </p>
            <p className="truncate text-[11.5px] text-muted">
              RW 05 Kel. Banjar · Sistem Pelayanan & Pengingat Warga
            </p>
          </div>
          <div className="flex-1 lg:hidden" />

          <button
            onClick={runScheduler}
            disabled={runningScheduler}
            className="hidden items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-60 sm:inline-flex"
            title="Jalankan penjadwal pengingat sekarang"
          >
            {runningScheduler ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            <span className="hidden xl:inline">Jalankan Penjadwal</span>
          </button>

          <Link
            href="/"
            target="_blank"
            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            title="Lihat portal warga"
          >
            <Globe className="h-4.5 w-4.5" />
          </Link>

          <button
            onClick={toggle}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            title={theme === "dark" ? "Mode terang" : "Mode gelap"}
          >
            {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-surface-muted"
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white",
                  avatarColorClass(user.avatarColor),
                )}
              >
                {initials(user.name)}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="animate-scale-in absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
                  <div className="border-b border-line px-4 py-3">
                    <p className="truncate text-[13px] font-semibold">{user.name}</p>
                    <p className="truncate text-[11.5px] text-muted">{user.email}</p>
                  </div>
                  <div className="p-1.5">
                    <Link
                      href="/dashboard/pengaturan"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                    >
                      <UserCog className="h-4 w-4" />
                      Profil & pengaturan
                    </Link>
                    <button
                      onClick={logout}
                      disabled={loggingOut}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-danger transition-colors hover:bg-danger-soft disabled:opacity-60"
                    >
                      {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                      Keluar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <SessionProvider user={user}>{children}</SessionProvider>
        </main>
      </div>
    </div>
  );
}

/* Halaman header seragam */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-[13.5px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
