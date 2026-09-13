import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireStaff } from "@/lib/auth";
import { handle, fail } from "@/lib/api";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  key: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2),
  category: z
    .enum(["PENGINGAT_SAMPAH", "JADWAL_KEGIATAN", "PENGUMUMAN", "BUKTI_BAYAR", "SURAT_SELESAI", "LAINNYA"])
    .default("LAINNYA"),
  body: z.string().trim().min(5),
  active: z.boolean().default(true),
});

export async function GET() {
  return handle(async () => {
    await requireUser();
    const data = await prisma.messageTemplate.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json({ data });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireStaff();
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);
    const data = await prisma.messageTemplate.create({
      data: { ...parsed.data, key: parsed.data.key.toUpperCase().replace(/\s+/g, "_") },
    });
    return NextResponse.json(data, { status: 201 });
  });
}
