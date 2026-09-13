import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Setel ulang penanda pengingat kegiatan (reminderSentAt = null) sehingga
 * penjadwal mengirim pengingat kegiatan itu kembali pada siklus berikutnya.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireStaff();
    const { id } = await params;

    const activity = await prisma.activity.findUnique({
      where: { id },
      select: { id: true, title: true, rtId: true },
    });
    if (!activity) return fail("Kegiatan tidak ditemukan", 404);

    if (session.role === "KETUA_RT" && session.rtId && activity.rtId && activity.rtId !== session.rtId) {
      return fail("Anda hanya dapat mengatur pengingat kegiatan di RT Anda", 403);
    }

    const data = await prisma.activity.update({
      where: { id },
      data: { reminderSentAt: null },
      select: { id: true, title: true, reminderSentAt: true },
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "UPDATE",
      entity: "Kegiatan",
      entityId: id,
      description: `Pengingat kegiatan "${activity.title}" dijadwalkan ulang`,
    });

    return NextResponse.json(data);
  });
}
