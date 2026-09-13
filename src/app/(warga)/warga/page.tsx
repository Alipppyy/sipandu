"use client";

import * as React from "react";
import {
  Wallet,
  CalendarDays,
  Megaphone,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  Receipt,
  Phone,
  IdCard,
  Printer,
} from "lucide-react";
import { WargaShell, type WargaTab } from "@/components/layout/warga-shell";
import { useSessionUser } from "@/components/session-provider";
import { Card, CardHeader, Badge, Avatar } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useResource } from "@/hooks/use-collection";
import { formatCurrency, formatDate, formatDateTime, calculateAge, BULAN_LIST } from "@/lib/utils";

type PortalData = {
  me: {
    id: string;
    name: string;
    nik: string;
    phone: string | null;
    address: string;
    rtNumber: string;
    rtArea: string;
    kkNumber: string;
    headName: string;
    familyRole: string;
    occupation: string;
  };
  members: { id: string; name: string; familyRole: string; gender: string; occupation: string; birthDate: string }[];
  bills: {
    id: string;
    billNumber: string;
    periodMonth: number;
    periodYear: number;
    amount: number;
    status: string;
    dueDate: string;
    paidAt: string | null;
    receiptNo: string | null;
    payments: { id: string; amount: number; paidAt: string; receiptNo: string; method: string }[];
  }[];
  summary: { total: number; unpaidCount: number; unpaidTotal: number; paidTotal: number };
  myDuties: {
    id: string;
    role: string;
    status: string;
    activity: { id: string; title: string; type: string; startsAt: string; endsAt: string; location: string; status: string };
  }[];
  activities: {
    id: string;
    title: string;
    type: string;
    startsAt: string;
    endsAt: string;
    location: string;
    status: string;
    rt: { number: string } | null;
    assigned: boolean;
  }[];
  announcements: {
    id: string;
    title: string;
    body: string;
    category: string;
    pinned: boolean;
    publishedAt: string;
  }[];
};

const TYPE_LABEL: Record<string, string> = {
  KERJA_BAKTI: "Kerja Bakti",
  RONDA: "Ronda",
  RAPAT: "Rapat",
  PENGAJIAN: "Pengajian",
  POSYANDU: "Posyandu",
  LAINNYA: "Lainnya",
};

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  LUNAS: "success",
  MENUNGGU_KONFIRMASI: "warning",
  BELUM_BAYAR: "danger",
  DIBEBASKAN: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  LUNAS: "Lunas",
  MENUNGGU_KONFIRMASI: "Menunggu konfirmasi",
  BELUM_BAYAR: "Belum dibayar",
  DIBEBASKAN: "Dibebaskan",
};

const CATEGORY_TONE: Record<string, "danger" | "primary" | "warning" | "neutral"> = {
  PENTING: "danger",
  KEGIATAN: "primary",
  KEUANGAN: "warning",
  UMUM: "neutral",
};

