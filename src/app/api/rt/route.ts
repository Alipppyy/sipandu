import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  number: z.string().trim().regex(/^\d{2,3}$/, "Nomor RT 2–3 digit"),
  areaName: z.string().trim().min(3, "Nama wilayah wajib diisi"),
  rwNumber: z.string().trim().default("05"),
  ketuaUserId: z.string().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export async function GET() {
  return handle(async () => {
    await requireUser();
    const data = await prisma.rt.findMany({
      orderBy: { number: "asc" },
      include: {
        ketuaUser: { select: { id: true, name: true, phone: true, avatarColor: true } },
        _count: { select: { families: true, residents: true } },
      },
    });
    return NextResponse.json({ data });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireAdmin();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

    const data = await prisma.rt.create({
      data: { ...parsed.data, ketuaUserId: parsed.data.ketuaUserId || null },
    });
    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "CREATE",
      entity: "RT",
      entityId: data.id,
      description: `RT ${data.number} — ${data.areaName} ditambahkan`,
    });
    return NextResponse.json(data, { status: 201 });
  });
}
