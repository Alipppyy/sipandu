import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, requireStaff, rtScope } from "@/lib/auth";
import { handle, getPagination, buildMeta, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().trim().min(3, "Judul kegiatan minimal 3 karakter"),
  type: z.enum(["KERJA_BAKTI", "RONDA", "RAPAT", "PENGAJIAN", "POSYANDU", "LAINNYA"]),
  description: z.string().trim().optional().nullable(),
  location: z.string().trim().min(2, "Lokasi wajib diisi"),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  rtId: z.string().optional().nullable(),
  picName: z.string().trim().default("Ketua RW"),
  picPhone: z.string().trim().optional().nullable(),
  status: z.enum(["TERENCANA", "BERLANGSUNG", "SELESAI", "DIBATALKAN"]).default("TERENCANA"),
  notes: z.string().trim().optional().nullable(),
  notify: z.boolean().default(false),
});

export async function GET(req: Request) {
  return handle(async () => {
    const session = await requireUser();
    const sp = new URL(req.url).searchParams;
    const p = getPagination(sp, 12);
    const q = sp.get("q")?.trim() ?? "";
    const type = sp.get("type") ?? "";
    const status = sp.get("status") ?? "";
    const rtId = sp.get("rtId") ?? "";
    const range = sp.get("range") ?? ""; // mendatang | lalu | semua

    const scope = rtScope(session);
    const now = new Date();
    const where: Prisma.ActivityWhereInput = {
      ...(scope.rtId ? { OR: [{ rtId: scope.rtId }, { rtId: null }] } : {}),
      ...(rtId ? { rtId } : {}),
      ...(type ? { type: type as Prisma.EnumActivityTypeFilter } : {}),
      ...(status ? { status: status as Prisma.EnumActivityStatusFilter } : {}),
      ...(range === "mendatang" ? { startsAt: { gte: now } } : {}),
      ...(range === "lalu" ? { startsAt: { lt: now } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { location: { contains: q, mode: "insensitive" } },
              { picName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.findMany({
        where,
        orderBy: { startsAt: "desc" },
        skip: p.skip,
        take: p.take,
        include: {
          rt: { select: { number: true, areaName: true } },
          _count: { select: { assignments: true } },
        },
      }),
    ]);

    return NextResponse.json({ data, meta: buildMeta(total, p) });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireStaff();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);
    if (parsed.data.endsAt <= parsed.data.startsAt) {
      return fail("Waktu selesai harus setelah waktu mulai", 422);
    }

    const { notify, ...rest } = parsed.data;
    const data = await prisma.activity.create({
      data: { ...rest, rtId: rest.rtId || null },
      include: { rt: { select: { number: true } } },
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "CREATE",
      entity: "Kegiatan",
      entityId: data.id,
      description: `Kegiatan "${data.title}" dibuat`,
    });

    if (notify) {
      // reset penanda pengingat agar penjadwal mengirim notifikasi ke warga
      await prisma.activity.update({ where: { id: data.id }, data: { reminderSentAt: null } });
    }

    return NextResponse.json(data, { status: 201 });
  });
}
