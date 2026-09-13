import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, requireStaff, rtScope } from "@/lib/auth";
import { handle, getPagination, buildMeta, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  familyId: z.string().min(1, "KK wajib dipilih"),
  periodMonth: z.coerce.number().min(1).max(12),
  periodYear: z.coerce.number().min(2020).max(2100),
  amount: z.coerce.number().min(0, "Nominal tidak valid"),
  dueDate: z.coerce.date(),
  payerId: z.string().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export async function GET(req: Request) {
  return handle(async () => {
    const session = await requireUser();
    const sp = new URL(req.url).searchParams;
    const p = getPagination(sp, 12);
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

    const [total, data, summary] = await Promise.all([
      prisma.wasteBill.count({ where }),
      prisma.wasteBill.findMany({
        where,
        orderBy: [{ dueDate: "desc" }],
        skip: p.skip,
        take: p.take,
        include: {
          family: { select: { id: true, kkNumber: true, headName: true, address: true, economicStatus: true } },
          payer: { select: { id: true, name: true, phone: true, whatsapp: true } },
          rt: { select: { number: true, areaName: true } },
          _count: { select: { payments: true } },
        },
      }),
      prisma.wasteBill.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amount: true }, where }),
    ]);

    return NextResponse.json({ data, meta: buildMeta(total, p), summary });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireStaff();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

    const family = await prisma.family.findUnique({
      where: { id: parsed.data.familyId },
      include: { head: true, rt: { select: { number: true } } },
    });
    if (!family) return fail("Kartu keluarga tidak ditemukan", 404);

    const duplicate = await prisma.wasteBill.findUnique({
      where: {
        familyId_periodMonth_periodYear: {
          familyId: parsed.data.familyId,
          periodMonth: parsed.data.periodMonth,
          periodYear: parsed.data.periodYear,
        },
      },
    });
    if (duplicate) return fail("Tagihan untuk KK dan periode ini sudah ada", 409);

    const data = await prisma.wasteBill.create({
      data: {
        billNumber: `INV/${parsed.data.periodYear}${String(parsed.data.periodMonth).padStart(2, "0")}/${
          family.rt.number
        }/${family.kkNumber.slice(-4)}`,
        familyId: parsed.data.familyId,
        payerId: parsed.data.payerId || family.headId,
        rtId: family.rtId,
        periodMonth: parsed.data.periodMonth,
        periodYear: parsed.data.periodYear,
        amount: parsed.data.amount,
        dueDate: parsed.data.dueDate,
        notes: parsed.data.notes || null,
      },
      include: { family: { select: { headName: true } } },
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "CREATE",
      entity: "Tagihan",
      entityId: data.id,
      description: `Tagihan ${data.billNumber} dibuat untuk KK ${family.headName}`,
    });
    return NextResponse.json(data, { status: 201 });
  });
}
