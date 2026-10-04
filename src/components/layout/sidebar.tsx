"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  MapPinned,
  CalendarDays,
  Trash2,
  FileText,
  Megaphone,
  MessageCircle,
  Settings,
  ShieldCheck,
  ChevronLeft,
  X,
  Trash,
} from "lucide-react";
import { cn, avatarColorClass, initials } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  roles?: SessionUser["role"][];
};

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Utama",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/dashboard/warga", label: "Data Warga", icon: Users },
      { href: "/dashboard/keluarga", label: "Kartu Keluarga", icon: UsersRound },
      { href: "/dashboard/wilayah", label: "Wilayah RT", icon: MapPinned },
    ],
  },
  {
    group: "Layanan",
    items: [
      { href: "/dashboard/kegiatan", label: "Kegiatan & Jadwal", icon: CalendarDays },
      { href: "/dashboard/iuran", label: "Iuran Sampah", icon: Trash2 },
      { href: "/dashboard/surat", label: "Surat Pengantar", icon: FileText },
      { href: "/dashboard/pengumuman", label: "Pengumuman", icon: Megaphone },
    ],
  },
  {
    group: "Komunikasi",
    items: [
      { href: "/dashboard/whatsapp", label: "WhatsApp", icon: MessageCircle, badge: "Live" },
    ],
  },
  {
    group: "Pengaturan",
    items: [
      { href: "/dashboard/pengguna", label: "Pengguna", icon: ShieldCheck, roles: ["ADMIN"] },
      { href: "/dashboard/pengaturan", label: "Pengaturan RW", icon: Settings, roles: ["ADMIN", "OPERATOR"] },
    ],
  },
];

export function SidebarContent({
  user,
  onNavigate,
  collapsed = false,
}: {
  user: SessionUser;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={cn("flex h-16 shrink-0 items-center gap-3 px-4", collapsed && "justify-center px-0")}>
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
          <Trash className="h-4.5 w-4.5" />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold tracking-tight">SIPANDU RW</p>
            <p className="truncate text-[11px] text-muted">Sistem Pelayanan Warga</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((group) => {
          const items = group.items.filter(
            (i) => !i.roles || i.roles.includes(user.role),
          );
          if (!items.length) return null;
          return (
            <div key={group.group}>
              {!collapsed && (
                <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted/80">
                  {group.group}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all",
                        collapsed && "justify-center px-0",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                          : "text-muted hover:bg-surface-muted hover:text-foreground",
                      )}
                    >
                      <Icon className={cn("h-4.5 w-4.5 shrink-0", active && "text-primary-foreground")} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && item.badge && (
                        <span className="ml-auto rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">
                          {item.badge}
                        </span>
                      )}
                      {collapsed && active && (
                        <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User card */}
      <div className={cn("shrink-0 border-t border-line p-3", collapsed && "px-2")}>
        <div className={cn("flex items-center gap-3 rounded-xl px-2 py-2", collapsed && "justify-center px-0")}>
          <span
            className={cn(
              "flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white",
              avatarColorClass(user.avatarColor),
            )}
            style={{ height: "2.125rem", width: "2.125rem" }}
          >
            {initials(user.name)}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{user.name}</p>
              <p className="truncate text-[11px] text-muted">
                {user.role === "ADMIN"
                  ? "Administrator RW"
                  : user.role === "OPERATOR"
                    ? "Perangkat RW"
                    : user.role === "KETUA_RT"
                      ? `Ketua RT ${user.rtNumber ?? ""}`.trim()
                      : "Warga"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Sidebar({
  user,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: {
  user: SessionUser;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  React.useEffect(() => {
    onCloseMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex",
          collapsed ? "w-19" : "w-19",
        )}
      >
        <SidebarContent user={user} collapsed={collapsed} />
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-18 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-sm transition-all hover:text-foreground lg:flex"
          aria-label={collapsed ? "Perlebar sidebar" : "Persempit sidebar"}
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-slate-950/50" onClick={onCloseMobile} aria-hidden />
          <aside className="animate-slide-in-right absolute left-0 top-0 h-full w-66 bg-surface shadow-xl">
            <button
              onClick={onCloseMobile}
              className="absolute right-3 top-5 z-10 rounded-lg p-1.5 text-muted hover:bg-surface-muted"
              aria-label="Tutup menu"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent user={user} onNavigate={onCloseMobile} />
          </aside>
        </div>
      )}
    </>
  );
}
