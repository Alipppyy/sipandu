import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatDate, calculateAge } from "@/lib/utils";
import { PrintButtons } from "./print-buttons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cetak surat pengantar" };

const TYPE_LABEL: Record<string, { judul: string; jenis: string }> = {
  DOMISILI: { judul: "SURAT KETERANGAN DOMISILI", jenis: "keterangan domisili" },
  SKCK: { judul: "SURAT PENGANTAR SKCK", jenis: "pengantar pembuatan SKCK" },
  PENGANTAR_KTP: { judul: "SURAT PENGANTAR KTP", jenis: "pengantar pembuatan KTP" },
  PENGANTAR_KK: { judul: "SURAT PENGANTAR KARTU KELUARGA", jenis: "pengantar pembuatan Kartu Keluarga" },
  USAHA: { judul: "SURAT KETERANGAN USAHA", jenis: "keterangan usaha" },
  TIDAK_MAMPU: { judul: "SURAT KETERANGAN TIDAK MAMPU", jenis: "keterangan tidak mampu" },
  KETERANGAN_LAIN: { judul: "SURAT KETERANGAN", jenis: "keterangan" },
};

const GENDER_LABEL: Record<string, string> = {
  LAKI_LAKI: "Laki-laki",
  PEREMPUAN: "Perempuan",
};

export default async function CetakSuratPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "WARGA") redirect("/warga");

  const letter = await prisma.letter.findUnique({
    where: { id },
    include: {
      resident: {
        include: { family: { select: { kkNumber: true, address: true, headName: true } } },
      },
      rt: { include: { ketuaUser: { select: { name: true } } } },
      processedBy: { select: { name: true } },
    },
  });

  if (!letter) notFound();

  // Ketua RT hanya boleh mencetak surat wilayahnya sendiri
  if (session.role === "KETUA_RT" && session.rtId && letter.rtId !== session.rtId) notFound();

  const profile = await prisma.rwProfile.findFirst();
  const meta = TYPE_LABEL[letter.type] ?? TYPE_LABEL.KETERANGAN_LAIN;
  const r = letter.resident;
  const tanggal = formatDate(letter.finishedAt ?? letter.createdAt);
  const alamat = r.family?.address ?? `RT ${letter.rt.number} RW ${profile?.rwNumber ?? "05"}`;
  const rtLeader = letter.rt.ketuaUser?.name ?? `Ketua RT ${letter.rt.number}`;

  const baris: { label: string; value: string }[] = [
    { label: "Nama", value: r.name },
    { label: "NIK", value: r.nik },
    { label: "No. Kartu Keluarga", value: r.family?.kkNumber ?? "—" },
    { label: "Tempat / Tgl. Lahir", value: `${r.birthPlace}, ${formatDate(r.birthDate)}` },
    { label: "Usia", value: `${calculateAge(r.birthDate)} tahun` },
    { label: "Jenis Kelamin", value: GENDER_LABEL[r.gender] ?? r.gender },
    { label: "Agama", value: r.religion.charAt(0) + r.religion.slice(1).toLowerCase() },
    { label: "Pekerjaan", value: r.occupation },
    { label: "Alamat", value: `${alamat}, RT ${letter.rt.number} / RW ${profile?.rwNumber ?? "05"}` },
  ];

  return (
    <div className="min-h-screen bg-surface-muted/40 py-8 print:bg-white print:py-0">
      <PrintButtons />

      <div className="mx-auto w-full max-w-[760px] px-4 print:px-0">
        {letter.status !== "SELESAI" && (
          <div className="mb-4 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-[13px] text-warning print:hidden">
            Status surat masih{" "}
            <strong>
              {letter.status === "DIAJUKAN" ? "Diajukan" : letter.status === "DIPROSES" ? "Diproses" : "Ditolak"}
            </strong>
            . Dokumen di bawah ini hanya pratinjau — selesaikan surat terlebih dahulu sebelum
            ditandatangani dan diserahkan kepada warga.
          </div>
        )}

        <div className="rounded-2xl border border-line bg-surface p-9 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
          {/* Kop */}
          <div className="flex items-start gap-4 border-b-[3px] border-double border-foreground pb-4">
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
                {profile?.address}, {profile?.village}, {profile?.district}, {profile?.city},{" "}
                {profile?.province} {profile?.postalCode}
              </p>
            </div>
          </div>

          {/* Judul */}
          <div className="mt-6 text-center">
            <h3 className="text-[15px] font-bold uppercase tracking-[0.15em] underline decoration-2 underline-offset-4">
              {meta.judul}
            </h3>
            <p className="mt-1.5 text-[12.5px]">
              Nomor: <span className="font-semibold">{letter.number}</span>
            </p>
          </div>

          {/* Isi */}
          <p className="mt-6 text-[13px] leading-relaxed">
            Yang bertanda tangan di bawah ini, Ketua RW {profile?.rwNumber ?? "05"} Kelurahan{" "}
            {profile?.village ?? "Banjar"}, Kecamatan {profile?.district ?? "Banjar"}, {profile?.city}, dengan ini
            menerangkan bahwa:
          </p>

          <dl className="mx-auto mt-4 w-full max-w-[520px] space-y-1.5 text-[13px]">
            {baris.map((b) => (
              <div key={b.label} className="flex gap-3">
                <dt className="w-[180px] shrink-0">{b.label}</dt>
                <dd className="shrink-0">:</dd>
                <dd className="flex-1 font-medium">{b.value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 text-[13px] leading-relaxed">
            Bahwa nama tersebut di atas adalah benar warga kami yang berdomisili di wilayah RW{" "}
            {profile?.rwNumber ?? "05"} RT {letter.rt.number} Kelurahan {profile?.village ?? "Banjar"} dan
            tercatat dalam data kependudukan kami. Surat ini dibuat untuk keperluan{" "}
            <strong>{meta.jenis}</strong>
            {letter.purpose ? (
              <>
                {" "}
                dengan keterangan: <strong>{letter.purpose}</strong>
              </>
            ) : null}
            .
          </p>

          <p className="mt-3 text-[13px] leading-relaxed">
            Demikian surat {meta.jenis} ini dibuat dengan sebenarnya untuk dapat dipergunakan
            sebagaimana mestinya.
          </p>

          {letter.notes && (
            <p className="mt-4 rounded-lg border border-line bg-surface-muted/50 px-4 py-2.5 text-[12px] text-muted">
              Catatan: {letter.notes}
            </p>
          )}

          {/* Tanda tangan */}
          <div className="mt-10 grid grid-cols-2 gap-8 text-center text-[13px]">
            <div>
              <p>Mengetahui,</p>
              <p className="text-muted">Ketua RT {letter.rt.number}</p>
              <div className="mt-16 border-t border-foreground/60 pt-1.5 font-medium">{rtLeader}</div>
            </div>
            <div>
              <p>
                {profile?.village}, {tanggal}
              </p>
              <p className="text-muted">Ketua RW {profile?.rwNumber ?? "05"}</p>
              <div className="mt-16 border-t border-foreground/60 pt-1.5 font-medium">
                {profile?.ketuaName ?? "Ketua RW"}
              </div>
            </div>
          </div>

          <p className="mt-8 border-t border-dashed border-line pt-3 text-center text-[10.5px] text-muted">
            Dicetak dari SIPANDU RW · {formatDate(letter.createdAt)} · nomor surat {letter.number}
          </p>
        </div>
      </div>
    </div>
  );
}
