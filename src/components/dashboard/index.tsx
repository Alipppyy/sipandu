"use client";

import * as React from "react";
import Link from "next/link";
import {
  UsersRound,
  Users,
  Wallet,
  CalendarDays,
  MessageCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FileText,
  Megaphone,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, Badge, Avatar, Progress, Button, Skeleton } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/states";
import { formatCurrency, formatDate, formatNumber, formatRelative, cn } from "@/lib/utils";

export type DashboardStats = {
  counts: { rt: number; families: number; residents: number; activeResidents: number; male: number; female: number };
  bills: {
    current: number;
    paid: number;
    unpaid: number;
    collected: number;
    outstanding: number;
    collectionRate: number;
  };
  months: { month: number; year: number; label: string; collected: number; target: number }[];
  upcomingActivities: {
    id: string;
    title: string;
    type: string;
    startsAt: string;
    endsAt: string;
    location: string;
    status: string;
    rt: { number: string } | null;
    _count: { assignments: number };
  }[];
  recentLogs: {
    id: string;
    userName: string;
    action: string;
    entity: string;
    description: string;
    createdAt: string;
  }[];
  topDebtors: {
    id: string;
    name: string;
    kk: string;
    rt: string;
    amount: number;
    dueDate: string;
    status: string;
  }[];
  rtStats: {
    id: string;
    number: string;
    areaName: string;
    families: number;
    residents: number;
    paid: number;
    total: number;
    rate: number;
  }[];
  wa: { total: number; sent: number; failed: number; queued: number; today: number };
  letters: Record<string, number>;
  period: { month: number; year: number; label: string };
};

