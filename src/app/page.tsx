import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getProfile } from "@/lib/wa";
import { formatDate } from "@/lib/utils";
import { BillLookup } from "@/components/public/bill-lookup";
import {
  MapPin,
  Users,
  Home,
  CalendarDays,
  Megaphone,
  Wallet,
  MessageCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  User,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Portal Warga RW 05 — SIPANDU RW",
  description:
    "Portal informasi warga RW 05: pengumuman, jadwal kegiatan, layanan surat, dan pengecekan iuran kebersihan.",
};

export default async function PublicHome() {
  const profile = await getProfile();

  const [families, residents, announcements, activities] = await Promise.all([
    prisma.family.count(),
    prisma.resident.count({ where: { status: "AKTIF" } }),
    prisma.announcement.findMany({
      where: { published: true },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 6,
    }),
    prisma.activity.findMany({
      where: { status: { in: ["TERENCANA", "BERLANGSUNG"] }, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: { rt: { select: { number: true } } },
    }),
  ]);

  const now = new Date();
  const current = await prisma.wasteBill.groupBy({
    by: ["status"],
    _count: { _all: true },
    where: { periodMonth: now.getMonth() + 1, periodYear: now.getFullYear() },
  });
  const lunasBulanIni = current.find((c) => c.status === "LUNAS")?._count._all ?? 0;
  const totalBulanIni = current.reduce((a, b) => a + b._count._all, 0);

  const rtCount = await prisma.rt.count();

  const kategoriTone: Record<string, string> = {
    PENTING: "bg-danger-soft text-danger",
    KEGIATAN: "bg-primary-soft text-primary",
    KEUANGAN: "bg-warning-soft text-warning",
    UMUM: "bg-surface-muted text-muted",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>
              <span className="block text-[15px] font-bold leading-tight">SIPANDU RW</span>
              <span className="block text-[10.5px] text-muted">RW {profile.rwNumber} · {profile.village}</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-[13px] font-medium text-muted md:flex">
            <a href="#pengumuman" className="transition-colors hover:text-foreground">Pengumuman</a>
            <a href="#kegiatan" className="transition-colors hover:text-foreground">Kegiatan</a>
            <a href="#cek-tagihan" className="transition-colors hover:text-foreground">Cek Iuran</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/warga" className="hidden sm:block">
              <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3.5 text-[13px] font-medium transition-colors hover:bg-surface-muted">
                <User className="h-3.5 w-3.5" />
                Portal Warga
              </span>
            </Link>
            <Link href="/login">
              <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90">
                Masuk
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-surface">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, var(--primary) 0, transparent 45%), radial-gradient(circle at 85% 80%, var(--primary) 0, transparent 40%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 py-14 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-muted px-3 py-1 text-[11.5px] font-medium text-muted">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            Portal informasi warga · RW {profile.rwNumber} {profile.village}
          </span>
          <h1 className="mt-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Informasi RW {profile.rwNumber} dalam satu tempat.
          </h1>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-muted">
            Pantau pengumuman, jadwal kerja bakti & ronda, serta tagihan iuran kebersihan keluarga Anda. Pengingat
            jatuh tempo dikirim otomatis melalui WhatsApp.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Kartu Keluarga", value: families, icon: Home, desc: `${rtCount} RT terdaftar` },
              { label: "Warga aktif", value: residents, icon: Users, desc: "Data kependudukan" },
              {
                label: "Iuran bulan ini",
                value: `${lunasBulanIni}/${totalBulanIni}`,
                icon: Wallet,
                desc: "KK telah melunasi",
              },
              { label: "Kegiatan mendatang", value: activities.length, icon: CalendarDays, desc: "Jadwal terdekat" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <s.icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="text-xl font-bold tabular-nums">{s.value}</span>
                </div>
                <p className="mt-2.5 text-[13px] font-semibold">{s.label}</p>
                <p className="text-[11.5px] text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cek tagihan */}
      <section id="cek-tagihan" className="border-b border-line py-14">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11.5px] font-semibold text-primary">
              <Wallet className="h-3.5 w-3.5" />
              Cek tagihan iuran
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">Lihat tagihan kebersihan keluarga Anda</h2>
            <p className="mt-2 text-[13.5px] text-muted">
              Masukkan NIK atau nomor Kartu Keluarga — tanpa perlu masuk ke sistem.
            </p>
          </div>
          <div className="mt-7">
            <BillLookup />
          </div>
        </div>
      </section>

      {/* Pengumuman */}
      <section id="pengumuman" className="border-b border-line py-14">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <Megaphone className="h-5 w-5 text-primary" />
                Pengumuman
              </h2>
              <p className="mt-1 text-[13.5px] text-muted">Informasi terbaru untuk warga RW {profile.rwNumber}</p>
            </div>
          </div>

          {announcements.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {announcements.map((a) => (
                <article
                  key={a.id}
                  className={`group rounded-2xl border border-line bg-surface p-5 transition-shadow hover:shadow-md ${
                    a.pinned ? "ring-1 ring-primary/25" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                        kategoriTone[a.category] ?? kategoriTone.UMUM
                      }`}
                    >
                      {a.category}
                    </span>
                    {a.pinned && (
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10.5px] font-semibold text-primary">
                        Disematkan
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2.5 text-[15px] font-semibold leading-snug">{a.title}</h3>
                  <p className="mt-2 line-clamp-4 text-[13px] leading-relaxed text-muted">{a.body}</p>
                  <p className="mt-3.5 flex items-center gap-1.5 text-[11.5px] text-muted">
                    <Clock className="h-3 w-3" />
                    {formatDate(a.publishedAt, true)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-line bg-surface py-12 text-center text-[13.5px] text-muted">
              Belum ada pengumuman.
            </p>
          )}
        </div>
      </section>

      {/* Kegiatan */}
      <section id="kegiatan" className="border-b border-line py-14">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <CalendarDays className="h-5 w-5 text-primary" />
            Jadwal kegiatan
          </h2>
          <p className="mt-1 text-[13.5px] text-muted">Kerja bakti, ronda, rapat, dan kegiatan warga lainnya</p>

          {activities.length ? (
            <div className="mt-6 space-y-3">
              {activities.map((a) => {
                const d = new Date(a.startsAt);
                return (
                  <div
                    key={a.id}
                    className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-surface-muted">
                      <span className="text-lg font-bold leading-none tabular-nums">{d.getDate()}</span>
                      <span className="mt-0.5 text-[10px] uppercase text-muted">
                        {d.toLocaleString("id-ID", { month: "short" })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-semibold">{a.title}</p>
                      <p className="mt-0.5 text-[12.5px] text-muted">
                        {formatDate(a.startsAt, true)} ·{" "}
                        {String(d.getHours()).padStart(2, "0")}.{String(d.getMinutes()).padStart(2, "0")} WIB
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
                        <MapPin className="h-3 w-3" />
                        {a.location}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11.5px] font-semibold text-primary">
                        {a.rt ? `RT ${a.rt.number}` : "RW"}
                      </span>
                      {a.status === "BERLANGSUNG" && (
                        <span className="rounded-full bg-info-soft px-2.5 py-1 text-[11.5px] font-semibold text-info">
                          Berlangsung
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-6 rounded-2xl border border-dashed border-line bg-surface py-12 text-center text-[13.5px] text-muted">
              Belum ada jadwal kegiatan mendatang.
            </p>
          )}
        </div>
      </section>

      {/* Layanan */}
      <section className="border-b border-line py-14">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-bold tracking-tight">Layanan warga</h2>
          <p className="mt-1 text-[13.5px] text-muted">Semua layanan dapat diajukan melalui ketua RT atau sekretariat RW</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Surat pengantar",
                desc: "Domisili, SKCK, KTP, KK, keterangan usaha, dan keterangan tidak mampu.",
                icon: CheckCircle2,
              },
              {
                title: "Pengingat iuran WhatsApp",
                desc: "Pengingat jatuh tempo otomatis H-3, hari H, serta tunggakan H+3 dan H+7.",
                icon: MessageCircle,
              },
              {
                title: "Jadwal ronda & kerja bakti",
                desc: "Penugasan petugas dan konfirmasi kehadiran langsung dari aplikasi.",
                icon: CalendarDays,
              },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl border border-line bg-surface p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <s.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-[14.5px] font-semibold">{s.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[14px] font-bold">SIPANDU RW</p>
            <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-muted">
              Sistem Pelayanan & Pengingat Warga — RW {profile.rwNumber} Kel. {profile.village}, Kec. {profile.district},{" "}
              {profile.city}.
            </p>
          </div>
          <div className="space-y-1.5 text-[12.5px] text-muted">
            <p className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              {profile.address}
            </p>
            <p>Ketua RW: {profile.ketuaName}</p>
            <p>Sekretaris: {profile.sekretarisName}</p>
            <p>Bendahara: {profile.bendaharaName}</p>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-6xl border-t border-line px-5 pt-6 text-[11.5px] text-muted">
          © {new Date().getFullYear()} SIPANDU RW — aplikasi manajemen RT/RW.
        </div>
      </footer>
    </div>
  );
}
