-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR', 'KETUA_RT', 'WARGA');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- CreateEnum
CREATE TYPE "Religion" AS ENUM ('ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU');

-- CreateEnum
CREATE TYPE "Education" AS ENUM ('SD', 'SMP', 'SMA', 'DIPLOMA', 'SARJANA', 'PASCASARJANA');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('BELUM_KAWIN', 'KAWIN', 'CERAI_HIDUP', 'CERAI_MATI');

-- CreateEnum
CREATE TYPE "FamilyRole" AS ENUM ('KEPALA', 'ISTRI', 'ANAK', 'ORANG_TUA', 'FAMILI_LAIN');

-- CreateEnum
CREATE TYPE "ResidentStatus" AS ENUM ('AKTIF', 'PINDAH', 'MENINGGAL');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('KERJA_BAKTI', 'RONDA', 'RAPAT', 'PENGAJIAN', 'POSYANDU', 'LAINNYA');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('TERENCANA', 'BERLANGSUNG', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('BELUM_KONFIRM', 'HADIR', 'IZIN', 'ALPHA');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('BELUM_BAYAR', 'MENUNGGU_KONFIRMASI', 'LUNAS', 'DIBEBASKAN');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('TUNAI', 'TRANSFER', 'QRIS', 'LAINNYA');

-- CreateEnum
CREATE TYPE "AnnouncementCategory" AS ENUM ('PENTING', 'KEGIATAN', 'KEUANGAN', 'UMUM');

-- CreateEnum
CREATE TYPE "LetterType" AS ENUM ('DOMISILI', 'SKCK', 'PENGANTAR_KTP', 'PENGANTAR_KK', 'USAHA', 'TIDAK_MAMPU', 'KETERANGAN_LAIN');

-- CreateEnum
CREATE TYPE "LetterStatus" AS ENUM ('DIAJUKAN', 'DIPROSES', 'SELESAI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('DRAFT', 'ANTRIAN', 'TERKIRIM', 'TERKIRIM_SIMULASI', 'GAGAL');

-- CreateEnum
CREATE TYPE "MessageCategory" AS ENUM ('PENGINGAT_SAMPAH', 'JADWAL_KEGIATAN', 'PENGUMUMAN', 'BUKTI_BAYAR', 'SURAT_SELESAI', 'LAINNYA');

-- CreateTable
CREATE TABLE "RwProfile" (
    "id" TEXT NOT NULL,
    "rwNumber" TEXT NOT NULL DEFAULT '05',
    "village" TEXT NOT NULL DEFAULT 'Banjar',
    "district" TEXT NOT NULL DEFAULT 'Banjar',
    "city" TEXT NOT NULL DEFAULT 'Kota Banjar',
    "province" TEXT NOT NULL DEFAULT 'Jawa Barat',
    "postalCode" TEXT NOT NULL DEFAULT '46311',
    "address" TEXT NOT NULL DEFAULT 'Jl. Raya Banjar No. 12',
    "ketuaName" TEXT NOT NULL DEFAULT 'H. Surya Wijaya',
    "ketuaPhone" TEXT NOT NULL DEFAULT '6281234567890',
    "sekretarisName" TEXT NOT NULL DEFAULT 'Nia Kurniasih, S.AP',
    "bendaharaName" TEXT NOT NULL DEFAULT 'Deddy Kurniawan',
    "waProvider" TEXT NOT NULL DEFAULT 'fonnte',
    "waToken" TEXT,
    "waSender" TEXT,
    "waEnabled" BOOLEAN NOT NULL DEFAULT false,
    "waAutoSend" BOOLEAN NOT NULL DEFAULT true,
    "trashFeeAmount" INTEGER NOT NULL DEFAULT 25000,
    "trashDueDay" INTEGER NOT NULL DEFAULT 10,
    "reminderOffsets" TEXT NOT NULL DEFAULT '-3,0,3,7',
    "reminderHour" INTEGER NOT NULL DEFAULT 8,
    "activityReminder" BOOLEAN NOT NULL DEFAULT true,
    "activityLeadHours" INTEGER NOT NULL DEFAULT 12,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RwProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rt" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "rwNumber" TEXT NOT NULL DEFAULT '05',
    "areaName" TEXT NOT NULL,
    "ketuaUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'WARGA',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "avatarColor" TEXT NOT NULL DEFAULT 'emerald',
    "rtId" TEXT,
    "residentId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "kkNumber" TEXT NOT NULL,
    "headName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "block" TEXT,
    "houseNumber" TEXT,
    "rtId" TEXT NOT NULL,
    "headId" TEXT,
    "membersCount" INTEGER NOT NULL DEFAULT 0,
    "economicStatus" TEXT NOT NULL DEFAULT 'MENENGAH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resident" (
    "id" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'LAKI_LAKI',
    "birthPlace" TEXT NOT NULL DEFAULT 'Banjar',
    "birthDate" TIMESTAMP(3) NOT NULL,
    "religion" "Religion" NOT NULL DEFAULT 'ISLAM',
    "education" "Education" NOT NULL DEFAULT 'SMA',
    "occupation" TEXT NOT NULL DEFAULT 'Wiraswasta',
    "maritalStatus" "MaritalStatus" NOT NULL DEFAULT 'KAWIN',
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "familyId" TEXT,
    "familyRole" "FamilyRole" NOT NULL DEFAULT 'ANAK',
    "rtId" TEXT NOT NULL,
    "status" "ResidentStatus" NOT NULL DEFAULT 'AKTIF',
    "isVoter" BOOLEAN NOT NULL DEFAULT true,
    "bloodType" TEXT NOT NULL DEFAULT 'O',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL DEFAULT 'KERJA_BAKTI',
    "description" TEXT,
    "location" TEXT NOT NULL DEFAULT 'Balai RW',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "rtId" TEXT,
    "picName" TEXT NOT NULL DEFAULT 'Ketua RW',
    "picPhone" TEXT,
    "status" "ActivityStatus" NOT NULL DEFAULT 'TERENCANA',
    "reminderSentAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityAssignment" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Petugas',
    "status" "AttendanceStatus" NOT NULL DEFAULT 'BELUM_KONFIRM',
    "note" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteBill" (
    "id" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "payerId" TEXT,
    "rtId" TEXT NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 25000,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'BELUM_BAYAR',
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "paidById" TEXT,
    "method" "PaymentMethod",
    "receiptNo" TEXT,
    "notes" TEXT,
    "lastReminderAt" TIMESTAMP(3),
    "lastReminderKey" TEXT,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WasteBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'TUNAI',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedBy" TEXT,
    "receiptNo" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "AnnouncementCategory" NOT NULL DEFAULT 'UMUM',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT,
    "rtScope" TEXT,
    "broadcastAt" TIMESTAMP(3),
    "broadcastCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Letter" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "rtId" TEXT NOT NULL,
    "type" "LetterType" NOT NULL DEFAULT 'DOMISILI',
    "purpose" TEXT NOT NULL,
    "status" "LetterStatus" NOT NULL DEFAULT 'DIAJUKAN',
    "processedById" TEXT,
    "finishedAt" TIMESTAMP(3),
    "notes" TEXT,
    "notifyReadyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Letter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "MessageCategory" NOT NULL DEFAULT 'LAINNYA',
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaMessage" (
    "id" TEXT NOT NULL,
    "toPhone" TEXT NOT NULL,
    "toName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "MessageCategory" NOT NULL DEFAULT 'LAINNYA',
    "templateKey" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'DRAFT',
    "provider" TEXT,
    "providerId" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "relatedType" TEXT,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL DEFAULT 'Sistem',
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rt_ketuaUserId_key" ON "Rt"("ketuaUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Rt_number_rwNumber_key" ON "Rt"("number", "rwNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_residentId_key" ON "User"("residentId");

-- CreateIndex
CREATE UNIQUE INDEX "Family_kkNumber_key" ON "Family"("kkNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Family_headId_key" ON "Family"("headId");

-- CreateIndex
CREATE INDEX "Family_rtId_idx" ON "Family"("rtId");

-- CreateIndex
CREATE UNIQUE INDEX "Resident_nik_key" ON "Resident"("nik");

-- CreateIndex
CREATE INDEX "Resident_rtId_idx" ON "Resident"("rtId");

-- CreateIndex
CREATE INDEX "Resident_familyId_idx" ON "Resident"("familyId");

-- CreateIndex
CREATE INDEX "Resident_name_idx" ON "Resident"("name");

-- CreateIndex
CREATE INDEX "Activity_startsAt_idx" ON "Activity"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityAssignment_activityId_residentId_key" ON "ActivityAssignment"("activityId", "residentId");

-- CreateIndex
CREATE UNIQUE INDEX "WasteBill_billNumber_key" ON "WasteBill"("billNumber");

-- CreateIndex
CREATE INDEX "WasteBill_status_idx" ON "WasteBill"("status");

-- CreateIndex
CREATE INDEX "WasteBill_dueDate_idx" ON "WasteBill"("dueDate");

-- CreateIndex
CREATE INDEX "WasteBill_rtId_idx" ON "WasteBill"("rtId");

-- CreateIndex
CREATE UNIQUE INDEX "WasteBill_familyId_periodMonth_periodYear_key" ON "WasteBill"("familyId", "periodMonth", "periodYear");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNo_key" ON "Payment"("receiptNo");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");

-- CreateIndex
CREATE INDEX "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Letter_number_key" ON "Letter"("number");

-- CreateIndex
CREATE INDEX "Letter_status_idx" ON "Letter"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_key_key" ON "MessageTemplate"("key");

-- CreateIndex
CREATE INDEX "WaMessage_status_idx" ON "WaMessage"("status");

-- CreateIndex
CREATE INDEX "WaMessage_createdAt_idx" ON "WaMessage"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Rt" ADD CONSTRAINT "Rt_ketuaUserId_fkey" FOREIGN KEY ("ketuaUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_rtId_fkey" FOREIGN KEY ("rtId") REFERENCES "Rt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Family" ADD CONSTRAINT "Family_rtId_fkey" FOREIGN KEY ("rtId") REFERENCES "Rt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Family" ADD CONSTRAINT "Family_headId_fkey" FOREIGN KEY ("headId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_rtId_fkey" FOREIGN KEY ("rtId") REFERENCES "Rt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_rtId_fkey" FOREIGN KEY ("rtId") REFERENCES "Rt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityAssignment" ADD CONSTRAINT "ActivityAssignment_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityAssignment" ADD CONSTRAINT "ActivityAssignment_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteBill" ADD CONSTRAINT "WasteBill_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteBill" ADD CONSTRAINT "WasteBill_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteBill" ADD CONSTRAINT "WasteBill_rtId_fkey" FOREIGN KEY ("rtId") REFERENCES "Rt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteBill" ADD CONSTRAINT "WasteBill_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "WasteBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_rtId_fkey" FOREIGN KEY ("rtId") REFERENCES "Rt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
