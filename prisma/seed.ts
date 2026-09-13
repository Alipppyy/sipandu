import {
  PrismaClient,
  type Prisma,
  type Religion,
  type Education,
  type Gender,
  type MaritalStatus,
  type FamilyRole,
  type ResidentStatus,
  type ActivityType,
  type ActivityStatus,
  type AttendanceStatus,
  type BillStatus,
  type PaymentMethod,
  type AnnouncementCategory,
  type LetterType,
  type LetterStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/* ── util ─────────────────────────────────────────────────── */

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260910);
const AGAMA_LAIN: Religion[] = ["KRISTEN", "KATOLIK", "HINDU", "BUDDHA"];
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const chance = (p: number) => rand() < p;

const now = new Date();
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
const d = (days: number, hour = 9, minute = 0) => {
  const x = new Date(startOfToday);
  x.setDate(x.getDate() + days);
  x.setHours(hour, minute, 0, 0);
  return x;
};
const monthName = (m: number) =>
  new Date(2026, m - 1, 1).toLocaleString("id-ID", { month: "long" });

/* ── nama ─────────────────────────────────────────────────── */

const DEPAN_L = ["Asep", "Ujang", "Deddy", "Tatang", "Cecep", "Yayat", "Jajang", "Otong", "Maman", "Agus", "Bambang", "Hendra", "Iwan", "Indra", "Hadi", "Aan", "Nanang", "Deden", "Ade", "Rahmat", "Fajar", "Rizky", "Bayu", "Yogi", "Sandi", "Ridwan", "Andi", "Dedi", "Eko", "Herry", "Imam", "Joko", "Koko", "Lukman", "Mulyadi", "Nana", "Odang", "Parman", "Rusdi", "Surya", "Toto", "Udin", "Wawan", "Yusuf"];
const DEPAN_P = ["Nia", "Iis", "Euis", "Yanti", "Siti", "Rina", "Lilis", "Kartini", "Popon", "Eneng", "Tuti", "Wati", "Nur", "Fitri", "Gina", "Sri", "Dewi", "Maya", "Ayu", "Ratna", "Lina", "Nani", "Sasa", "Titin", "Ucu", "Vina", "Winda", "Yuli", "Anisa", "Beti", "Cici", "Dian", "Eka", "Fani", "Hani", "Indah", "Juli", "Kiki", "Lala", "Mira", "Nita", "Oci", "Pipi", "Rani", "Sinta", "Tati"];
const BELAKANG = ["Wijaya", "Kurniawan", "Supriatna", "Nugraha", "Permana", "Suryana", "Hidayat", "Setiawan", "Ramadhan", "Firdaus", "Maryati", "Wahyuni", "Susanti", "Santoso", "Pratama", "Gunawan", "Saputra", "Maulana", "Juliana", "Anggraeni", "Koswara", "Sudrajat", "Purnama", "Kusuma", "Handayani", "Lestari", "Rahayu", "Wibowo", "Hakim", "Fauzi", "Lesmana", "Ruhiyat", "Sopian", "Nurmala", "Apriyani", "Komalasari"];
const KERJA = ["Wiraswasta", "Petani", "Buruh", "Pedagang", "Guru", "Sopir", "Karyawan Swasta", "PNS", "Tukang Bangunan", "Penjahit", "Nelayan", "Montir", "Satpam", "Karyawan Toko", "Pensiunan", "Ibu Rumah Tangga", "Mahasiswa", "Pelajar", "Perawat", "Bidan"];
const JALAN = ["Jl. Melati", "Jl. Kenanga", "Jl. Anggrek", "Jl. Cempaka", "Jl. Dahlia", "Jl. Mawar", "Jl. Teratai", "Jl. Flamboyan", "Gg. Sukamaju", "Gg. Bakti", "Jl. Raya Banjar", "Gg. Mekar"];

const RTS = [
  { number: "01", area: "Blok Melati", houses: 9 },
  { number: "02", area: "Blok Kenanga", houses: 10 },
  { number: "03", area: "Blok Anggrek", houses: 8 },
  { number: "04", area: "Blok Cempaka", houses: 9 },
  { number: "05", area: "Blok Dahlia", houses: 8 },
];

