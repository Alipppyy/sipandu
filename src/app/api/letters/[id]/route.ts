import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";
import { enqueue, renderByKey } from "@/lib/wa";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  type: z.enum([
    "DOMISILI",
    "SKCK",
    "PENGANTAR_KTP",
    "PENGANTAR_KK",
    "USAHA",
    "TIDAK_MAMPU",
    "KETERANGAN_LAIN",
  ]).optional(),
  purpose: z.string().trim().min(3).optional(),
  status: z.enum(["DIAJUKAN", "DIPROSES", "SELESAI", "DITOLAK"]).optional(),
  notes: z.string().trim().nullable().optional(),
  notify: z.boolean().default(false),
});

const LABELS: Record<string, string> = {
  DOMISILI: "Surat Keterangan Domisili",
  SKCK: "Pengantar SKCK",
  PENGANTAR_KTP: "Pengantar KTP",
  PENGANTAR_KK: "Pengantar Kartu Keluarga",
  USAHA: "Keterangan Usaha",
  TIDAK_MAMPU: "Surat Keterangan Tidak Mampu",
  KETERANGAN_LAIN: "Surat Keterangan Lainnya",
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireStaff();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

    const current = await prisma.letter.findUnique({
      where: { id },
      include: { resident: true },
    });
    if (!current) return fail("Surat tidak ditemukan", 404);

    const { notify, ...rest } = parsed.data;
    const data = await prisma.letter.update({
      where: { id },
      data: {
        ...rest,
        processedById: rest.status && rest.status !== "DIAJUKAN" ? session.id : current.processedById,
        finishedAt: rest.status === "SELESAI" ? new Date() : rest.status ? null : current.finishedAt,
      },
      include: { resident: { select: { name: true } } },
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "UPDATE",
      entity: "Surat",
      entityId: id,
      description: `Surat ${data.number} — status ${data.status}`,
    });

    if (notify && rest.status === "SELESAI") {
      const phone = current.resident.whatsapp ?? current.resident.phone;
      if (phone) {
        const message =
          (await renderByKey("LETTER_READY", {
            nama: current.resident.name,
            jenis_surat: LABELS[data.type] ?? data.type,
            nomor_surat: data.number,
          })) ??
          `Halo ${current.resident.name}, surat pengantar Anda (${data.number}) sudah selesai dan dapat diambil di balai RW.`;
        await enqueue({
          toPhone: phone,
          toName: current.resident.name,
          body: message,
          category: "SURAT_SELESAI",
          templateKey: `LETTER_${data.id}`,
          relatedType: "Letter",
          relatedId: data.id,
        });
        await prisma.letter.update({ where: { id }, data: { notifyReadyAt: new Date() } });
      }
    }

    return NextResponse.json(data);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireStaff();
    const { id } = await params;
    const current = await prisma.letter.findUnique({ where: { id } });
    if (!current) return fail("Surat tidak ditemukan", 404);
    await prisma.letter.delete({ where: { id } });
    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "DELETE",
      entity: "Surat",
      entityId: id,
      description: `Surat ${current.number} dihapus`,
    });
    return NextResponse.json({ ok: true });
  });
}
