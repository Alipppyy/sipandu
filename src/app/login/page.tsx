import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.role === "WARGA" ? "/warga" : "/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      {/* Panel brand */}
      <div className="relative hidden overflow-hidden bg-primary lg:flex lg:w-[46%] xl:w-[42%]">
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #ffffff 0, transparent 45%), radial-gradient(circle at 80% 80%, #ffffff 0, transparent 40%)",
          }}
        />
        <div className="relative z-10 flex w-full flex-col justify-between p-10 text-primary-foreground xl:p-14">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>
              <span className="block text-lg font-bold leading-tight">SIPANDU RW</span>
              <span className="block text-[11px] opacity-80">Sistem Pelayanan & Pengingat Warga</span>
            </span>
          </Link>

          <div className="max-w-md space-y-8">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold leading-tight xl:text-4xl">
                Kelola RW lebih rapi,
                <br />
                warga lebih terinformasi.
              </h1>
              <p className="text-sm leading-relaxed opacity-85">
                Data kependudukan, jadwal kerja bakti & ronda, iuran kebersihan, surat pengantar — plus pengingat
                otomatis yang dikirim langsung ke WhatsApp warga.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { t: "Pengingat iuran otomatis", d: "H-3, jatuh tempo, dan tunggakan terkirim otomatis." },
                { t: "Jadwal kegiatan", d: "Penugasan petugas & konfirmasi kehadiran." },
                { t: "Satu klik siarkan", d: "Pengumuman ke seluruh warga via WhatsApp." },
                { t: "Laporan real-time", d: "Pantau tunggakan dan partisipasi warga." },
              ].map((f) => (
                <div key={f.t} className="rounded-xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-sm">
                  <p className="text-[13px] font-semibold">{f.t}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed opacity-80">{f.d}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11.5px] opacity-70">RW 05 · Kel. Banjar, Kec. Banjar, Kota Banjar, Jawa Barat</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="mb-6 inline-flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>
                <span className="block text-lg font-bold leading-tight">SIPANDU RW</span>
                <span className="block text-[11px] text-muted">Sistem Pelayanan Warga</span>
              </span>
            </Link>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-[12.5px] text-muted">
            <Link href="/" className="font-medium text-primary hover:underline">
              ← Kembali ke portal warga
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