const TEMPLATES = [
  {
    key: "TRASH_PRE",
    name: "Pengingat iuran H-3",
    category: "PENGINGAT_SAMPAH" as const,
    body: `Halo Bapak/Ibu {{nama}} 👋

Mengingatkan, iuran kebersihan RW {{nama_rw}} periode *{{periode}}* sebesar *{{jumlah}}* akan jatuh tempo pada *{{jatuh_tempo}}* ({{hari_lagi}} hari lagi).

Silakan siapkan dan bayarkan melalui ketua RT atau transfer ke rekening kas RW.
Terima kasih atas gotong royongnya 🙏

_SIPANDU RW {{nama_rw}} · Kel. {{kelurahan}}_`,
  },
  {
    key: "TRASH_DUE",
    name: "Hari jatuh tempo",
    category: "PENGINGAT_SAMPAH" as const,
    body: `Halo Bapak/Ibu {{nama}} 👋

Hari ini adalah *tanggal jatuh tempo* iuran kebersihan RW {{nama_rw}} periode *{{periode}}* sebesar *{{jumlah}}*.

Mohon segera dibayarkan agar pelayanan kebersihan lingkungan tetap berjalan lancar.

Terima kasih 🙏
_SIPANDU RW {{nama_rw}}_`,
  },
  {
    key: "TRASH_LATE_3",
    name: "Tunggakan H+3",
    category: "PENGINGAT_SAMPAH" as const,
    body: `Halo Bapak/Ibu {{nama}} 🙏

Iuran kebersihan RW {{nama_rw}} periode *{{periode}}* sebesar *{{jumlah}}* *belum kami terima*, sudah lewat {{hari_terlambat}} hari dari jatuh tempo ({{jatuh_tempo}}).

Jika sudah membayar, mohon abaikan pesan ini dan konfirmasi ke ketua RT.
Terima kasih.

_SIPANDU RW {{nama_rw}}_`,
  },
  {
    key: "TRASH_LATE_7",
    name: "Tunggakan H+7",
    category: "PENGINGAT_SAMPAH" as const,
    body: `Halo Bapak/Ibu {{nama}} 🙏

Kami catat iuran kebersihan periode *{{periode}}* sebesar *{{jumlah}}* masih tertunggak, sudah {{hari_terlambat}} hari lewat dari jatuh tempo ({{jatuh_tempo}}).

Mohon bantuannya untuk segera dilunasi atau konfirmasi ke ketua RT apabila ada kendala.
Terima kasih atas kerja samanya.

_SIPANDU RW {{nama_rw}}_`,
  },
  {
    key: "ACTIVITY_REMINDER",
    name: "Pengingat jadwal kegiatan",
    category: "JADWAL_KEGIATAN" as const,
    body: `Halo Bapak/Ibu {{nama}} 👋

Mengingatkan jadwal kegiatan RW {{nama_rw}}:

📌 *{{kegiatan}}*
📅 {{tanggal}}
🕐 {{jam}}
📍 {{lokasi}}
👤 Penanggung jawab: {{penanggung_jawab}}

Mohon kehadirannya tepat waktu. Terima kasih 🙏
_SIPANDU RW {{nama_rw}}_`,
  },
  {
    key: "ANNOUNCEMENT",
    name: "Siarkan pengumuman",
    category: "PENGUMUMAN" as const,
    body: `📢 *{{judul}}*
_Pengumuman RW {{nama_rw}}_

{{pesan}}

Terima kasih 🙏`,
  },
  {
    key: "PAYMENT_RECEIPT",
    name: "Bukti pembayaran iuran",
    category: "BUKTI_BAYAR" as const,
    body: `✅ *Pembayaran Diterima*

Terima kasih Bapak/Ibu {{nama}} 🙏
Iuran kebersihan periode *{{periode}}* sebesar *{{jumlah}}* telah kami terima.

🧾 No. Kwitansi: {{no_kwitansi}}
📅 Tanggal: {{tanggal_bayar}}
💳 Metode: {{metode}}

_SIPANDU RW {{nama_rw}}_`,
  },
  {
    key: "LETTER_READY",
    name: "Surat pengantar siap diambil",
    category: "SURAT_SELESAI" as const,
    body: `Halo Bapak/Ibu {{nama}} 👋

Surat pengantar yang Anda ajukan sudah selesai dan dapat diambil:

📄 Jenis: {{jenis_surat}}
🔢 Nomor: {{nomor_surat}}
📍 Diambil di: {{alamat_rw}}

Jam pelayanan: 18.00 - 20.00 WIB.
_SIPANDU RW {{nama_rw}}_`,
  },
];

const ACTIVITY_SEEDS: { title: string; type: ActivityType; day: number; dur: number; loc: string; pic: string; rt: string | null }[] = [
  { title: "Kerja Bakti Akbar Bulanan", type: "KERJA_BAKTI", day: -21, dur: 3, loc: "Seluruh lingkungan RW 05", pic: "H. Surya Wijaya", rt: null },
  { title: "Ronda Malam Jumat", type: "RONDA", day: -14, dur: 2, loc: "Poskamling Blok Melati", pic: "Asep Supriatna", rt: "01" },
  { title: "Rapat Koordinasi Ketua RT", type: "RAPAT", day: -10, dur: 2, loc: "Balai RW 05", pic: "H. Surya Wijaya", rt: null },
  { title: "Pengajian Akbar Ibu-Ibu", type: "PENGAJIAN", day: -7, dur: 2, loc: "Musholla Al-Ikhlas", pic: "Ust. Rahmat Hidayat", rt: null },
  { title: "Posyandu Balita & Lansia", type: "POSYANDU", day: -6, dur: 3, loc: "Posyandu Melati 1", pic: "Nia Kurniasih, S.AP", rt: null },
  { title: "Kerja Bakti Bersih Selokan", type: "KERJA_BAKTI", day: -3, dur: 3, loc: "Gg. Sukamaju RT 03", pic: "Deddy Kurniawan", rt: "03" },
  { title: "Ronda Malam Sabtu", type: "RONDA", day: -1, dur: 2, loc: "Poskamling Blok Kenanga", pic: "Tatang Koswara", rt: "02" },
  { title: "Kerja Bakti Rutin Mingguan", type: "KERJA_BAKTI", day: 0, dur: 3, loc: "Halaman Balai RW 05", pic: "Asep Supriatna", rt: null },
  { title: "Rapat Bulanan RW 05", type: "RAPAT", day: 2, dur: 2, loc: "Balai RW 05", pic: "H. Surya Wijaya", rt: null },
  { title: "Ronda Malam Jumat", type: "RONDA", day: 3, dur: 2, loc: "Poskamling Blok Anggrek", pic: "Cecep Nugraha", rt: "03" },
  { title: "Posyandu Balita", type: "POSYANDU", day: 4, dur: 3, loc: "Posyandu Kenanga 2", pic: "Nia Kurniasih, S.AP", rt: "02" },
  { title: "Pengajian Rutin Bapak-Bapak", type: "PENGAJIAN", day: 5, dur: 2, loc: "Musholla Al-Ikhlas", pic: "Ust. Rahmat Hidayat", rt: null },
  { title: "Kerja Bakti Pengecatan Poskamling", type: "KERJA_BAKTI", day: 8, dur: 4, loc: "Poskamling Blok Dahlia", pic: "Maman Permana", rt: "05" },
  { title: "Ronda Malam Sabtu", type: "RONDA", day: 9, dur: 2, loc: "Poskamling Blok Cempaka", pic: "Jajang Sudrajat", rt: "04" },
  { title: "Rapat Panitia Agustusan", type: "RAPAT", day: 12, dur: 2, loc: "Balai RW 05", pic: "H. Surya Wijaya", rt: null },
  { title: "Kerja Bakti Akbar Bulanan", type: "KERJA_BAKTI", day: 16, dur: 3, loc: "Seluruh lingkungan RW 05", pic: "Deddy Kurniawan", rt: null },
] as const;

