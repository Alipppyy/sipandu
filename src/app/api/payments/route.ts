import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, rtScope } from "@/lib/auth";
import { handle, getPagination, buildMeta } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const session = await requireUser();
    const sp = new URL(req.url).searchParams;
    const p = getPagination(sp, 20);
    const q = sp.get("q")?.trim() ?? "";

    const scope = rtScope(session);
    const where: Prisma.PaymentWhereInput = {
      ...(scope.rtId ? { bill: { rtId: scope.rtId } } : {}),
      ...(q
        ? {
            OR: [
              { receiptNo: { contains: q, mode: "insensitive" } },
              { bill: { family: { headName: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        orderBy: { paidAt: "desc" },
        skip: p.skip,
        take: p.take,
        include: {
          receiver: { select: { name: true } },
          bill: {
            select: {
              id: true,
              billNumber: true,
              periodMonth: true,
              periodYear: true,
              family: { select: { headName: true, kkNumber: true } },
              rt: { select: { number: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({ data, meta: buildMeta(total, p) });
  });
}
