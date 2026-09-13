import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handle, fail } from "@/lib/api";
import { maskPhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  keyword: z
    .string()
    .trim()
    .min(6, "Masukkan minimal 6 karakter NIK atau No. KK"),
});

/**
 * Pencarian tagihan publik — cukup dengan NIK warga atau nomor KK.
 * Data yang dikembalikan dibatasi (nomor telepon disamarkan).
 */
export async function POST(req: Request) {
  return handle(async () => {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

    const keyword = parsed.data.keyword.replace(/\D/g, "");

    const family =
      (await prisma.family.findFirst({
        where: { kkNumber: { contains: keyword } },
        include: { rt: { select: { number: true, areaName: true } }, head: true },
      })) ??
      (await prisma.resident.findFirst({
        where: { nik: { contains: keyword } },
        include: { family: true },
      }).then((r) =>
        r?.family
          ? prisma.family.findUnique({
              where: { id: r.family.id },
              include: { rt: { select: { number: true, areaName: true } }, head: true },
            })
          : null,
      ));

    if (!family) return fail("Data tidak ditemukan. Periksa kembali NIK atau No. KK Anda.", 404);

    const bills = await prisma.wasteBill.findMany({
      where: { familyId: family.id },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      take: 12,
    });

    return NextResponse.json({
      family: {
        kkNumber: family.kkNumber,
        headName: family.headName,
        address: family.address,
        rtNumber: family.rt.number,
        rtArea: family.rt.areaName,
        phone: maskPhone(family.head?.phone),
        membersCount: family.membersCount,
      },
      bills: bills.map((b) => ({
        id: b.id,
        billNumber: b.billNumber,
        period: new Date(b.periodYear, b.periodMonth - 1, 1).toLocaleString("id-ID", {
          month: "long",
          year: "numeric",
        }),
        amount: b.amount,
        dueDate: b.dueDate,
        status: b.status,
        paidAt: b.paidAt,
        receiptNo: b.receiptNo,
      })),
    });
  });
}