const ANNOUNCEMENTS: { title: string; body: string; category: AnnouncementCategory; pinned: boolean; day: number }[] = [
  { title: "Jadwal Kerja Bakti Akbar – Minggu ini", body: "Diberitahukan kepada seluruh warga RW 05 bahwa kerja bakti akbar akan dilaksanakan pada hari Minggu pukul 06.00 WIB bertempat di halaman Balai RW. Mohon kehadiran seluruh kepala keluarga dengan membawa alat kebersihan masing-masing.\n\nDemikian pengumuman ini disampaikan, atas partisipasi warga kami ucapkan terima kasih.", category: "KEGIATAN", pinned: true, day: -4 },
  { title: "Kenaikan Iuran Kebersihan Mulai Bulan Depan", body: "Berdasarkan hasil rapat bulanan tanggal 8 lalu, iuran kebersihan disepakati naik menjadi Rp 30.000 per KK per bulan terhitung mulai bulan depan. Kenaikan ini digunakan untuk penambahan armada pengangkut sampah dan operasional bank sampah.\n\nMohon maaf atas penyesuaian ini dan terima kasih atas pengertian warga.", category: "KEUANGAN", pinned: true, day: -2 },
  { title: "Pendataan Warga Pindah & Domisili", body: "Kami mengimbau warga yang baru pindah masuk atau pindah keluar agar segera melapor ke ketua RT masing-masing paling lambat tanggal 25 bulan ini. Pendataan ini diperlukan untuk pemutakhiran data kependudukan RW 05.", category: "UMUM", pinned: false, day: -6 },
  { title: "Penting: Waspada Kasus DBD di Lingkungan RW 05", body: "Telah ditemukan 2 kasus DBD di RT 03. Kami mengimbau seluruh warga untuk melakukan 3M Plus setiap akhir pekan, menguras bak mandi, dan menaburkan bubuk larvasida. Fogging akan dilaksanakan oleh Puskesmas Banjar pada hari Selasa mendatang.", category: "PENTING", pinned: true, day: -1 },
  { title: "Laporan Keuangan Kas RW – Triwulan Berjalan", body: "Saldo kas RW per akhir bulan lalu tercatat sebesar Rp 8.450.000 dengan rincian pemasukan iuran Rp 5.600.000 dan pengeluaran operasional kebersihan Rp 3.200.000. Laporan lengkap dapat dilihat pada papan pengumuman Balai RW.", category: "KEUANGAN", pinned: false, day: -9 },
  { title: "Program Bank Sampah RW 05", body: "Bank sampah buka setiap hari Sabtu pukul 08.00 - 11.00 WIB di sebelah Poskamling Blok Melati. Warga dapat menabung sampah plastik, kardus, dan logam. Hasil penjualan akan masuk ke kas RW dan sebagian menjadi tabungan warga.", category: "UMUM", pinned: false, day: -12 },
  { title: "Jadwal Posyandu Balita & Lansia", body: "Posyandu akan dilaksanakan setiap tanggal 15 pukul 08.00 WIB di Posyandu Melati 1. Pelayanan meliputi penimbangan balita, imunisasi, pemeriksaan lansia, dan pemberian vitamin gratis.", category: "KEGIATAN", pinned: false, day: -15 },
  { title: "Gotong Royong Pemasangan CCTV Lingkungan", body: "Guna meningkatkan keamanan lingkungan, RW 05 akan memasang 6 titik CCTV. Warga yang ingin berpartisipasi dapat menghubungi bendahara RW. Pemasangan dijadwalkan pada pekan kedua bulan depan.", category: "PENTING", pinned: false, day: -20 },
];

const LETTER_TYPES: { type: LetterType; purpose: string }[] = [
  { type: "DOMISILI", purpose: "Persyaratan melamar pekerjaan" },
  { type: "SKCK", purpose: "Persyaratan pembuatan SKCK di Polsek" },
  { type: "PENGANTAR_KTP", purpose: "Pengurusan KTP elektronik baru" },
  { type: "PENGANTAR_KK", purpose: "Penambahan anggota keluarga pada KK" },
  { type: "USAHA", purpose: "Pengajuan izin usaha warung kelontong" },
  { type: "TIDAK_MAMPU", purpose: "Pengajuan bantuan pendidikan anak" },
  { type: "KETERANGAN_LAIN", purpose: "Keperluan administrasi bank" },
] as const;

