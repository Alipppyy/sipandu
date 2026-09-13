import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

const assignSchema = z.object({
  residentIds: z.array(z.string()).min(1, "Pilih minimal satu warga"),
  role: z.string().trim().default("Petugas"),
});

const updateSchema = z.object({
  residentId: z.string(),
  status: z.enum(["BELUM_KONFIRM", "HADIR", "IZIN", "ALPHA"]),
  note: z.string().trim().nullable().optional(),
});

/** Tambah petugas ke kegiatan. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireStaff();
    const { id } = await params;
    const body = await req.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

    const created = await prisma.activityAssignment.createMany({
      data: parsed.data.residentIds.map((residentId) => ({
        activityId: id,
        residentId,
        role: parsed.data.role,
      })),
      skipDuplicates: true,
    });

    const activity = await prisma.activity.findUnique({ where: { id } });
    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "UPDATE",
      entity: "Kegiatan",
      entityId: id,
      description: `${created.count} petugas ditambahkan ke kegiatan "${activity?.title ?? id}"`,
    });

    const data = await prisma.activity.findUnique({
      where: { id },
      include: {
        assignments: { include: { resident: { select: { id: true, name: true, phone: true, whatsapp: true, familyRole: true } } } },
      },
    });
    return NextResponse.json(data);
  });
}

/** Ubah status kehadiran satu petugas. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireStaff();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

    const data = await prisma.activityAssignment.upsert({
      where: { activityId_residentId: { activityId: id, residentId: parsed.data.residentId } },
      create: {
        activityId: id,
        residentId: parsed.data.residentId,
        status: parsed.data.status,
        note: parsed.data.note ?? null,
        confirmedAt: new Date(),
      },
      update: {
        status: parsed.data.status,
        note: parsed.data.note ?? null,
        confirmedAt: parsed.data.status === "BELUM_KONFIRM" ? null : new Date(),
      },
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "UPDATE",
      entity: "Kehadiran",
      entityId: id,
      description: `Status kehadiran diperbarui menjadi ${parsed.data.status}`,
    });

    return NextResponse.json(data);
  });
}

/** Hapus penugasan petugas. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireStaff();
    const { id } = await params;
    const residentId = new URL(req.url).searchParams.get("residentId");
    if (!residentId) return fail("residentId wajib diisi", 422);
    await prisma.activityAssignment.delete({
      where: { activityId_residentId: { activityId: id, residentId } },
    });
    return NextResponse.json({ ok: true });
  });
}
