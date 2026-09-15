# SIPANDU RW — Sistem Pelayanan & Pengingat Warga RW

Aplikasi manajemen RT/RW full-stack: data kependudukan, jadwal kegiatan (kerja bakti & ronda),
iuran kebersihan, surat pengantar, pengumuman, **dan pengingat otomatis yang dikirim ke WhatsApp warga**.


---

## ✨ Fitur utama

### Portal publik (`/`)
- Beranda informasi RW: statistik warga, pengumuman, jadwal kegiatan, layanan.
- **Cek tagihan iuran** hanya dengan NIK atau No. KK (tanpa login, nomor telepon disamarkan).
- Tombol **Portal Warga** untuk masuk ke area pribadi.

### Portal Warga (`/warga`) — khusus akun berperan `WARGA`
Warga yang masuk **otomatis diarahkan ke sini** (bukan dashboard pengurus) dan hanya melihat
datanya sendiri:
- **Ringkasan** — sapaan, identitas (NIK, RT, No. KK, alamat), kartu tunggakan / total bayar /
  kegiatan mendatang, tugas kegiatan yang ditugaskan kepadanya, anggota KK, kegiatan terdekat,
  dan pengumuman terbaru.
- **Tagihan** — riwayat iuran per periode dengan status & jatuh tempo, peringatan tunggakan,
  tautan **kwitansi**, dan panduan cara membayar (tunai / transfer / QRIS).
- **Kegiatan** — jadwal RW & RT-nya, ditandai bila ia termasuk petugas.
- **Pengumuman** — seluruh pengumuman yang dipublikasikan.
- Navigasi tab ramah ponsel, mode gelap, dan tombol keluar di pojok kanan atas.

### Kwitansi pembayaran (`/kwitansi/[id]`)
- Halaman cetak siap print/PDF (kop RW, data penyetor, detail pembayaran, nominal + **terbilang**,
  kolom tanda tangan penyetor & petugas).
- Tombol **Cetak / Simpan PDF** dan **Tutup**; `@page` A4 dan warna cetak presisi.
- Dapat diakses pengurus (semua tagihan) maupun warga (hanya KK-nya sendiri — selain itu 404).

### Cetak surat pengantar (`/surat/[id]/cetak`)
- Dokumen siap print/PDF: kop RW, nomor surat, judul sesuai jenis (domisili, SKCK, KTP, KK,
  usaha, tidak mampu), identitas pemohon lengkap, keperluan, lalu kolom tanda tangan
  **Ketua RT** dan **Ketua RW**.
- Bila status belum `SELESAI`, halaman menampilkan peringatan bahwa dokumen hanya pratinjau.
- Ketua RT hanya dapat mencetak surat wilayahnya sendiri.

### Ekspor CSV
- **Data Warga** → `GET /api/residents/export` (mengikuti filter pencarian, RT, status).
- **Rekap Iuran** → `GET /api/bills/export` (mengikuti filter status, RT, bulan, tahun).
- Berkas ber-UTF-8 BOM & dipisah `;` sehingga langsung rapi di Excel; setiap ekspor tercatat
  pada log aktivitas.

### Dashboard pengurus (`/dashboard`)
- **Dashboard** — KPI, grafik penerimaan iuran 6 bulan (recharts), kegiatan mendatang,
  tunggakan teratas, kepatuhan per RT, ringkasan WhatsApp, log aktivitas.
- **Data Warga** — CRUD warga lengkap dengan NIK, KK, RT, kontak WhatsApp, filter & pencarian.
- **Kartu Keluarga** — CRUD KK, daftar anggota, riwayat iuran, status ekonomi.
- **Wilayah RT** — CRUD wilayah + penunjukan ketua RT, sebaran warga & kepatuhan iuran per RT.
- **Kegiatan & Jadwal** — CRUD kegiatan, penugasan petugas, absensi (Hadir/Izin/Alpha),
  pengingat otomatis sebelum kegiatan.
- **Iuran Sampah** — generate tagihan massal, pembayaran (tunai/transfer/QRIS), kwitansi,
  riwayat pembayaran, pembatalan setoran, dan pengingat tunggakan.
- **Surat Pengantar** — alur DIAJUKAN → DIPROSES → SELESAI/DITOLAK + notifikasi WhatsApp.
- **Pengumuman** — CRUD, sematkan/publikasikan, **siaran sekali klik ke WhatsApp warga**.
- **WhatsApp Center** — log pesan, statistik pengiriman, kirim ulang yang gagal,
  composer pesan massal, editor template, pengaturan gateway & aturan pengingat.
- **Pengguna** — manajemen akun + peran (Admin, Operator, Ketua RT, Warga).
- **Pengaturan** — profil RW, aturan pengingat, ganti kata sandi, info penjadwal.

### Pengingat WhatsApp otomatis
| Siklus | Kapan | Isi |
|---|---|---|
| H-3 | 3 hari sebelum jatuh tempo | Pemberitahuan tagihan akan jatuh tempo |
| H | Hari jatuh tempo | Pengingat pembayaran |
| H+3 | 3 hari lewat | Tunggakan, minta konfirmasi |
| H+7 | 7 hari lewat | Tunggakan lanjutan |

