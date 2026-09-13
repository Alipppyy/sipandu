import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  number: z.string().trim().regex(/^\d{2,3}$/).optional(),
  areaName: z.string().trim().min(3).optional(),
  rwNumber: z.string().trim().optional(),
  ketuaUserId: z.string().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

    const data = await prisma.rt.update({
      where: { id },
      data: { ...parsed.data, ketuaUserId: parsed.data.ketuaUserId ?? undefined },
    });
    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "UPDATE",
      entity: "RT",
      entityId: id,
      description: `Data RT ${data.number} diperbarui`,
    });
    return NextResponse.json(data);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    const current = await prisma.rt.findUnique({
      where: { id },
      include: { _count: { select: { families: true, residents: true } } },
    });
    if (!current) return fail("RT tidak ditemukan", 404);
    if (current._count.families > 0 || current._count.residents > 0) {
      return fail(
        `RT ${current.number} masih memiliki ${current._count.families} KK dan ${current._count.residents} warga. Pindahkan atau hapus datanya terlebih dahulu.`,
        400,
      );
    }
    await prisma.rt.delete({ where: { id } });
    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "DELETE",
      entity: "RT",
      entityId: id,
      description: `RT ${current.number} dihapus`,
    });
    return NextResponse.json({ ok: true });
  });
}
