import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireStaff } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  amount: z.coerce.number().min(0).optional(),
  dueDate: z.coerce.date().optional(),
  status: z.enum(["BELUM_BAYAR", "MENUNGGU_KONFIRMASI", "LUNAS", "DIBEBASKAN"]).optional(),
  payerId: z.string().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireUser();
    const { id } = await params;
    const data = await prisma.wasteBill.findUnique({
      where: { id },
      include: {
        family: { include: { rt: { select: { number: true, areaName: true } }, members: true } },
        payer: true,
        rt: true,
        payments: { orderBy: { paidAt: "desc" }, include: { receiver: { select: { name: true } } } },
      },
    });
    if (!data) return fail("Tagihan tidak ditemukan", 404);
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

    const data = await prisma.wasteBill.update({ where: { id }, data: parsed.data });
    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "UPDATE",
      entity: "Tagihan",
      entityId: id,
      description: `Tagihan ${data.billNumber} diperbarui`,
    });
    return NextResponse.json(data);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireStaff();
    const { id } = await params;
    const current = await prisma.wasteBill.findUnique({ where: { id } });
    if (!current) return fail("Tagihan tidak ditemukan", 404);
    await prisma.wasteBill.delete({ where: { id } });
    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "DELETE",
      entity: "Tagihan",
      entityId: id,
      description: `Tagihan ${current.billNumber} dihapus`,
    });
    return NextResponse.json({ ok: true });
  });
}
