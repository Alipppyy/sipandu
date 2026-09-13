import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireStaff } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  title: z.string().trim().min(3).optional(),
  type: z.enum(["KERJA_BAKTI", "RONDA", "RAPAT", "PENGAJIAN", "POSYANDU", "LAINNYA"]).optional(),
  description: z.string().trim().nullable().optional(),
  location: z.string().trim().min(2).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  rtId: z.string().nullable().optional(),
  picName: z.string().trim().optional(),
  picPhone: z.string().trim().nullable().optional(),
  status: z.enum(["TERENCANA", "BERLANGSUNG", "SELESAI", "DIBATALKAN"]).optional(),
  notes: z.string().trim().nullable().optional(),
  reminderSentAt: z.coerce.date().nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireUser();
    const { id } = await params;
    const data = await prisma.activity.findUnique({
      where: { id },
      include: {
        rt: { select: { number: true, areaName: true } },
        assignments: {
          include: {
            resident: {
              select: { id: true, name: true, phone: true, whatsapp: true, familyRole: true },
            },
          },
          orderBy: { resident: { name: "asc" } },
        },
      },
    });
    if (!data) return fail("Kegiatan tidak ditemukan", 404);
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

    const data = await prisma.activity.update({
      where: { id },
      data: { ...parsed.data, rtId: parsed.data.rtId === null ? null : parsed.data.rtId },
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "UPDATE",
      entity: "Kegiatan",
      entityId: id,
      description: `Kegiatan "${data.title}" diperbarui`,
    });
    return NextResponse.json(data);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireStaff();
    const { id } = await params;
    const current = await prisma.activity.findUnique({ where: { id } });
    if (!current) return fail("Kegiatan tidak ditemukan", 404);
    await prisma.activity.delete({ where: { id } });
    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "DELETE",
      entity: "Kegiatan",
      entityId: id,
      description: `Kegiatan "${current.title}" dihapus`,
    });
    return NextResponse.json({ ok: true });
  });
}
