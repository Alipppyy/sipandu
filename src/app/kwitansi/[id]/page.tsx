import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatCurrency, formatDate, formatTime, terbilang, BULAN_LIST } from "@/lib/utils";
import { PrintButtons } from "./print-buttons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Kwitansi pembayaran" };

export default async function KwitansiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login`);

  const bill = await prisma.wasteBill.findUnique({
    where: { id },
    include: {
      family: {
        include: {
          rt: { select: { number: true, areaName: true } },
          head: { select: { name: true } },
        },
      },
      payer: { select: { name: true, nik: true } },
      rt: { select: { number: true, areaName: true } },
      payments: {
        orderBy: { paidAt: "desc" },
        include: { receiver: { select: { name: true } } },
      },
    },
  });

  if (!bill) notFound();

  // Warga hanya boleh mencetak kwitansi miliknya sendiri
  if (session.role === "WARGA") {
    const me = await prisma.user.findUnique({
      where: { id: session.id },
      select: { residentId: true },
    });
    const isOwn = me?.residentId
      ? await prisma.family.findFirst({
          where: { id: bill.familyId, members: { some: { id: me.residentId } } },
          select: { id: true },
        })
      : null;
    if (!isOwn) notFound();
  }

  const profile = await prisma.rwProfile.findFirst();
  const payment = bill.payments[0] ?? null;
  const methodLabel =
    bill.method === "TRANSFER"
      ? "Transfer bank"
      : bill.method === "QRIS"
        ? "QRIS"
        : bill.method === "LAINNYA"
          ? "Lainnya"
          : "Tunai";

  const rows: { label: string; value: string }[] = [
    { label: "Nomor kwitansi", value: bill.receiptNo ?? payment?.receiptNo ?? "—" },
    { label: "Nomor tagihan", value: bill.billNumber },
    { label: "Periode iuran", value: `${BULAN_LIST[bill.periodMonth - 1]} ${bill.periodYear}` },
    {
      label: "Tanggal bayar",
      value: bill.paidAt ? `${formatDate(bill.paidAt)}, ${formatTime(bill.paidAt)} WIB` : "—",
    },
    { label: "Metode", value: methodLabel },
    { label: "Diterima oleh", value: payment?.receiver?.name ?? "Bendahara RW" },
  ];

  return (
    <div className="min-h-screen bg-surface-muted/40 py-8 print:bg-white print:py-0">
      <PrintButtons />

      <div className="mx-auto w-full max-w-[720px] px-4 print:px-0">
        <div className="rounded-2xl border border-line bg-surface p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
          {/* Kop */}
          <div className="flex items-start gap-4 border-b-2 border-foreground pb-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground print:bg-transparent print:text-black">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="min-w-0 flex-1 text-center">
              <h1 className="text-[15px] font-bold uppercase tracking-wide">
                Pemerintah Kelurahan {profile?.village ?? "Banjar"}
              </h1>
              <h2 className="text-[17px] font-bold uppercase tracking-wide">
                Ketua RW {profile?.rwNumber ?? "05"} {profile?.village ?? "Banjar"}
              </h2>
              <p className="mt-0.5 text-[11.5px] leading-relaxed">
                {profile?.address ?? "Jl. Raya Banjar No. 12"}, {profile?.village}, {profile?.district},{" "}
                {profile?.city}, {profile?.province} {profile?.postalCode}
              </p>
              <p className="text-[11.5px]">
                Sekretariat: {profile?.address ?? "Jl. Raya Banjar No. 12"} · Kontak{" "}
                {profile?.ketuaPhone ? `+${profile.ketuaPhone}` : "—"}
              </p>
            </div>
          </div>

          <h3 className="mt-5 text-center text-[14px] font-bold uppercase tracking-[0.2em] underline decoration-double underline-offset-4">
            Bukti Pembayaran Iuran Kebersihan
          </h3>

          {/* Data warga + pembayaran */}
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-line p-4">
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-muted">Diterima dari</p>
              <dl className="space-y-1.5 text-[12.5px]">
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted">Nama</dt>
                  <dd className="flex-1 font-semibold">{bill.payer?.name ?? bill.family.head?.name ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted">NIK</dt>
                  <dd className="flex-1 font-mono text-[11.5px]">{bill.payer?.nik ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted">No. KK</dt>
                  <dd className="flex-1 font-mono text-[11.5px]">{bill.family.kkNumber}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted">Alamat</dt>
                  <dd className="flex-1">
                    {bill.family.address}, RT {bill.family.rt.number}/{profile?.rwNumber ?? "05"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-line p-4">
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-muted">Detail pembayaran</p>
              <dl className="space-y-1.5 text-[12.5px]">
                {rows.map((r) => (
                  <div key={r.label} className="flex gap-2">
                    <dt className="w-28 shrink-0 text-muted">{r.label}</dt>
                    <dd className="flex-1 font-medium">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Nominal */}
          <div className="mt-5 rounded-xl border-2 border-primary/30 bg-primary-soft/40 px-5 py-4 print:border-black">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted">Jumlah diterima</p>
                <p className="text-2xl font-bold tabular-nums text-primary print:text-black">
                  {formatCurrency(bill.paidAmount || bill.amount)}
                </p>
              </div>
              <div className="max-w-full text-right">
                <p className="text-[11px] uppercase tracking-wide text-muted">Terbilang</p>
                <p className="text-[12.5px] font-semibold italic capitalize">
                  # {terbilang(bill.paidAmount || bill.amount)} #
                </p>
              </div>
            </div>
          </div>

          {bill.notes && (
            <p className="mt-4 rounded-xl border border-line bg-surface-muted/50 px-4 py-2.5 text-[12px] text-muted">
              Catatan: {bill.notes}
            </p>
          )}

          {/* Tanda tangan */}
          <div className="mt-8 grid grid-cols-2 gap-6 text-center">
            <div>
              <p className="text-[12px] text-muted">Penyetor,</p>
              <div className="mt-14 border-t border-foreground/60 pt-1.5 text-[12px] font-medium">
                {bill.payer?.name ?? bill.family.head?.name ?? "—"}
              </div>
            </div>
            <div>
              <p className="text-[12px] text-muted">
                {profile?.village}, {formatDate(bill.paidAt ?? new Date())}
              </p>
              <p className="text-[12px] text-muted">Petugas,</p>
              <div className="mt-14 border-t border-foreground/60 pt-1.5 text-[12px] font-medium">
                {payment?.receiver?.name ?? profile?.bendaharaName ?? "Bendahara RW"}
              </div>
            </div>
          </div>

          <p className="mt-6 border-t border-dashed border-line pt-3 text-center text-[10.5px] text-muted">
            Dokumen ini dicetak otomatis dari SIPANDU RW · Simpan sebagai bukti pembayaran yang sah.
          </p>
        </div>
      </div>
    </div>
  );
}