export default function WargaPortalPage() {
  const { user } = useSessionUser();
  const [tab, setTab] = React.useState<WargaTab>("ringkasan");
  const { data, isLoading, error, refresh } = useResource<PortalData>("/api/portal/summary");

  return (
    <WargaShell user={user} tab={tab} onTabChange={setTab}>
      {isLoading ? (
        <div className="space-y-4">
          <div className="skeleton h-32 w-full" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-24" />
            ))}
          </div>
          <div className="skeleton h-56" />
        </div>
      ) : error || !data ? (
        <Card>
          <ErrorState
            message={
              error instanceof Error && error.message.includes("belum tertaut")
                ? "Akun Anda belum tertaut dengan data warga. Silakan hubungi pengurus RW."
                : "Gagal memuat data Anda"
            }
            onRetry={refresh}
          />
        </Card>
      ) : (
        <div className="animate-fade-in space-y-5">
          {/* Profil */}
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-line bg-surface-muted/40 p-5 sm:flex-row sm:items-center">
              <Avatar name={data.me.name} size="lg" color="emerald" />
              <div className="min-w-0 flex-1">
                <h1 className="text-[19px] font-bold tracking-tight">Halo, {data.me.name.split(" ")[0]} 👋</h1>
                <p className="mt-0.5 text-[13px] text-muted">
                  RT {data.me.rtNumber} {data.me.rtArea} · KK {data.me.kkNumber}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
                  <MapPin className="h-3.5 w-3.5" />
                  {data.me.address}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="primary">RT {data.me.rtNumber}</Badge>
                <Badge tone="neutral">{data.me.familyRole}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
              {[
                { label: "NIK", value: data.me.nik, icon: IdCard },
                { label: "Kontak", value: data.me.phone ?? "Belum ada", icon: Phone },
                { label: "Pekerjaan", value: data.me.occupation, icon: Users },
                { label: "Kepala Keluarga", value: data.me.headName, icon: Users },
              ].map((i) => (
                <div key={i.label} className="rounded-xl border border-line px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-[11px] text-muted">
                    <i.icon className="h-3 w-3" />
                    {i.label}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] font-medium">{i.value}</p>
                </div>
              ))}
            </div>
          </Card>

          {tab === "ringkasan" && <Ringkasan data={data} />}
          {tab === "tagihan" && <Tagihan data={data} />}
          {tab === "kegiatan" && <Kegiatan data={data} />}
          {tab === "pengumuman" && <Pengumuman data={data} />}
        </div>
      )}
    </WargaShell>
  );
}

/* ── Ringkasan ──────────────────────────────────────────── */

