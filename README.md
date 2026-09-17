# SIPANDU

### Sistem Pelayanan & Pengingat Warga RW

Aplikasi manajemen RT/RW untuk mengelola data warga,
administrasi, iuran, kegiatan, surat, pengumuman,
dan notifikasi WhatsApp dalam satu sistem.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](...)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](...)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?logo=postgresql)](...)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](...)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)](...)

---

## ✨ Fitur

### 🌐 Portal Publik

- Informasi RW
- Statistik warga
- Pengumuman
- Jadwal kegiatan
- Informasi layanan
- Cek tagihan menggunakan NIK atau No. KK
- Nomor telepon ditampilkan secara tersamarkan
- Akses menuju Portal Warga

### 👤 Portal Warga

Khusus pengguna dengan role `WARGA`.

- Ringkasan data pribadi
- Informasi NIK, KK, RT, dan alamat
- Status dan riwayat iuran
- Informasi tunggakan
- Kwitansi pembayaran
- Jadwal kegiatan
- Tugas kegiatan
- Anggota KK
- Pengumuman
- Navigasi mobile
- Dark mode

### 📊 Dashboard Pengurus

- Dashboard statistik dan KPI
- Grafik penerimaan iuran
- Data Warga
- Kartu Keluarga
- Wilayah RT
- Kegiatan & Jadwal
- Absensi kegiatan
- Iuran Sampah
- Surat Pengantar
- Pengumuman
- WhatsApp Center
- Manajemen Pengguna
- Pengaturan RW

### 💰 Iuran

- Generate tagihan massal
- Pembayaran tunai
- Pembayaran transfer
- Pembayaran QRIS
- Riwayat pembayaran
- Kwitansi
- Pembatalan setoran
- Pengingat tunggakan
- Export rekap iuran ke CSV

### 📄 Surat Pengantar

Mendukung alur:

`DIAJUKAN → DIPROSES → SELESAI / DITOLAK`

Jenis surat meliputi:

- Surat Domisili
- SKCK
- KTP
- KK
- Surat Usaha
- Surat Tidak Mampu

Surat yang selesai dapat dicetak dalam format siap print/PDF.

### 📢 Pengumuman

- Membuat pengumuman
- Edit dan hapus pengumuman
- Sematkan pengumuman
- Publikasikan pengumuman
- Broadcast pengumuman melalui WhatsApp

### 📱 WhatsApp Center

- Log pesan
- Statistik pengiriman
- Kirim ulang pesan gagal
- Composer pesan massal
- Template pesan
- Pengaturan gateway
- Aturan pengingat otomatis
- Dukungan Fonnte
- Dukungan Wablas
- Dukungan Meta Cloud API

### 🔔 Pengingat Otomatis

SIPANDU mendukung beberapa siklus pengingat iuran:

| Waktu | Pengingat |
|---|---|
| H-3 | Tagihan akan jatuh tempo |
| H | Hari jatuh tempo |
| H+3 | Pengingat tunggakan |
| H+7 | Pengingat tunggakan lanjutan |

Pengingat kegiatan dikirim **H-12 jam** kepada petugas yang ditugaskan.

---

## 🧱 Tech Stack

| Teknologi | Penggunaan |
|---|---|
| Next.js 15 | Framework aplikasi |
| React 19 | UI |
| TypeScript | Bahasa pemrograman |
| PostgreSQL 17 | Database |
| Prisma 6 | ORM |
| Tailwind CSS v4 | Styling |
| SWR | Data fetching |
| Recharts | Grafik |
| Zod | Validasi |
| jose | Session JWT |
| bcryptjs | Password hashing |
| Sonner | Toast notification |
| Fonnte | WhatsApp Gateway |

---

## 📁 Struktur Project

```text
SIPANDU/
│
├── prisma/
│   ├── schema.prisma          # Schema database
│   └── seed.ts                # Data demo
│
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   └── dashboard/     # Dashboard pengurus
│   │   │
│   │   ├── (warga)/
│   │   │   └── warga/         # Portal warga
│   │   │
│   │   ├── api/               # REST API
│   │   │
│   │   ├── kwitansi/
│   │   │   └── [id]/          # Cetak kwitansi
│   │   │
│   │   ├── surat/
│   │   │   └── [id]/
│   │   │       └── cetak/     # Cetak surat
│   │   │
│   │   ├── login/             # Halaman login
│   │   ├── layout.tsx         # Layout utama
│   │   └── page.tsx           # Landing page
│   │
│   ├── components/
│   │   ├── ui/                # Komponen UI
│   │   ├── layout/            # Layout components
│   │   ├── dashboard/         # Dashboard components
│   │   └── forms/             # Form components
│   │
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Database, auth, API, WhatsApp, dll.
│   └── instrumentation.ts     # Scheduler
│
├── scripts/
│   ├── bootstrap.sh            # Setup aplikasi
│   ├── start-db.sh             # Start database
│   └── demo-reset.sh           # Reset data demo
│
├── public/                    # Asset publik
│
├── .env.example               # Template environment
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies & scripts
├── next.config.ts             # Next.js config
├── tsconfig.json              # TypeScript config
└── README.md                  # Dokumentasi
```

