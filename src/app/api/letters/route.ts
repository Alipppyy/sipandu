import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, requireStaff, rtScope } from "@/lib/auth";
import { handle, getPagination, buildMeta, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  residentId: z.string().min(1, "Warga pemohon wajib dipilih"),
  type: z.enum([
    "DOMISILI",
    "SKCK",
    "PENGANTAR_KTP",
    "PENGANTAR_KK",
    "USAHA",
    "TIDAK_MAMPU",
    "KETERANGAN_LAIN",
  ]),
  purpose: z.string().trim().min(3, "Keperluan wajib diisi"),
  notes: z.string().trim().optional().nullable(),
  status: z.enum(["DIAJUKAN", "DIPROSES", "SELESAI", "DITOLAK"]).default("DIAJUKAN"),
});

async function nextLetterNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.letter.count();
  return `470/${String(count + 1).padStart(3, "0")}/RW05/${year}`;
}

export async function GET(req: Request) {
  return handle(async () => {
    const session = await requireUser();
    const sp = new URL(req.url).searchParams;
    const p = getPagination(sp, 10);
    const q = sp.get("q")?.trim() ?? "";
    const status = sp.get("status") ?? "";
    const type = sp.get("type") ?? "";

    const scope = rtScope(session);
    const where: Prisma.LetterWhereInput = {
      ...(scope.rtId ? { rtId: scope.rtId } : {}),
      ...(status ? { status: status as Prisma.EnumLetterStatusFilter } : {}),
      ...(type ? { type: type as Prisma.EnumLetterTypeFilter } : {}),
      ...(q
        ? {
            OR: [
              { number: { contains: q, mode: "insensitive" } },
              { purpose: { contains: q, mode: "insensitive" } },
              { resident: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.letter.count({ where }),
      prisma.letter.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: p.skip,
        take: p.take,
        include: {
          resident: { select: { id: true, name: true, nik: true, phone: true, whatsapp: true } },
          rt: { select: { number: true, areaName: true } },
          processedBy: { select: { name: true } },
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

    const resident = await prisma.resident.findUnique({ where: { id: parsed.data.residentId } });
    if (!resident) return fail("Warga tidak ditemukan", 404);

    const data = await prisma.letter.create({
      data: {
        number: await nextLetterNumber(),
        residentId: resident.id,
        rtId: resident.rtId,
        type: parsed.data.type,
        purpose: parsed.data.purpose,
        status: parsed.data.status,
        notes: parsed.data.notes ?? null,
        processedById: parsed.data.status === "DIAJUKAN" ? null : session.id,
      },
      include: { resident: { select: { name: true } } },
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "CREATE",
      entity: "Surat",
      entityId: data.id,
      description: `Surat ${data.number} diajukan untuk ${resident.name}`,
    });
    return NextResponse.json(data, { status: 201 });
  });
}
