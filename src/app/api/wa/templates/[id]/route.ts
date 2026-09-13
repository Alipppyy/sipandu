import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { handle, fail } from "@/lib/api";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  body: z.string().trim().min(5).optional(),
  active: z.boolean().optional(),
  category: z
    .enum(["PENGINGAT_SAMPAH", "JADWAL_KEGIATAN", "PENGUMUMAN", "BUKTI_BAYAR", "SURAT_SELESAI", "LAINNYA"])
    .optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireStaff();
    const { id } = await params;
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);
    const data = await prisma.messageTemplate.update({ where: { id }, data: parsed.data });
    return NextResponse.json(data);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireStaff();
    const { id } = await params;
    await prisma.messageTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