> File `.env` digunakan untuk konfigurasi lokal dan tidak disimpan di repository.

---

## 👥 Role & Permission

| Role | Akses |
|---|---|
| `ADMIN` | Seluruh data, pengguna, pengaturan, dan gateway |
| `OPERATOR` | Operasional RW |
| `KETUA_RT` | Operasional yang terbatas pada RT sendiri |
| `WARGA` | Hanya data pribadi dan data KK melalui Portal Warga |

---

## 🚀 Installation

### 1. Clone repository

```bash
git clone https://github.com/Alipppyy/sipandu.git
cd sipandu
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment

Copy file `.env.example` menjadi `.env`.

```bash
cp .env.example .env
```

Kemudian sesuaikan konfigurasi:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/sipandu"
AUTH_SECRET="your-secret"
FONNTE_TOKEN=""
CRON_SECRET="your-cron-secret"
SCHEDULER_INTERVAL_MINUTES=30
```

> Jangan commit file `.env` ke repository.

### 4. Setup database

Pastikan PostgreSQL sudah berjalan, kemudian jalankan:

```bash
npm run setup
```

Command ini menjalankan migration dan seed data demo.

### 5. Jalankan aplikasi

```bash
npm run dev
```

Buka:

```text
http://localhost:3000
```

---

## 📱 WhatsApp dengan Fonnte

SIPANDU menggunakan Fonnte sebagai gateway WhatsApp utama.

### Konfigurasi

1. Hubungkan perangkat WhatsApp ke Fonnte.
2. Ambil Device Token.
3. Masukkan token ke `.env`:

```env
FONNTE_TOKEN="your-device-token"
```

4. Jalankan aplikasi.
5. Buka:

```text
Dashboard → WhatsApp → Pengaturan
```

6. Aktifkan pengiriman nyata jika ingin mengirim pesan WhatsApp sebenarnya.

Jika token kosong, SIPANDU tetap dapat menjalankan proses WhatsApp dalam mode simulasi sehingga pesan tidak dikirim ke nomor sebenarnya.

---

## ⏰ Scheduler

SIPANDU memiliki tiga cara menjalankan scheduler.

### Internal

Scheduler berjalan bersama server melalui:

```text
src/instrumentation.ts
```

Interval dapat diatur melalui:

```env
SCHEDULER_INTERVAL_MINUTES=30
```

### External

Untuk deployment production:

```bash
curl -X POST "https://domain-anda/api/cron/reminders?secret=$CRON_SECRET"
```

### Manual

Scheduler juga dapat dijalankan melalui tombol:

```text
Dashboard
→ WhatsApp Center
→ Iuran
```

---

## 📤 Export Data

SIPANDU menyediakan export CSV untuk:

### Data Warga

```text
GET /api/residents/export
```

Mendukung filter pencarian, RT, dan status.

### Rekap Iuran

```text
GET /api/bills/export
```

Mendukung filter status, RT, bulan, dan tahun.

File CSV menggunakan UTF-8 BOM dan separator `;` sehingga dapat dibuka dengan baik di Excel.

---

## 🛠️ Scripts

| Command | Fungsi |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Menjalankan development server |
| `npm run setup` | Migration + seed database |
| `npm run build` | Build production |
| `npm run start` | Menjalankan production server |
| `npm run db:seed` | Seed database |
| `npm run db:reset` | Reset database |
| `npm run lint` | Menjalankan ESLint |

---

## 🗃️ Database

Database menggunakan:

```text
PostgreSQL 17
       │
       ▼
    Prisma 6
       │
       ▼
     SIPANDU
```

Schema database berada di:

```text
prisma/schema.prisma
```

Data demo tersedia melalui:

```text
prisma/seed.ts
```

> Data pada seed merupakan data contoh/fiktif dan tidak ditujukan untuk penggunaan data warga sebenarnya.

---

## 🔐 Security

Beberapa konfigurasi penting disimpan melalui environment variable:

- `DATABASE_URL`
- `AUTH_SECRET`
- `FONNTE_TOKEN`
- `CRON_SECRET`

Gunakan `.env.example` sebagai template konfigurasi.

---

## 📌 Project Status

SIPANDU saat ini berada dalam tahap pengembangan dan penyempurnaan fitur.

Fokus pengembangan meliputi:

- Penyempurnaan UI/UX
- Perbaikan bug
- Pengujian fitur
- Integrasi WhatsApp
- Penyempurnaan workflow administrasi RT/RW
- Optimasi performa dan responsivitas

---

## 📄 License

Project ini dibuat untuk kebutuhan pengembangan dan pembelajaran sistem manajemen RT/RW.

---

## 👨‍💻 Developer

**Alipppyy**
