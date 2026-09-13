import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireStaff } from "@/lib/auth";
import { handle, getPagination, buildMeta, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter"),
  body: z.string().trim().min(5, "Isi pengumuman wajib diisi"),
  category: z.enum(["PENTING", "KEGIATAN", "KEUANGAN", "UMUM"]).default("UMUM"),
  pinned: z.boolean().default(false),
  published: z.boolean().default(true),
  rtScope: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  return handle(async () => {
    await requireUser();
    const sp = new URL(req.url).searchParams;
    const p = getPagination(sp, 10);
    const q = sp.get("q")?.trim() ?? "";
    const category = sp.get("category") ?? "";

    const where = {
      ...(category ? { category: category as "PENTING" | "KEGIATAN" | "KEUANGAN" | "UMUM" } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { body: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.announcement.count({ where }),
      prisma.announcement.findMany({
        where,
        orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
        skip: p.skip,
        take: p.take,
        include: { author: { select: { name: true, avatarColor: true } } },
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

    const data = await prisma.announcement.create({
      data: { ...parsed.data, authorId: session.id },
    });
    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "CREATE",
      entity: "Pengumuman",
      entityId: data.id,
      description: `Pengumuman "${data.title}" dibuat`,
    });
    return NextResponse.json(data, { status: 201 });
  });
}