async function main() {
  console.log("🌱 Menyiapkan data demo SIPANDU RW…");

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "AuditLog","WaMessage","MessageTemplate","Letter","Announcement","Payment","WasteBill","ActivityAssignment","Activity","Resident","Family","Rt","User","RwProfile" RESTART IDENTITY CASCADE;
  `);

  /* ── Profil RW ─────────────────────────────────────────── */
  const profile = await prisma.rwProfile.create({
    data: {
      rwNumber: "05",
      village: "Banjar",
      district: "Banjar",
      city: "Kota Banjar",
      province: "Jawa Barat",
      postalCode: "46311",
      address: "Balai RW 05, Jl. Melati No. 12",
      ketuaName: "H. Surya Wijaya",
      ketuaPhone: "628112345001",
      sekretarisName: "Nia Kurniasih, S.AP",
      bendaharaName: "Deddy Kurniawan",
      waProvider: "fonnte",
      waEnabled: false,
      waAutoSend: true,
      trashFeeAmount: 30000,
      trashDueDay: 10,
      reminderOffsets: "-3,0,3,7",
      reminderHour: 8,
      activityReminder: true,
      activityLeadHours: 12,
    },
  });

  /* ── RT ────────────────────────────────────────────────── */
  const rts = [];
  for (const r of RTS) {
    rts.push(
      await prisma.rt.create({
        data: {
          id: `rt-${r.number}`,
          number: r.number,
          rwNumber: "05",
          areaName: r.area,
          notes: `Wilayah ${r.area}, ${r.houses * 4} kepala keluarga terdaftar`,
        },
      }),
    );
  }

  /* ── Pengguna ──────────────────────────────────────────── */
  const pwd = await bcrypt.hash("sipandu123", 10);
  const users = [
    { id: "user-admin", email: "admin@sipandu.rw", name: "H. Surya Wijaya", role: "ADMIN" as const, phone: "628112345001", avatar: "emerald", rt: null },
    { id: "user-operator", email: "sekretaris@sipandu.rw", name: "Nia Kurniasih, S.AP", role: "OPERATOR" as const, phone: "628112345002", avatar: "sky", rt: null },
    { id: "user-bendahara", email: "bendahara@sipandu.rw", name: "Deddy Kurniawan", role: "OPERATOR" as const, phone: "628112345003", avatar: "violet", rt: null },
    { id: "user-rt01", email: "rt01@sipandu.rw", name: "Asep Supriatna", role: "KETUA_RT" as const, phone: "628112345011", avatar: "amber", rt: "rt-01" },
    { id: "user-rt02", email: "rt02@sipandu.rw", name: "Tatang Koswara", role: "KETUA_RT" as const, phone: "628112345012", avatar: "rose", rt: "rt-02" },
    { id: "user-rt03", email: "rt03@sipandu.rw", name: "Cecep Nugraha", role: "KETUA_RT" as const, phone: "628112345013", avatar: "teal", rt: "rt-03" },
    { id: "user-rt04", email: "rt04@sipandu.rw", name: "Jajang Sudrajat", role: "KETUA_RT" as const, phone: "628112345014", avatar: "indigo", rt: "rt-04" },
    { id: "user-rt05", email: "rt05@sipandu.rw", name: "Maman Permana", role: "KETUA_RT" as const, phone: "628112345015", avatar: "orange", rt: "rt-05" },
  ];
  for (const u of users) {
    await prisma.user.create({
      data: {
        id: u.id,
        email: u.email,
        passwordHash: pwd,
        name: u.name,
        phone: u.phone,
        role: u.role,
        avatarColor: u.avatar,
        rtId: u.rt,
        lastLoginAt: u.role === "ADMIN" ? d(0, 7, 41) : d(-int(0, 5), int(7, 20), int(0, 59)),
      },
    });
  }

  /* ── Keluarga & Warga ──────────────────────────────────── */
  type ResidentSeed = {
    id: string;
    nik: string;
    name: string;
    gender: Gender;
    birthDate: Date;
    education: Education;
    occupation: string;
    maritalStatus: MaritalStatus;
    phone: string | null;
    familyRole: FamilyRole;
    familyId: string;
    rtId: string;
    isHead?: boolean;
  };
  const residents: ResidentSeed[] = [];
  const families: { id: string; rtId: string; headName: string; headId?: string; kk: string; ekonom: string; rtNumber: string }[] = [];
  let familyIndex = 0;
  let residentIndex = 0;
  const rona = ["MAMPU", "MENENGAH", "MENENGAH", "MENENGAH", "KURANG_MAMPU"];

  for (const rt of RTS) {
    const totalFam = rt.houses;
    for (let i = 0; i < totalFam; i++) {
      familyIndex++;
      const fid = `kk-${String(familyIndex).padStart(3, "0")}`;
      const headMale = chance(0.85);
      const kepalaDepan = headMale ? pick(DEPAN_L) : pick(DEPAN_P);
      const belakang = pick(BELAKANG);
      const headName = `${kepalaDepan} ${belakang}`;
      const kkNumber = `3276${String(int(10, 99))}${String(int(100000, 999999))}${String(familyIndex).padStart(4, "0")}`.slice(0, 16);
      const ekonom = pick(rona);
      const rtId = `rt-${rt.number}`;

      residents.push({
        id: `w-${String(++residentIndex).padStart(4, "0")}`,
        nik: `3276${String(int(10, 28)).padStart(2, "0")}${String(int(100000, 999999))}${String(residentIndex).padStart(4, "0")}`.slice(0, 16),
        name: headName,
        gender: headMale ? "LAKI_LAKI" : "PEREMPUAN",
        birthDate: new Date(int(1965, 1995), int(0, 11), int(1, 28)),
        education: pick<Education>(["SMA", "SMA", "SMP", "SARJANA", "SD", "DIPLOMA"]),
        occupation: headMale ? pick(KERJA.slice(0, 15)) : pick(KERJA),
        maritalStatus: "KAWIN",
        phone: `628${int(11, 89)}${int(1000000, 9999999)}`,
        familyRole: "KEPALA",
        familyId: fid,
        rtId,
        isHead: true,
      });

      // pasangan
      if (chance(0.88)) {
        residents.push({
          id: `w-${String(++residentIndex).padStart(4, "0")}`,
          nik: `3276${String(int(10, 28)).padStart(2, "0")}${String(int(100000, 999999))}${String(residentIndex).padStart(4, "0")}`.slice(0, 16),
          name: headMale ? `${pick(DEPAN_P)} ${belakang}` : `${pick(DEPAN_L)} ${pick(BELAKANG)}`,
          gender: headMale ? "PEREMPUAN" : "LAKI_LAKI",
          birthDate: new Date(int(1968, 1998), int(0, 11), int(1, 28)),
          education: pick<Education>(["SMA", "SMP", "SD", "SARJANA", "DIPLOMA"]),
          occupation: pick(KERJA),
          maritalStatus: "KAWIN",
          phone: chance(0.6) ? `628${int(11, 89)}${int(1000000, 9999999)}` : null,
          familyRole: "ISTRI",
          familyId: fid,
          rtId,
        });
      }
      // anak
      const childCount = int(0, 3);
      for (let c = 0; c < childCount; c++) {
        const male = chance(0.5);
        residents.push({
          id: `w-${String(++residentIndex).padStart(4, "0")}`,
          nik: `3276${String(int(10, 28)).padStart(2, "0")}${String(int(100000, 999999))}${String(residentIndex).padStart(4, "0")}`.slice(0, 16),
          name: `${male ? pick(DEPAN_L) : pick(DEPAN_P)} ${belakang}`,
          gender: male ? "LAKI_LAKI" : "PEREMPUAN",
          birthDate: new Date(int(1996, 2018), int(0, 11), int(1, 28)),
          education: pick<Education>(["SD", "SMP", "SMA", "SARJANA", "DIPLOMA"]),
          occupation: pick(["Pelajar", "Mahasiswa", "Karyawan Swasta", "Belum bekerja", "Wiraswasta"]),
          maritalStatus: chance(0.85) ? "BELUM_KAWIN" : "KAWIN",
          phone: chance(0.45) ? `628${int(11, 89)}${int(1000000, 9999999)}` : null,
          familyRole: "ANAK",
          familyId: fid,
          rtId,
        });
      }
      // orang tua serumah
      if (chance(0.18)) {
        residents.push({
          id: `w-${String(++residentIndex).padStart(4, "0")}`,
          nik: `3276${String(int(10, 28)).padStart(2, "0")}${String(int(100000, 999999))}${String(residentIndex).padStart(4, "0")}`.slice(0, 16),
          name: `${chance(0.5) ? pick(DEPAN_L) : pick(DEPAN_P)} ${pick(BELAKANG)}`,
          gender: chance(0.5) ? "LAKI_LAKI" : "PEREMPUAN",
          birthDate: new Date(int(1938, 1960), int(0, 11), int(1, 28)),
          education: pick<Education>(["SD", "SMP", "SMA"]),
          occupation: "Pensiunan",
          maritalStatus: chance(0.5) ? "KAWIN" : "CERAI_MATI",
          phone: chance(0.3) ? `628${int(11, 89)}${int(1000000, 9999999)}` : null,
          familyRole: "ORANG_TUA",
          familyId: fid,
          rtId,
        });
      }

      families.push({
        id: fid,
        rtId,
        headName,
        kk: kkNumber,
        ekonom,
        rtNumber: rt.number,
      });
    }
  }

  // 1) simpan kartu keluarga (kepala keluarga ditautkan setelah warga tersimpan)
  for (const f of families) {
    const members = residents.filter((r) => r.familyId === f.id);
    await prisma.family.create({
      data: {
        id: f.id,
        kkNumber: f.kk,
        headName: f.headName,
        headId: null,
        address: `${pick(JALAN)} No. ${int(1, 60)}`,
        block: f.rtNumber,
        houseNumber: String(int(1, 40)),
        rtId: f.rtId,
        membersCount: members.length,
        economicStatus: f.ekonom,
        createdAt: d(-int(30, 900)),
      },
    });
  }


  const residentPayload: Prisma.ResidentCreateManyInput[] = residents.map((r) => ({
    id: r.id,
    nik: r.nik,
    name: r.name,
    gender: r.gender,
    birthPlace: pick(["Banjar", "Ciamis", "Tasikmalaya", "Garut", "Cilacap", "Kuningan", "Majalengka", "Banyumas"]),
    birthDate: r.birthDate,
    religion: chance(0.97) ? "ISLAM" : pick<Religion>(AGAMA_LAIN),
    education: r.education,
    occupation: r.occupation,
    maritalStatus: r.maritalStatus,
    phone: r.phone,
    whatsapp: r.phone && chance(0.85) ? r.phone : r.phone,
    email: chance(0.35) ? `${r.name.toLowerCase().replace(/[^a-z]/g, "")}${int(10, 99)}@gmail.com` : null,
    familyId: r.familyId,
    familyRole: r.familyRole,
    rtId: r.rtId,
    status: (chance(0.03) ? "PINDAH" : "AKTIF") satisfies ResidentStatus,
    bloodType: pick(["A", "B", "AB", "O"]),
    isVoter: r.birthDate.getFullYear() < 2008,
    createdAt: d(-int(30, 700)),
  }));

  await prisma.resident.createMany({ data: residentPayload });

  // 2) tautkan kepala keluarga (relasi melingkar Family <-> Resident)
  for (const f of families) {
    const head = residents.find((r) => r.familyId === f.id && r.isHead)!;
    await prisma.family.update({ where: { id: f.id }, data: { headId: head.id } });
  }


  // link warga account untuk portal warga
  const sampleHead = await prisma.resident.findFirst({
    where: { familyRole: "KEPALA" },
    orderBy: { id: "asc" },
  });
  if (sampleHead) {
    await prisma.user.create({
      data: {
        id: "user-warga",
        email: "warga@sipandu.rw",
        passwordHash: pwd,
        name: sampleHead.name,
        phone: sampleHead.phone,
        role: "WARGA",
        avatarColor: "teal",
        rtId: sampleHead.rtId,
        residentId: sampleHead.id,
      },
    });
  }

  /* ── Template pesan ────────────────────────────────────── */
  for (const t of TEMPLATES) {
    await prisma.messageTemplate.create({ data: { key: t.key, name: t.name, category: t.category, body: t.body } });
  }

  /* ── Kegiatan ──────────────────────────────────────────── */
  const activities: { id: string; rtId: string | null; startsAt: Date; title: string }[] = [];
  for (let i = 0; i < ACTIVITY_SEEDS.length; i++) {
    const a = ACTIVITY_SEEDS[i];
    const startsAt = d(a.day, a.type === "RONDA" ? 20 : a.type === "PENGAJIAN" ? 19 : 6, 0);
    const endsAt = d(a.day, startsAt.getHours() + a.dur, 0);
    const id = `keg-${String(i + 1).padStart(2, "0")}`;
    const status: ActivityStatus = a.day < 0 ? "SELESAI" : a.day === 0 ? "BERLANGSUNG" : "TERENCANA";
    await prisma.activity.create({
      data: {
        id,
        title: a.title,
        type: a.type,
        description: `${a.title} untuk menjaga kebersamaan dan kenyamanan lingkungan RW 05. Warga dimohon hadir tepat waktu dan membawa perlengkapan secukupnya.`,
        location: a.loc,
        startsAt,
        endsAt,
        rtId: a.rt ? `rt-${a.rt}` : null,
        picName: a.pic,
        picPhone: `6281123450${String(int(10, 99))}`,
        status,
        reminderSentAt: status !== "TERENCANA" ? startsAt : null,
        reminderCount: status !== "TERENCANA" ? int(20, 60) : 0,
      },
    });
    activities.push({ id, rtId: a.rt ? `rt-${a.rt}` : null, startsAt, title: a.title });

    // penugasan petugas
    const pool = residents.filter((r) => (a.rt ? r.rtId === `rt-${a.rt}` : true));
    const jumlah = a.type === "RONDA" ? 6 : a.type === "RAPAT" ? 5 : int(8, 14);
    const shuffled = [...pool].sort(() => rand() - 0.5).slice(0, jumlah);
    for (const r of shuffled) {
      const done = status !== "TERENCANA";
      await prisma.activityAssignment.create({
        data: {
          activityId: id,
          residentId: r.id,
          role: a.type === "RONDA" ? "Anggota Ronda" : a.type === "RAPAT" ? "Undangan" : "Petugas",
          status: (done
            ? chance(0.78) ? "HADIR" : chance(0.5) ? "IZIN" : "ALPHA"
            : chance(0.25) ? "HADIR" : "BELUM_KONFIRM") satisfies AttendanceStatus,
          confirmedAt: done ? d(a.day, 6, 30) : null,
          note: !done ? null : chance(0.2) ? "Hadir mewakili keluarga" : null,
        },
      }).catch(() => null);
    }
  }

  /* ── Tagihan iuran & pembayaran ────────────────────────── */
  const periods: { month: number; year: number; due: Date; paidRatio: number }[] = [];
  for (let back = 3; back >= 0; back--) {
    const base = new Date(now.getFullYear(), now.getMonth() - back, 1);
    periods.push({
      month: base.getMonth() + 1,
      year: base.getFullYear(),
      due: new Date(base.getFullYear(), base.getMonth(), 10, 23, 59),
      paidRatio: back === 3 ? 0.96 : back === 2 ? 0.93 : back === 1 ? 0.85 : 0.42,
    });
  }

  let paymentIndex = 0;
  const waMessages: Prisma.WaMessageCreateManyInput[] = [];
  const allFamilies = await prisma.family.findMany({ include: { head: true, rt: true }, orderBy: { id: "asc" } });

  for (const period of periods) {
    for (const fam of allFamilies) {
      const amount = fam.economicStatus === "KURANG_MAMPU" ? 15000 : 30000;
      const isDibebaskan = fam.economicStatus === "KURANG_MAMPU" && chance(0.4);
      const lunas = isDibebaskan ? false : chance(period.paidRatio);
      const menunggu = !lunas && !isDibebaskan && chance(0.12);
      const status: BillStatus = isDibebaskan
        ? "DIBEBASKAN"
        : lunas
          ? "LUNAS"
          : menunggu
            ? "MENUNGGU_KONFIRMASI"
            : "BELUM_BAYAR";
      const paidAt = lunas ? new Date(period.due.getTime() - int(0, 22) * 86400000 - int(1, 12) * 3600000) : null;
      const method: PaymentMethod | null = lunas ? pick<PaymentMethod>(["TUNAI", "TUNAI", "TRANSFER", "QRIS"]) : null;
      const billId = `tag-${period.year}${String(period.month).padStart(2, "0")}-${fam.id}`;
      const billNumber = `INV/${period.year}${String(period.month).padStart(2, "0")}/${fam.rt.number}/${fam.kkNumber.slice(-4)}`;

      await prisma.wasteBill.create({
        data: {
          id: billId,
          billNumber,
          familyId: fam.id,
          payerId: fam.headId,
          rtId: fam.rtId,
          periodMonth: period.month,
          periodYear: period.year,
          amount,
          dueDate: period.due,
          status,
          paidAmount: lunas ? amount : menunggu ? amount : 0,
          paidAt,
          paidById: lunas ? pick(["user-operator", "user-bendahara", `user-rt${fam.rt.number}`]) : null,
          method,
          receiptNo: lunas ? `KW/${period.year}${String(period.month).padStart(2, "0")}/${String(++paymentIndex).padStart(4, "0")}` : null,
          notes: isDibebaskan ? "Dibebaskan (keluarga kurang mampu)" : null,
          lastReminderAt: status === "BELUM_BAYAR" && chance(0.7) ? new Date(period.due.getTime() + int(1, 8) * 86400000) : null,
          lastReminderKey: status === "BELUM_BAYAR" ? pick(["0", "3", "7"]) : null,
          reminderCount: status === "BELUM_BAYAR" ? int(1, 4) : int(0, 2),
          createdAt: new Date(period.due.getFullYear(), period.due.getMonth(), 1, 8, 0),
        },
      });

      if (lunas) {
        await prisma.payment.create({
          data: {
            billId,
            amount,
            method: method ?? undefined,
            paidAt: paidAt!,
            receivedBy: pick(["user-operator", "user-bendahara", `user-rt${fam.rt.number}`]),
            receiptNo: `KW/${period.year}${String(period.month).padStart(2, "0")}/${String(paymentIndex).padStart(4, "0")}`,
            note: chance(0.3) ? "Dibayar melalui ketua RT" : null,
          },
        });
      }
    }
  }

  /* ── Surat pengantar ───────────────────────────────────── */
  const adultResidents = await prisma.resident.findMany({
    where: { status: "AKTIF" },
    take: 60,
    orderBy: { id: "asc" },
  });
  for (let i = 0; i < 26; i++) {
    const r = pick(adultResidents);
    const t = pick(LETTER_TYPES);
    const dayOffset = -int(0, 45);
    const status: LetterStatus = chance(0.6) ? "SELESAI" : chance(0.5) ? "DIPROSES" : chance(0.6) ? "DIAJUKAN" : "DITOLAK";
    await prisma.letter.create({
      data: {
        number: `470/${String(i + 1).padStart(3, "0")}/RW05/${now.getFullYear()}`,
        residentId: r.id,
        rtId: r.rtId,
        type: t.type,
        purpose: t.purpose,
        status,
        processedById: status === "DIAJUKAN" ? null : pick(["user-operator", "user-admin", `user-rt${r.rtId.slice(-2)}`]),
        finishedAt: status === "SELESAI" ? d(dayOffset + 1, 19, 30) : null,
        notes: status === "DITOLAK" ? "Data tidak lengkap, mohon melengkapi berkas persyaratan" : status === "SELESAI" ? "Surat telah diambil yang bersangkutan" : null,
        notifyReadyAt: status === "SELESAI" ? d(dayOffset + 1, 19, 35) : null,
        createdAt: d(dayOffset, int(8, 20)),
      },
    });
  }

  /* ── Pengumuman ────────────────────────────────────────── */
  for (let i = 0; i < ANNOUNCEMENTS.length; i++) {
    const a = ANNOUNCEMENTS[i];
    await prisma.announcement.create({
      data: {
        title: a.title,
        body: a.body,
        category: a.category,
        pinned: a.pinned,
        published: true,
        publishedAt: d(a.day, 9, 0),
        authorId: pick(["user-admin", "user-operator"]),
        broadcastAt: chance(0.7) ? d(a.day, 9, 5) : null,
        broadcastCount: chance(0.7) ? int(20, 140) : 0,
        createdAt: d(a.day, 8, 30),
      },
    });
  }

  /* ── Log WhatsApp ──────────────────────────────────────── */
  const bills = await prisma.wasteBill.findMany({
    where: { status: { in: ["BELUM_BAYAR", "LUNAS"] } },
    include: { family: { include: { head: true, rt: true } } },
    take: 90,
    orderBy: [{ dueDate: "desc" }, { id: "asc" }],
  });

  for (const bill of bills) {
    const person = bill.family.head;
    if (!person) continue;
    const phone = person.whatsapp ?? person.phone;
    if (!phone) continue;
    const periode = `${monthName(bill.periodMonth)} ${bill.periodYear}`;

    if (bill.status === "LUNAS" && chance(0.75)) {
      const tpl = TEMPLATES.find((t) => t.key === "PAYMENT_RECEIPT")!;
      waMessages.push({
        toPhone: phone,
        toName: person.name,
        body: tpl.body
          .replace(/\{\{nama\}\}/g, person.name)
          .replace(/\{\{nama_rw\}\}/g, `RW ${profile.rwNumber}`)
          .replace(/\{\{periode\}\}/g, periode)
          .replace(/\{\{jumlah\}\}/g, `Rp ${bill.amount.toLocaleString("id-ID")}`)
          .replace(/\{\{no_kwitansi\}\}/g, bill.receiptNo ?? "-")
          .replace(/\{\{tanggal_bayar\}\}/g, bill.paidAt ? bill.paidAt.toLocaleDateString("id-ID", { dateStyle: "long" }) : "-")
          .replace(/\{\{metode\}\}/g, bill.method ?? "TUNAI"),
        category: "BUKTI_BAYAR",
        templateKey: `RECEIPT_${bill.id}`,
        status: chance(0.98) ? "TERKIRIM_SIMULASI" : "GAGAL",
        provider: "fonnte",
        attempts: 1,
        sentAt: bill.paidAt ?? d(-int(1, 40)),
        relatedType: "WasteBill",
        relatedId: bill.id,
        error: chance(0.02) ? "Nomor tidak terdaftar di WhatsApp" : null,
        createdAt: bill.paidAt ?? d(-int(1, 40)),
      });
    } else if (bill.status === "BELUM_BAYAR") {
      const offsets = [-3, 0, 3, 7].filter(() => chance(0.65));
      for (const off of offsets) {
        const tpl = TEMPLATES.find((t) => t.key === (off < 0 ? "TRASH_PRE" : off === 0 ? "TRASH_DUE" : off === 3 ? "TRASH_LATE_3" : "TRASH_LATE_7"))!;
        const sentDate = new Date(bill.dueDate.getTime() + off * 86400000 + 8 * 3600000);
        if (sentDate > now) continue;
        const failed = chance(0.06);
        waMessages.push({
          toPhone: phone,
          toName: person.name,
          body: tpl.body
            .replace(/\{\{nama\}\}/g, person.name)
            .replace(/\{\{nama_rw\}\}/g, `RW ${profile.rwNumber}`)
            .replace(/\{\{kelurahan\}\}/g, profile.village)
            .replace(/\{\{periode\}\}/g, periode)
            .replace(/\{\{jumlah\}\}/g, `Rp ${bill.amount.toLocaleString("id-ID")}`)
            .replace(/\{\{jatuh_tempo\}\}/g, bill.dueDate.toLocaleDateString("id-ID", { dateStyle: "long" }))
            .replace(/\{\{hari_lagi\}\}/g, String(Math.abs(off)))
            .replace(/\{\{hari_terlambat\}\}/g, String(off)),
          category: "PENGINGAT_SAMPAH",
          templateKey: `TRASH_${bill.id}_${off}`,
          status: failed ? "GAGAL" : "TERKIRIM_SIMULASI",
          provider: "fonnte",
          attempts: failed ? 2 : 1,
          sentAt: failed ? null : sentDate,
          scheduledAt: sentDate,
          relatedType: "WasteBill",
          relatedId: bill.id,
          error: failed ? "Perangkat gateway tidak merespons (timeout)" : null,
          createdAt: sentDate,
        });
      }
    }
  }

  // pengingat kegiatan
  for (const act of activities) {
    if (act.startsAt > now) continue;
    const tpl = TEMPLATES.find((t) => t.key === "ACTIVITY_REMINDER")!;
    const pool = residents.filter((r) => !act.rtId || r.rtId === act.rtId).slice(0, int(6, 12));
    for (const r of pool) {
      const phone = r.phone;
      if (!phone || !chance(0.5)) continue;
      const sentDate = new Date(act.startsAt.getTime() - 12 * 3600000);
      waMessages.push({
        toPhone: phone,
        toName: r.name,
        body: tpl.body
          .replace(/\{\{nama\}\}/g, r.name)
          .replace(/\{\{nama_rw\}\}/g, `RW ${profile.rwNumber}`)
          .replace(/\{\{kegiatan\}\}/g, act.title)
          .replace(/\{\{tanggal\}\}/g, act.startsAt.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }))
          .replace(/\{\{jam\}\}/g, "06.00 - 09.00")
          .replace(/\{\{lokasi\}\}/g, "Balai RW 05")
          .replace(/\{\{penanggung_jawab\}\}/g, "H. Surya Wijaya"),
        category: "JADWAL_KEGIATAN",
        templateKey: `ACTIVITY_${act.id}`,
        status: chance(0.97) ? "TERKIRIM_SIMULASI" : "GAGAL",
        provider: "fonnte",
        attempts: 1,
        sentAt: sentDate,
        relatedType: "Activity",
        relatedId: act.id,
        error: chance(0.03) ? "Nomor WhatsApp tidak valid" : null,
        createdAt: sentDate,
      });
    }
  }

  // siaran pengumuman
  const announcements = await prisma.announcement.findMany({
    where: { broadcastAt: { not: null } },
    orderBy: { id: "asc" },
  });
  for (const a of announcements) {
    const tpl = TEMPLATES.find((t) => t.key === "ANNOUNCEMENT")!;
    const pool = residents.slice(0, int(15, 40));
    for (const r of pool) {
      if (!r.phone) continue;
      waMessages.push({
        toPhone: r.phone,
        toName: r.name,
        body: tpl.body.replace(/\{\{judul\}\}/g, a.title).replace(/\{\{pesan\}\}/g, a.body.slice(0, 200)).replace(/\{\{nama_rw\}\}/g, "RW 05"),
        category: "PENGUMUMAN",
        templateKey: `ANN_${a.id}`,
        status: chance(0.96) ? "TERKIRIM_SIMULASI" : "GAGAL",
        provider: "fonnte",
        attempts: 1,
        sentAt: a.broadcastAt,
        relatedType: "Announcement",
        relatedId: a.id,
        error: chance(0.04) ? "Nomor diblokir oleh WhatsApp" : null,
        createdAt: a.broadcastAt ?? a.publishedAt,
      });
    }
  }

  waMessages.sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
  await prisma.waMessage.createMany({ data: waMessages });

  /* ── Log aktivitas ─────────────────────────────────────── */
  const logs: { action: string; entity: string; description: string; user: string; userId: string | null; day: number }[] = [
    { action: "LOGIN", entity: "Pengguna", description: "H. Surya Wijaya masuk ke sistem", user: "H. Surya Wijaya", userId: "user-admin", day: 0 },
    { action: "SEND", entity: "WhatsApp", description: `${waMessages.filter((m) => m.category === "PENGINGAT_SAMPAH").length} pengingat iuran kebersihan dikirim ke warga`, user: "Sistem", userId: null, day: 0 },
    { action: "CREATE", entity: "Kegiatan", description: "Kegiatan \"Kerja Bakti Akbar Bulanan\" dibuat", user: "Nia Kurniasih, S.AP", userId: "user-operator", day: -1 },
    { action: "PAY", entity: "Tagihan", description: "Pembayaran iuran 12 KK diterima dan dikonfirmasi", user: "Deddy Kurniawan", userId: "user-bendahara", day: -1 },
    { action: "UPDATE", entity: "Warga", description: "Data kependudukan RT 02 diperbarui", user: "Tatang Koswara", userId: "user-rt02", day: -1 },
    { action: "CREATE", entity: "Pengumuman", description: "Pengumuman \"Waspada Kasus DBD\" dipublikasikan", user: "H. Surya Wijaya", userId: "user-admin", day: -1 },
    { action: "UPDATE", entity: "Surat", description: "Surat pengantar SKCK selesai diproses", user: "Nia Kurniasih, S.AP", userId: "user-operator", day: -2 },
    { action: "SEND", entity: "WhatsApp", description: "Pengingat jadwal ronda dikirim ke 6 petugas", user: "Sistem", userId: null, day: -2 },
    { action: "CREATE", entity: "Tagihan", description: "Tagihan iuran periode berjalan dibuat untuk seluruh KK", user: "Sistem", userId: null, day: -3 },
    { action: "UPDATE", entity: "Kegiatan", description: "Kegiatan \"Kerja Bakti Bersih Selokan\" ditandai selesai", user: "Cecep Nugraha", userId: "user-rt03", day: -3 },
    { action: "CREATE", entity: "Warga", description: "3 warga baru didaftarkan di RT 04", user: "Jajang Sudrajat", userId: "user-rt04", day: -4 },
    { action: "PAY", entity: "Tagihan", description: "Iuran bulan lalu lunas untuk 38 KK", user: "Deddy Kurniawan", userId: "user-bendahara", day: -5 },
    { action: "SEND", entity: "WhatsApp", description: "Siarkan pengumuman ke seluruh warga", user: "H. Surya Wijaya", userId: "user-admin", day: -6 },
    { action: "DELETE", entity: "Kegiatan", description: "Kegiatan \"Arisan RW\" dibatalkan", user: "H. Surya Wijaya", userId: "user-admin", day: -8 },
  ];
  for (const l of logs) {
    await prisma.auditLog.create({
      data: {
        userId: l.userId,
        userName: l.user,
        action: l.action,
        entity: l.entity,
        description: l.description,
        createdAt: d(l.day, int(7, 21), int(0, 59)),
      },
    });
  }

  /* ── Ringkasan ─────────────────────────────────────────── */
  const [fam, warga, keg, tag, msg, tpl] = await Promise.all([
    prisma.family.count(),
    prisma.resident.count(),
    prisma.activity.count(),
    prisma.wasteBill.count(),
    prisma.waMessage.count(),
    prisma.messageTemplate.count(),
  ]);
  console.log(`✅ Selesai — ${rts.length} RT, ${fam} KK, ${warga} warga, ${keg} kegiatan, ${tag} tagihan, ${msg} log WhatsApp, ${tpl} template.`);
  console.log(`🔑 Login: admin@sipandu.rw / sipandu123  (operator, bendahara, rt01-rt05, warga)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
