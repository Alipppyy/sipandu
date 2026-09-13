import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";
import { enqueue, renderByKey } from "@/lib/wa";

export const dynamic = "force-dynamic";

const schema = z.object({
  target: z.enum(["semua", "rt"]).default("semua"),
  rtId: z.string().optional().nullable(),
  role: z.enum(["semua", "kepala"]).default("kepala"),
});

/** Siarkan pengumuman ke WhatsApp warga. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireStaff();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) return fail("Pengumuman tidak ditemukan", 404);

    const residents = await prisma.resident.findMany({
      where: {
        status: "AKTIF",
        ...(parsed.data.target === "rt" && parsed.data.rtId ? { rtId: parsed.data.rtId } : {}),
        ...(parsed.data.role === "kepala" ? { familyRole: "KEPALA" } : {}),
      },
    });

    let queued = 0;
    for (const r of residents) {
      const phone = r.whatsapp ?? r.phone;
      if (!phone) continue;
      const message =
        (await renderByKey("ANNOUNCEMENT", { judul: announcement.title, pesan: announcement.body, nama: r.name })) ??
        `📢 ${announcement.title}\n\n${announcement.body}`;
      await enqueue({
        toPhone: phone,
        toName: r.name,
        body: message,
        category: "PENGUMUMAN",
        templateKey: `ANN_${announcement.id}`,
        relatedType: "Announcement",
        relatedId: announcement.id,
        sendImmediately: false,
      });
      queued++;
    }

    await prisma.announcement.update({
      where: { id },
      data: { broadcastAt: new Date(), broadcastCount: { increment: queued } },
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "SEND",
      entity: "WhatsApp",
      entityId: id,
      description: `Pengumuman "${announcement.title}" disiarkan ke ${queued} warga`,
    });

    return NextResponse.json({ queued });
  });
}