function Ringkasan({ data }: { data: PortalData }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12.5px] text-muted">Tunggakan iuran</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-danger">
                {formatCurrency(data.summary.unpaidTotal)}
              </p>
              <p className="mt-0.5 text-[11.5px] text-muted">{data.summary.unpaidCount} tagihan belum lunas</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-soft text-danger">
              <AlertCircle className="h-5 w-5" />
            </span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12.5px] text-muted">Total sudah dibayar</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-success">
                {formatCurrency(data.summary.paidTotal)}
              </p>
              <p className="mt-0.5 text-[11.5px] text-muted">dari {data.summary.total} periode tagihan</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-soft text-success">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12.5px] text-muted">Kegiatan mendatang</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{data.activities.length}</p>
              <p className="mt-0.5 text-[11.5px] text-muted">{data.myDuties.length} tugas untuk Anda</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <CalendarDays className="h-5 w-5" />
            </span>
          </div>
        </Card>
      </div>

      {/* Tugas saya */}
      {data.myDuties.length > 0 && (
        <Card>
          <CardHeader title="Tugas kegiatan Anda" description="Jadwal di mana Anda ditugaskan sebagai petugas" />
          <div className="divide-y divide-line">
            {data.myDuties.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-surface-muted">
                  <span className="text-[14px] font-bold leading-none tabular-nums">
                    {new Date(d.activity.startsAt).getDate()}
                  </span>
                  <span className="mt-0.5 text-[10px] uppercase text-muted">
                    {new Date(d.activity.startsAt).toLocaleString("id-ID", { month: "short" })}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium">{d.activity.title}</p>
                  <p className="truncate text-[11.5px] text-muted">
                    {d.role} · {d.activity.location}
                  </p>
                </div>
                <Badge tone={d.status === "HADIR" ? "success" : d.status === "BELUM_KONFIRM" ? "warning" : "neutral"}>
                  {d.status === "BELUM_KONFIRM" ? "Belum konfirmasi" : d.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Anggota keluarga */}
        <Card>
          <CardHeader title="Anggota keluarga" description={`${data.members.length} orang dalam satu KK`} />
          <div className="divide-y divide-line">
            {data.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                <Avatar name={m.name} size="sm" color={m.gender === "PEREMPUAN" ? "rose" : "sky"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">
                    {m.name}
                    {m.id === data.me.id && <span className="ml-1.5 text-[11px] text-primary">(Anda)</span>}
                  </p>
                  <p className="truncate text-[11.5px] text-muted">{m.occupation}</p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge tone={m.familyRole === "KEPALA" ? "primary" : "neutral"}>{m.familyRole}</Badge>
                  <p className="mt-0.5 text-[11px] text-muted">{calculateAge(m.birthDate)} th</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Kegiatan terdekat */}
        <Card>
          <CardHeader title="Kegiatan terdekat" description="Kerja bakti, ronda, dan kegiatan warga" />
          {data.activities.slice(0, 4).length ? (
            <div className="divide-y divide-line">
              {data.activities.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-surface-muted">
                    <span className="text-[14px] font-bold leading-none tabular-nums">
                      {new Date(a.startsAt).getDate()}
                    </span>
                    <span className="mt-0.5 text-[10px] uppercase text-muted">
                      {new Date(a.startsAt).toLocaleString("id-ID", { month: "short" })}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{a.title}</p>
                    <p className="truncate text-[11.5px] text-muted">
                      {formatDate(a.startsAt, true)} · {a.location}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Badge tone="neutral">{TYPE_LABEL[a.type]}</Badge>
                    {a.assigned && (
                      <p className="mt-0.5 text-center text-[10.5px] font-medium text-primary">Anda bertugas</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="Belum ada kegiatan"
              description="Jadwal kegiatan akan muncul di sini."
              compact
            />
          )}
        </Card>
      </div>

      {/* Pengumuman terbaru */}
      <Card>
        <CardHeader title="Pengumuman terbaru" description="Informasi resmi dari pengurus RW" />
        {data.announcements.slice(0, 3).length ? (
          <div className="divide-y divide-line">
            {data.announcements.slice(0, 3).map((a) => (
              <div key={a.id} className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <Badge tone={CATEGORY_TONE[a.category] ?? "neutral"}>{a.category}</Badge>
                  {a.pinned && <Badge tone="primary">Disematkan</Badge>}
                </div>
                <p className="mt-1.5 text-[13.5px] font-semibold">{a.title}</p>
                <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{a.body}</p>
                <p className="mt-1.5 text-[11px] text-muted">{formatDate(a.publishedAt, true)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Megaphone className="h-6 w-6" />} title="Belum ada pengumuman" compact />
        )}
      </Card>
    </>
  );
}

/* ── Tagihan ────────────────────────────────────────────── */

function Tagihan({ data }: { data: PortalData }) {
  const unpaid = data.bills.filter((b) => b.status === "BELUM_BAYAR" || b.status === "MENUNGGU_KONFIRMASI");

  return (
    <div className="space-y-4">
      {unpaid.length > 0 && (
        <Card className="border-warning/30 bg-warning-soft/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[14px] font-semibold text-warning">
                <AlertCircle className="h-4 w-4" />
                {unpaid.length} tagihan belum lunas
              </p>
              <p className="mt-1 text-[12.5px] text-warning/80">
                Total {formatCurrency(data.summary.unpaidTotal)} — pengingat dikirim otomatis lewat WhatsApp.
              </p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-warning">{formatCurrency(data.summary.unpaidTotal)}</p>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Riwayat tagihan iuran" description={`${data.bills.length} periode tercatat`} />
        {data.bills.length ? (
          <div className="divide-y divide-line">
            {data.bills.map((b) => {
              const overdue = new Date(b.dueDate) < new Date() && b.status === "BELUM_BAYAR";
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium">
                      {BULAN_LIST[b.periodMonth - 1]} {b.periodYear}
                    </p>
                    <p className="text-[11.5px] text-muted">
                      {b.paidAt
                        ? `Dibayar ${formatDate(b.paidAt)}`
                        : `Jatuh tempo ${formatDate(b.dueDate)}${overdue ? " • sudah lewat" : ""}`}
                    </p>
                    <p className="font-mono text-[10.5px] text-muted">{b.billNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13.5px] font-semibold tabular-nums">{formatCurrency(b.amount)}</p>
                    <Badge tone={STATUS_TONE[b.status] ?? "neutral"}>{STATUS_LABEL[b.status] ?? b.status}</Badge>
                  </div>
                  {b.receiptNo && (
                    <a
                      href={`/kwitansi/${b.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Kwitansi
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Wallet className="h-6 w-6" />}
            title="Belum ada tagihan"
            description="Tagihan iuran kebersihan Anda akan muncul di sini."
          />
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-[14px] font-semibold">Cara membayar</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { t: "Tunai", d: "Serahkan kepada ketua RT pada jam pelayanan 18.00–20.00 WIB." },
            { t: "Transfer", d: "Kirim ke rekening kas RW, lalu konfirmasi ke bendahara." },
            { t: "QRIS", d: "Pindai kode QRIS kas RW yang tersedia di sekretariat." },
          ].map((c) => (
            <div key={c.t} className="rounded-xl border border-line px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                <Receipt className="h-3.5 w-3.5 text-primary" />
                {c.t}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">{c.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-2 text-[11.5px] text-muted">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Bukti pembayaran dikirim otomatis ke WhatsApp Anda setelah pengurus mencatat pelunasan.
        </p>
      </Card>
    </div>
  );
}

/* ── Kegiatan ───────────────────────────────────────────── */

function Kegiatan({ data }: { data: PortalData }) {
  return (
    <Card>
      <CardHeader title="Jadwal kegiatan RW" description="Kegiatan mendatang di wilayah Anda" />
      {data.activities.length ? (
        <div className="divide-y divide-line">
          {data.activities.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-surface-muted">
                <span className="text-[15px] font-bold leading-none tabular-nums">
                  {new Date(a.startsAt).getDate()}
                </span>
                <span className="mt-0.5 text-[10px] uppercase text-muted">
                  {new Date(a.startsAt).toLocaleString("id-ID", { month: "short" })}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13.5px] font-semibold">{a.title}</p>
                  <Badge tone="neutral">{TYPE_LABEL[a.type]}</Badge>
                  {a.assigned && <Badge tone="primary">Anda bertugas</Badge>}
                </div>
                <p className="mt-0.5 text-[12px] text-muted">
                  {formatDateTime(a.startsAt)} WIB · {a.location}
                </p>
              </div>
              <Badge tone={a.rt ? "primary" : "info"}>{a.rt ? `RT ${a.rt.number}` : "RW"}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="Belum ada jadwal kegiatan"
          description="Kegiatan kerja bakti, ronda, atau rapat akan ditampilkan di sini."
        />
      )}
    </Card>
  );
}

/* ── Pengumuman ─────────────────────────────────────────── */

function Pengumuman({ data }: { data: PortalData }) {
  if (!data.announcements.length) {
    return (
      <Card>
        <EmptyState icon={<Megaphone className="h-6 w-6" />} title="Belum ada pengumuman" />
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {data.announcements.map((a) => (
        <Card key={a.id} className={`p-5 ${a.pinned ? "ring-1 ring-primary/25" : ""}`}>
          <div className="flex items-center gap-2">
            <Badge tone={CATEGORY_TONE[a.category] ?? "neutral"}>{a.category}</Badge>
            {a.pinned && <Badge tone="primary">Disematkan</Badge>}
          </div>
          <h3 className="mt-2.5 text-[14.5px] font-semibold leading-snug">{a.title}</h3>
          <p className="mt-2 text-[13px] leading-relaxed whitespace-pre-wrap text-muted">{a.body}</p>
          <p className="mt-3 text-[11.5px] text-muted">{formatDate(a.publishedAt, true)}</p>
        </Card>
      ))}
    </div>
  );
}