/* ── Stat card ──────────────────────────────────────────── */

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  footer,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "success" | "warning" | "info" | "danger";
  footer?: React.ReactNode;
  href?: string;
}) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    info: "bg-info-soft text-info",
    danger: "bg-danger-soft text-danger",
  };
  const content = (
    <Card className="group relative overflow-hidden p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
          {hint && <p className="mt-1 truncate text-[12px] text-muted">{hint}</p>}
        </div>
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {footer && <div className="mt-3.5">{footer}</div>}
      {href && (
        <ArrowUpRight className="absolute right-4 top-4 h-3.5 w-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

/* ── Grafik iuran ───────────────────────────────────────── */

export function CollectionChart({ data }: { data: DashboardStats["months"] }) {
  const chartData = data.map((m) => ({
    ...m,
    name: m.label,
    terkumpul: m.collected,
    target: m.target,
  }));

  return (
    <div className="h-60 w-full min-w-0 overflow-hidden px-1 pt-4">
      <ResponsiveContainer width="100%" height="100%" debounce={80} minWidth={0}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -14, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            dy={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-muted)", opacity: 0.5 }}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              fontSize: 12,
              boxShadow: "0 8px 24px rgb(0 0 0 / 0.12)",
            }}
            formatter={(value, name) => [
              formatCurrency(Number(value)),
              name === "terkumpul" ? "Terkumpul" : "Target",
            ]}
            labelFormatter={(label) => `Bulan ${label}`}
          />
          <Bar dataKey="target" fill="var(--line-strong)" radius={[4, 4, 0, 0]} name="target" />
          <Bar dataKey="terkumpul" radius={[4, 4, 0, 0]} name="terkumpul">
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.target && entry.collected / entry.target >= 0.8
                    ? "var(--success)"
                    : entry.target && entry.collected / entry.target >= 0.5
                      ? "var(--warning)"
                      : "var(--danger)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Kegiatan mendatang ─────────────────────────────────── */

const ACTIVITY_TONE: Record<string, "primary" | "success" | "info" | "warning" | "neutral"> = {
  KERJA_BAKTI: "primary",
  RONDA: "info",
  RAPAT: "warning",
  PENGAJIAN: "success",
  POSYANDU: "success",
  LAINNYA: "neutral",
};

const ACTIVITY_LABEL: Record<string, string> = {
  KERJA_BAKTI: "Kerja Bakti",
  RONDA: "Ronda",
  RAPAT: "Rapat",
  PENGAJIAN: "Pengajian",
  POSYANDU: "Posyandu",
  LAINNYA: "Lainnya",
};

export function UpcomingActivities({ items }: { items: DashboardStats["upcomingActivities"] }) {
  if (!items.length) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-6 w-6" />}
        title="Belum ada jadwal kegiatan"
        description="Buat jadwal kerja bakti atau ronda untuk mengingatkan warga lewat WhatsApp."
        action={
          <Link href="/dashboard/kegiatan">
            <Button size="sm">Buat kegiatan</Button>
          </Link>
        }
        compact
      />
    );
  }
  return (
    <div className="divide-y divide-line">
      {items.map((a) => {
        const date = new Date(a.startsAt);
        return (
          <Link
            key={a.id}
            href="/dashboard/kegiatan"
            className="flex items-start gap-3.5 px-5 py-3.5 transition-colors hover:bg-surface-hover"
          >
            <div className="flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-surface-muted">
              <span className="text-[15px] font-bold leading-none tabular-nums">{date.getDate()}</span>
              <span className="mt-0.5 text-[10px] uppercase text-muted">
                {date.toLocaleString("id-ID", { month: "short" })}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13.5px] font-semibold">{a.title}</p>
                <Badge tone={ACTIVITY_TONE[a.type] ?? "neutral"}>{ACTIVITY_LABEL[a.type] ?? a.type}</Badge>
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                <span>
                  {String(date.getHours()).padStart(2, "0")}.{String(date.getMinutes()).padStart(2, "0")} WIB
                </span>
                <span className="text-line-strong">•</span>
                <span className="truncate">{a.location}</span>
              </p>
            </div>
            <div className="shrink-0 text-right">
              <Badge tone="neutral">{a.rt ? `RT ${a.rt.number}` : "RW"}</Badge>
              <p className="mt-1 text-[11px] text-muted">{a._count.assignments} petugas</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ── Log aktivitas ──────────────────────────────────────── */

const ACTION_TONE: Record<string, "success" | "primary" | "warning" | "danger" | "info" | "neutral"> = {
  CREATE: "success",
  UPDATE: "primary",
  DELETE: "danger",
  SEND: "info",
  PAY: "success",
  LOGIN: "neutral",
  SYSTEM: "neutral",
};

const ENTITY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Warga: Users,
  "Kartu Keluarga": UsersRound,
  Kegiatan: CalendarDays,
  Tagihan: Wallet,
  Pengumuman: Megaphone,
  Surat: FileText,
  WhatsApp: MessageCircle,
  Pengguna: Users,
  RT: UsersRound,
  Pembayaran: Wallet,
  Pengaturan: Clock,
};

export function ActivityFeed({ items }: { items: DashboardStats["recentLogs"] }) {
  if (!items.length) {
    return (
      <EmptyState
        icon={<Clock className="h-6 w-6" />}
        title="Belum ada aktivitas"
        description="Aktivitas pengurus akan muncul di sini."
        compact
      />
    );
  }
  return (
    <div className="divide-y divide-line">
      {items.map((l) => {
        const Icon = ENTITY_ICON[l.entity] ?? Clock;
        return (
          <div key={l.id} className="flex items-start gap-3 px-5 py-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-muted">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-snug">
                <span className="font-semibold">{l.userName}</span>{" "}
                <span className="text-muted">{l.description.replace(/^.*?:\s?/, "")}</span>
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Badge tone={ACTION_TONE[l.action] ?? "neutral"}>{l.action}</Badge>
                <span className="text-[11px] text-muted">{formatRelative(l.createdAt)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Tunggakan teratas ──────────────────────────────────── */

export function TopDebtors({ items }: { items: DashboardStats["topDebtors"] }) {
  if (!items.length) {
    return (
      <EmptyState
        icon={<CheckCircle2 className="h-6 w-6" />}
        title="Tidak ada tunggakan 🎉"
        description="Semua iuran kebersihan warga sudah lunas. Kerja bagus!"
        compact
      />
    );
  }
  return (
    <div className="divide-y divide-line">
      {items.map((b) => {
        const overdue = new Date(b.dueDate) < new Date();
        return (
          <div key={b.id} className="flex items-center gap-3 px-5 py-3">
            <Avatar name={b.name} size="sm" color="amber" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{b.name}</p>
              <p className="text-[11.5px] text-muted">
                RT {b.rt} · {overdue ? "Lewat " : "Jatuh tempo "}
                {formatDate(b.dueDate)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[13px] font-semibold tabular-nums text-danger">{formatCurrency(b.amount)}</p>
              <Badge tone={b.status === "MENUNGGU_KONFIRMASI" ? "warning" : "danger"}>
                {b.status === "MENUNGGU_KONFIRMASI" ? "Menunggu" : "Belum bayar"}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Rekap per RT ───────────────────────────────────────── */

export function RtBreakdown({ items }: { items: DashboardStats["rtStats"] }) {
  return (
    <div className="divide-y divide-line">
      {items.map((rt) => (
        <div key={rt.id} className="px-5 py-3">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Badge tone="primary">RT {rt.number}</Badge>
              <span className="truncate text-[13px] font-medium">{rt.areaName}</span>
            </div>
            <span className="shrink-0 text-[12px] tabular-nums text-muted">
              {rt.paid}/{rt.total} KK
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={rt.rate} tone={rt.rate >= 80 ? "success" : rt.rate >= 50 ? "warning" : "danger"} />
            <span className="w-9 shrink-0 text-right text-[12px] font-semibold tabular-nums">{rt.rate}%</span>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {rt.families} KK · {rt.residents} warga
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Ringkasan WhatsApp ─────────────────────────────────── */

export function WaSummary({ wa }: { wa: DashboardStats["wa"] }) {
  const successRate = wa.total ? Math.round((wa.sent / wa.total) * 100) : 0;
  const items = [
    { label: "Terkirim", value: wa.sent, tone: "success" as const },
    { label: "Gagal", value: wa.failed, tone: "danger" as const },
    { label: "Antrean", value: wa.queued, tone: "warning" as const },
    { label: "Hari ini", value: wa.today, tone: "info" as const },
  ];
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12.5px] text-muted">Total pesan</p>
          <p className="text-xl font-bold tabular-nums">{formatNumber(wa.total)}</p>
        </div>
        <div className="text-right">
          <p className="text-[12.5px] text-muted">Tingkat keberhasilan</p>
          <p className="text-xl font-bold tabular-nums text-success">{successRate}%</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="rounded-xl border border-line bg-surface-muted/50 px-3 py-2">
            <p className="text-[11px] text-muted">{i.label}</p>
            <p className="text-[15px] font-semibold tabular-nums">{formatNumber(i.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Skeletons ──────────────────────────────────────────── */

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="space-y-3 p-5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-32" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3 p-5 lg:col-span-2">
          <Skeleton className="h-4 w-40" />
          <div className="flex h-60 items-end gap-3 pt-4">
            {[60, 80, 45, 90, 65, 75].map((h, i) => (
              <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
            ))}
          </div>
        </Card>
        <Card className="space-y-3 p-5">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </Card>
      </div>
    </div>
  );
}
