import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";
import { enqueue, processOutbox, renderTemplate, hasUnrenderedTemplate, getProfile } from "@/lib/wa";

export const dynamic = "force-dynamic";

const schema = z.object({
  message: z.string().trim().min(5, "Pesan minimal 5 karakter"),
  audience: z.enum(["semua", "rt", "tunggakan", "petugas", "pilihan"]),
  rtId: z.string().optional().nullable(),
  residentIds: z.array(z.string()).optional(),
  onlyHeads: z.boolean().default(true),
});

/** Kirim pesan WhatsApp manual ke sekelompok warga. */
export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireStaff();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

    let residents;
    switch (parsed.data.audience) {
      case "pilihan":
        if (!parsed.data.residentIds?.length) return fail("Pilih minimal satu penerima", 422);
        residents = await prisma.resident.findMany({
          where: { id: { in: parsed.data.residentIds }, status: "AKTIF" },
        });
        break;
      case "tunggakan": {
        const bills = await prisma.wasteBill.findMany({
          where: {
            status: { in: ["BELUM_BAYAR", "MENUNGGU_KONFIRMASI"] },
            ...(parsed.data.rtId ? { rtId: parsed.data.rtId } : {}),
          },
          include: { payer: true, family: { include: { head: true } } },
        });
        const map = new Map<string, { id: string; name: string; phone: string | null }>();
        bills.forEach((b) => {
          const person = b.payer ?? b.family.head;
          if (person?.id) map.set(person.id, { id: person.id, name: person.name, phone: person.whatsapp ?? person.phone });
        });
        residents = [...map.values()];
        break;
      }
      case "petugas": {
        const upcoming = await prisma.activity.findMany({
          where: { status: "TERENCANA", ...(parsed.data.rtId ? { rtId: parsed.data.rtId } : {}) },
          include: { assignments: { include: { resident: true } } },
        });
        const map = new Map<string, { id: string; name: string; phone: string | null }>();
        upcoming.forEach((a) =>
          a.assignments.forEach((as) =>
            map.set(as.resident.id, {
              id: as.resident.id,
              name: as.resident.name,
              phone: as.resident.whatsapp ?? as.resident.phone,
            }),
          ),
        );
        residents = [...map.values()];
        break;
      }
      default:
        residents = await prisma.resident.findMany({
          where: {
            status: "AKTIF",
            ...(parsed.data.rtId ? { rtId: parsed.data.rtId } : {}),
            ...(parsed.data.onlyHeads ? { familyRole: "KEPALA" } : {}),
          },
          select: { id: true, name: true, phone: true, whatsapp: true },
        });
        residents = residents.map((r) => ({ id: r.id, name: r.name, phone: r.whatsapp ?? r.phone }));
        break;
    }

    const profile = await getProfile();
    const renderedMessage = renderTemplate(parsed.data.message, { nama: "Warga" }, profile);
    if (!renderedMessage || hasUnrenderedTemplate(renderedMessage)) {
      return fail("Template pesan masih memiliki placeholder yang belum diproses.", 422);
    }

    let queued = 0;
    let skipped = 0;
    for (const r of residents) {
      if (!r.phone) {
        skipped++;
        continue;
      }
      const body = renderTemplate(parsed.data.message, { nama: r.name, nama_rw: `RW ${profile.rwNumber}` }, profile);
      if (!body || hasUnrenderedTemplate(body)) {
        skipped++;
        continue;
      }
      await enqueue({
        toPhone: r.phone,
        toName: r.name,
        body,
        category: "LAINNYA",
        templateKey: null,
        sendImmediately: false,
      });
      queued++;
    }

    const delivery = await processOutbox(500);

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "SEND",
      entity: "WhatsApp",
      description: `Pesan manual dikirim ke ${queued} warga (${skipped} tanpa nomor)`,
    });

    return NextResponse.json({ queued, skipped, delivery });
  });
}