Pengingat kegiatan dikirim **H-12 jam** ke seluruh petugas yang ditugaskan.
Pengingat kegiatan yang sudah terkirim dapat **dijadwalkan ulang** dari menu aksi kegiatan
(`POST /api/activities/[id]/reminder`) bila jadwal berubah.
Bukti pembayaran & notifikasi surat selesai juga dikirim otomatis.

---

## 🧱 Teknologi yang Digunakan

- **Next.js 15** (App Router, TypeScript, React 19) — UI & API dalam satu aplikasi
- **PostgreSQL 17 + Prisma 6** — penyimpanan persisten
- **Tailwind CSS v4** — desain sistem (light/dark, responsif)
- **SWR** — data fetching dengan **optimistic updates**
- **Recharts** — grafik dashboard
- **jose + bcryptjs** — sesi JWT (httpOnly cookie) & hashing sandi
- **Zod** — validasi seluruh endpoint
- **Sonner** — notifikasi toast
- **Fonnte** (utama), Wablas / Meta Cloud API (opsional) — gateway WhatsApp

---

## 🚀 Cara Menjalankan

```bash
# 1. Dependensi
npm install

# 2. Konfigurasi environment
cp .env.example .env     # lalu sesuaikan DATABASE_URL, AUTH_SECRET, FONNTE_TOKEN

# 3. Siapkan basis data + data demo
npm run setup            # prisma migrate deploy + seed

# 4. Jalankan
npm run dev              # http://localhost:3000
```

**Atau satu perintah** (install → database → migrasi → seed → build → start):

```bash
bash scripts/bootstrap.sh      # SKIP_SEED=1 untuk melewati seeding
```

### Akun demo (sandi: `sipandu123`)

| Email | Peran |
|---|---|
| `admin@sipandu.rw` | Administrator RW |
| `sekretaris@sipandu.rw` | Operator / Sekretaris |
| `bendahara@sipandu.rw` | Operator / Bendahara |
| `rt01@sipandu.rw` … `rt05@sipandu.rw` | Ketua RT 01–05 |
| `warga@sipandu.rw` | Warga — masuk ke **Portal Warga** `/warga` |

---

## 📱 Konfigurasi WhatsApp (Fonnte)

1. Daftar di [fonnte.com](https://fonnte.com) dan hubungkan perangkat WhatsApp.
2. Salin **token API**, lalu isi salah satu dari:
   - `.env` → `FONNTE_TOKEN=xxxxx`, atau
   - menu **WhatsApp → Pengaturan** (disimpan di basis data).
3. Aktifkan **“Aktifkan pengiriman nyata”** pada halaman pengaturan.

Selama token kosong, aplikasi berjalan dalam **mode simulasi**:
seluruh pesan tetap diproses, dicatat pada log, dan ditandai `TERKIRIM (simulasi)` —
tidak ada pesan sungguhan yang dikirim dan tidak ada biaya.

Penyedia lain (Wablas / Meta Cloud API) dapat dipilih pada dropdown **Penyedia**.

### Penjadwal
- **Internal**: `src/instrumentation.ts` menjalankan penjadwal tiap 30 menit bersama server
  (atur lewat `SCHEDULER_INTERVAL_MINUTES`).
- **Eksternal (disarankan untuk produksi)**:
  ```bash
  curl -X POST "https://domain-anda/api/cron/reminders?secret=$CRON_SECRET"
  ```
- **Manual**: tombol *Jalankan Penjadwal* pada dashboard, WhatsApp Center, atau halaman Iuran.

---

## 🗂️ Struktur Folder

```
SIPANDU/
│
├── prisma/
│   ├── schema.prisma       # Struktur database
│   └── seed.ts             # Data demo
│
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   └── dashboard/  # Dashboard pengurus
│   │   │
│   │   ├── (warga)/
│   │   │   └── warga/      # Portal warga
│   │   │
│   │   ├── api/            # REST API aplikasi
│   │   │
│   │   ├── kwitansi/       # Cetak kwitansi
│   │   ├── surat/          # Cetak surat
│   │   ├── login/          # Halaman login
│   │   ├── layout.tsx      # Layout utama
│   │   └── page.tsx        # Landing page
│   │
│   ├── components/         # Komponen UI
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility, database, auth, WhatsApp
│   └── instrumentation.ts  # Scheduler
│
├── scripts/                # Script bantuan
├── public/                 # Asset publik
│
├── .env                    # Environment lokal
├── .env.example            # Template environment
├── .gitignore              # File yang diabaikan Git
├── package.json            # Dependency & command
├── next.config.ts          # Konfigurasi Next.js
├── tsconfig.json           # Konfigurasi TypeScript
└── README.md               # Dokumentasi project
```

---

## 🔐 Peran & hak akses

| Peran | Ruang lingkup |
|---|---|
| `ADMIN` | Semua data + pengguna + pengaturan + gateway |
| `OPERATOR` | Operasional RW (warga, KK, kegiatan, iuran, surat, pengumuman, WA) |
| `KETUA_RT` | Sama seperti operator, **terbatas pada RT-nya sendiri** |
| `WARGA` | Portal Warga `/warga` — hanya data pribadinya & KK-nya |

---

Dibangun sebagai aplikasi manajemen RT/RW — data seluruhnya hanya contoh (fiktif).