import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, requireStaff } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  nik: z.string().trim().regex(/^\d{16}$/, "NIK harus 16 digit angka").optional(),
  name: z.string().trim().min(2).optional(),
  gender: z.enum(["LAKI_LAKI", "PEREMPUAN"]).optional(),
  birthPlace: z.string().trim().min(1).optional(),
  birthDate: z.coerce.date().optional(),
  religion: z.enum(["ISLAM", "KRISTEN", "KATOLIK", "HINDU", "BUDDHA", "KONGHUCU"]).optional(),
  education: z.enum(["SD", "SMP", "SMA", "DIPLOMA", "SARJANA", "PASCASARJANA"]).optional(),
  occupation: z.string().trim().optional(),
  maritalStatus: z.enum(["BELUM_KAWIN", "KAWIN", "CERAI_HIDUP", "CERAI_MATI"]).optional(),
  phone: z.string().trim().nullable().optional(),
  whatsapp: z.string().trim().nullable().optional(),
  email: z.string().trim().email().nullable().optional().or(z.literal("")),
  familyId: z.string().nullable().optional(),
  familyRole: z.enum(["KEPALA", "ISTRI", "ANAK", "ORANG_TUA", "FAMILI_LAIN"]).optional(),
  rtId: z.string().optional(),
  status: z.enum(["AKTIF", "PINDAH", "MENINGGAL"]).optional(),
  bloodType: z.string().trim().nullable().optional(),
  isVoter: z.boolean().optional(),
  notes: z.string().trim().nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireUser();
    const { id } = await params;
    const data = await prisma.resident.findUnique({
      where: { id },
      include: {
        rt: { select: { number: true, areaName: true } },
        family: {
          include: {
            rt: { select: { number: true } },
            members: { select: { id: true, name: true, familyRole: true, gender: true, occupation: true } },
          },
        },
        bills: {
          orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
          take: 12,
        },
        letters: { orderBy: { createdAt: "desc" }, take: 5 },
        assignments: {
          orderBy: { activity: { startsAt: "desc" } },
          take: 8,
          include: { activity: { select: { id: true, title: true, startsAt: true, type: true, status: true } } },
        },
      },
    });
    if (!data) return fail("Warga tidak ditemukan", 404);
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

    const current = await prisma.resident.findUnique({ where: { id } });
    if (!current) return fail("Warga tidak ditemukan", 404);
    if (session.role === "KETUA_RT" && session.rtId && current.rtId !== session.rtId) {
      return fail("Anda hanya dapat mengubah data warga di RT Anda", 403);
    }

    const data = await prisma.resident.update({
      where: { id },
      data: {
        ...parsed.data,
        email: parsed.data.email === "" ? null : parsed.data.email,
      } as Prisma.ResidentUncheckedUpdateInput,
    });

    if (parsed.data.familyId && parsed.data.familyRole === "KEPALA") {
      const fam = await prisma.family.findUnique({ where: { id: parsed.data.familyId } });
      if (fam && (!fam.headId || fam.headId === id)) {
        await prisma.family.update({ where: { id: fam.id }, data: { headId: id, headName: data.name } });
      }
    }

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "UPDATE",
      entity: "Warga",
      entityId: id,
      description: `Data warga "${data.name}" diperbarui`,
    });

    return NextResponse.json(data);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireStaff();
    const { id } = await params;
    const current = await prisma.resident.findUnique({ where: { id } });
    if (!current) return fail("Warga tidak ditemukan", 404);

    await prisma.resident.delete({ where: { id } });
    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "DELETE",
      entity: "Warga",
      entityId: id,
      description: `Data warga "${current.name}" dihapus`,
    });
    return NextResponse.json({ ok: true });
  });
}
