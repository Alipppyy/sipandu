import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  title: z.string().trim().min(3).optional(),
  body: z.string().trim().min(5).optional(),
  category: z.enum(["PENTING", "KEGIATAN", "KEUANGAN", "UMUM"]).optional(),
  pinned: z.boolean().optional(),
  published: z.boolean().optional(),
  rtScope: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireStaff();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

    const data = await prisma.announcement.update({ where: { id }, data: parsed.data });
    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "UPDATE",
      entity: "Pengumuman",
      entityId: id,
      description: `Pengumuman "${data.title}" diperbarui`,
    });
    return NextResponse.json(data);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireStaff();
    const { id } = await params;
    const current = await prisma.announcement.findUnique({ where: { id } });
    if (!current) return fail("Pengumuman tidak ditemukan", 404);
    await prisma.announcement.delete({ where: { id } });
    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "DELETE",
      entity: "Pengumuman",
      entityId: id,
      description: `Pengumuman "${current.title}" dihapus`,
    });
    return NextResponse.json({ ok: true });
  });
}
