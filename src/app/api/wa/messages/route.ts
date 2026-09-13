import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handle, getPagination, buildMeta } from "@/lib/api";
import { waStats } from "@/lib/wa";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    await requireUser();
    const sp = new URL(req.url).searchParams;
    const p = getPagination(sp, 20);
    const q = sp.get("q")?.trim() ?? "";
    const status = sp.get("status") ?? "";
    const category = sp.get("category") ?? "";

    const where: Prisma.WaMessageWhereInput = {
      ...(status ? { status: status as Prisma.EnumMessageStatusFilter } : {}),
      ...(category ? { category: category as Prisma.EnumMessageCategoryFilter } : {}),
      ...(q
        ? {
            OR: [
              { toName: { contains: q, mode: "insensitive" } },
              { toPhone: { contains: q } },
              { body: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, data, stats] = await Promise.all([
      prisma.waMessage.count({ where }),
      prisma.waMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: p.skip,
        take: p.take,
      }),
      waStats(),
    ]);

    return NextResponse.json({ data, meta: buildMeta(total, p), stats });
  });
}
