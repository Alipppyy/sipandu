import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, rtScope } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { toCsv, csvResponse } from "@/lib/csv";
import { logActivity } from "@/lib/audit";
import { BULAN_LIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const session = await requireUser();
    const sp = new URL(req.url).searchParams;
    const q = sp.get("q")?.trim() ?? "";
    const status = sp.get("status") ?? "";
    const rtId = sp.get("rtId") ?? "";
    const month = sp.get("month") ?? "";
    const year = sp.get("year") ?? "";

    const scope = rtScope(session);
    const where: Prisma.WasteBillWhereInput = {
      ...(scope.rtId ? { rtId: scope.rtId } : {}),
      ...(rtId ? { rtId } : {}),
      ...(status ? { status: status as Prisma.EnumBillStatusFilter } : {}),
      ...(month ? { periodMonth: Number(month) } : {}),
      ...(year ? { periodYear: Number(year) } : {}),
      ...(q
        ? {
            OR: [
              { billNumber: { contains: q, mode: "insensitive" } },
              { family: { headName: { contains: q, mode: "insensitive" } } },
              { family: { kkNumber: { contains: q } } },
            ],
          }
        : {}),
    };

    const data = await prisma.wasteBill.findMany({
      where,
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      take: 10000,
      include: {
        family: { select: { kkNumber: true, headName: true, address: true } },
        payer: { select: { name: true, whatsapp: true, phone: true } },
        rt: { select: { number: true, areaName: true } },
      },
    });

    if (!data.length) return fail("Tidak ada data untuk diekspor", 404);

    const rows = data.map((b) => ({
      nomor_tagihan: b.billNumber,
      periode: `${BULAN_LIST[b.periodMonth - 1]} ${b.periodYear}`,
      bulan: b.periodMonth,
      tahun: b.periodYear,
      no_kk: b.family.kkNumber,
      kepala_keluarga: b.family.headName,
      penanggung_jawab: b.payer?.name ?? b.family.headName,
      whatsapp: b.payer?.whatsapp ?? b.payer?.phone ?? "",
      rt: b.rt.number,
      wilayah: b.rt.areaName,
      alamat: b.family.address,
      jumlah: b.amount,
      dibayar: b.paidAmount,
      status: b.status,
      jatuh_tempo: b.dueDate.toISOString().slice(0, 10),
      tanggal_bayar: b.paidAt ? b.paidAt.toISOString().slice(0, 10) : "",
      nomor_kwitansi: b.receiptNo ?? "",
      catatan: b.notes ?? "",
    }));

    const csv = toCsv(rows, [
      { key: "nomor_tagihan", label: "No. Tagihan" },
      { key: "periode", label: "Periode" },
      { key: "bulan", label: "Bulan" },
      { key: "tahun", label: "Tahun" },
      { key: "no_kk", label: "No. KK" },
      { key: "kepala_keluarga", label: "Kepala Keluarga" },
      { key: "penanggung_jawab", label: "Penanggung Jawab" },
      { key: "whatsapp", label: "WhatsApp" },
      { key: "rt", label: "RT" },
      { key: "wilayah", label: "Wilayah" },
      { key: "alamat", label: "Alamat" },
      { key: "jumlah", label: "Jumlah" },
      { key: "dibayar", label: "Dibayar" },
      { key: "status", label: "Status" },
      { key: "jatuh_tempo", label: "Jatuh Tempo" },
      { key: "tanggal_bayar", label: "Tanggal Bayar" },
      { key: "nomor_kwitansi", label: "No. Kwitansi" },
      { key: "catatan", label: "Catatan" },
    ]);

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "EXPORT",
      entity: "Iuran",
      description: `${session.name} mengekspor ${data.length} tagihan iuran ke CSV`,
    });

    const stamp = new Date().toISOString().slice(0, 10);
    return csvResponse(csv, `rekap-iuran-${stamp}.csv`);
  });
}
