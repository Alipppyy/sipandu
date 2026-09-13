import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireStaff } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  kkNumber: z.string().trim().regex(/^\d{16}$/).optional(),
  headName: z.string().trim().min(2).optional(),
  address: z.string().trim().min(4).optional(),
  rtId: z.string().optional(),
  block: z.string().trim().nullable().optional(),
  houseNumber: z.string().trim().nullable().optional(),
  economicStatus: z.enum(["MAMPU", "MENENGAH", "KURANG_MAMPU"]).optional(),
  headId: z.string().nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireUser();
    const { id } = await params;
    const data = await prisma.family.findUnique({
      where: { id },
      include: {
        rt: { select: { number: true, areaName: true } },
        head: true,
        members: {
          orderBy: [{ familyRole: "asc" }, { birthDate: "asc" }],
          include: { rt: { select: { number: true } } },
        },
        bills: {
          orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
          take: 12,
        },
      },
    });
    if (!data) return fail("Kartu keluarga tidak ditemukan", 404);
    return NextResponse.json(data);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireStaff();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

    const data = await prisma.family.update({ where: { id }, data: parsed.data });
    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "UPDATE",
      entity: "Kartu Keluarga",
      entityId: id,
      description: `Data KK "${data.headName}" diperbarui`,
    });
    return NextResponse.json(data);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireStaff();
    const { id } = await params;
    const current = await prisma.family.findUnique({ where: { id } });
    if (!current) return fail("Kartu keluarga tidak ditemukan", 404);

    await prisma.family.delete({ where: { id } });
    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "DELETE",
      entity: "Kartu Keluarga",
      entityId: id,
      description: `KK "${current.headName}" dihapus`,
    });
    return NextResponse.json({ ok: true });
  });
}
