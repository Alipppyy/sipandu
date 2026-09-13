import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, rtScope } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { toCsv, csvResponse } from "@/lib/csv";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const session = await requireUser();
    const sp = new URL(req.url).searchParams;
    const q = sp.get("q")?.trim() ?? "";
    const rtId = sp.get("rtId") ?? "";
    const status = sp.get("status") ?? "";
    const gender = sp.get("gender") ?? "";

    const scope = rtScope(session);
    const where: Prisma.ResidentWhereInput = {
      ...scope,
      ...(rtId ? { rtId } : {}),
      ...(status ? { status: status as Prisma.EnumResidentStatusFilter } : {}),
      ...(gender ? { gender: gender as Prisma.EnumGenderFilter } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { nik: { contains: q } },
              { occupation: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const data = await prisma.resident.findMany({
      where,
      orderBy: [{ rt: { number: "asc" } }, { name: "asc" }],
      take: 5000,
      include: {
        rt: { select: { number: true, areaName: true } },
        family: { select: { kkNumber: true, headName: true, address: true } },
      },
    });

    if (!data.length) return fail("Tidak ada data untuk diekspor", 404);

    const rows = data.map((r) => ({
      nik: r.nik,
      nama: r.name,
      jk: r.gender === "LAKI_LAKI" ? "L" : "P",
      tempat_lahir: r.birthPlace,
      tanggal_lahir: r.birthDate.toISOString().slice(0, 10),
      usia: Math.floor((Date.now() - r.birthDate.getTime()) / 31557600000),
      agama: r.religion,
      pendidikan: r.education,
      pekerjaan: r.occupation,
      status_kawin: r.maritalStatus,
      rt: r.rt.number,
      wilayah: r.rt.areaName,
      no_kk: r.family?.kkNumber ?? "",
      kepala_keluarga: r.family?.headName ?? "",
      alamat: r.family?.address ?? "",
      hubungan: r.familyRole,
      hp: r.phone ?? "",
      whatsapp: r.whatsapp ?? "",
      status: r.status,
    }));

    const csv = toCsv(rows, [
      { key: "nik", label: "NIK" },
      { key: "nama", label: "Nama" },
      { key: "jk", label: "L/P" },
      { key: "tempat_lahir", label: "Tempat Lahir" },
      { key: "tanggal_lahir", label: "Tanggal Lahir" },
      { key: "usia", label: "Usia" },
      { key: "agama", label: "Agama" },
      { key: "pendidikan", label: "Pendidikan" },
      { key: "pekerjaan", label: "Pekerjaan" },
      { key: "status_kawin", label: "Status Kawin" },
      { key: "rt", label: "RT" },
      { key: "wilayah", label: "Wilayah" },
      { key: "no_kk", label: "No. KK" },
      { key: "kepala_keluarga", label: "Kepala Keluarga" },
      { key: "alamat", label: "Alamat" },
      { key: "hubungan", label: "Hubungan" },
      { key: "hp", label: "No. HP" },
      { key: "whatsapp", label: "WhatsApp" },
      { key: "status", label: "Status" },
    ]);

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "EXPORT",
      entity: "Warga",
      description: `${session.name} mengekspor ${data.length} data warga ke CSV`,
    });

    const stamp = new Date().toISOString().slice(0, 10);
    return csvResponse(csv, `data-warga-${stamp}.csv`);
  });
}
