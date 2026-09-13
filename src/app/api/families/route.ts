import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, requireStaff, rtScope } from "@/lib/auth";
import { handle, getPagination, buildMeta, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  kkNumber: z.string().trim().regex(/^\d{16}$/, "No. KK harus 16 digit angka"),
  headName: z.string().trim().min(2, "Nama kepala keluarga minimal 2 karakter"),
  address: z.string().trim().min(4, "Alamat wajib diisi"),
  rtId: z.string().min(1, "RT wajib dipilih"),
  block: z.string().trim().optional().nullable(),
  houseNumber: z.string().trim().optional().nullable(),
  economicStatus: z.enum(["MAMPU", "MENENGAH", "KURANG_MAMPU"]).default("MENENGAH"),
  headId: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  return handle(async () => {
    const session = await requireUser();
    const sp = new URL(req.url).searchParams;
    const p = getPagination(sp);
    const q = sp.get("q")?.trim() ?? "";
    const rtId = sp.get("rtId") ?? "";
    const status = sp.get("status") ?? ""; // lunas | belum | menunggu
    const periode = sp.get("periode") ?? ""; // "MM-YYYY"

    const scope = rtScope(session);
    const where: Prisma.FamilyWhereInput = {
      ...(scope.rtId ? { rtId: scope.rtId } : {}),
      ...(rtId ? { rtId } : {}),
      ...(q
        ? {
            OR: [
              { kkNumber: { contains: q } },
              { headName: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    let data = await prisma.family.findMany({
      where,
      orderBy: { headName: "asc" },
      skip: p.skip,
      take: p.take,
      include: {
        rt: { select: { number: true, areaName: true } },
        head: { select: { id: true, name: true, phone: true, whatsapp: true } },
        _count: { select: { members: true, bills: true } },
      },
    });
    const total = await prisma.family.count({ where });

    // Saring berdasarkan status tagihan pada periode tertentu
    if (status && periode) {
      const [m, y] = periode.split("-").map(Number);
      const bills = await prisma.wasteBill.findMany({
        where: { periodMonth: m, periodYear: y, familyId: { in: data.map((f) => f.id) } },
        select: { familyId: true, status: true },
      });
      const map = new Map(bills.map((b) => [b.familyId, b.status]));
      const wanted = status === "lunas" ? "LUNAS" : status === "menunggu" ? "MENUNGGU_KONFIRMASI" : "BELUM_BAYAR";
      data = data.filter((f) => (map.get(f.id) ?? "BELUM_BAYAR") === wanted);
    }

    return NextResponse.json({ data, meta: buildMeta(total, p) });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireStaff();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

    const exists = await prisma.family.findUnique({ where: { kkNumber: parsed.data.kkNumber } });
    if (exists) return fail("Nomor KK sudah terdaftar", 409);

    const data = await prisma.family.create({
      data: {
        ...parsed.data,
        headId: parsed.data.headId || null,
      },
      include: { rt: { select: { number: true } } },
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "CREATE",
      entity: "Kartu Keluarga",
      entityId: data.id,
      description: `KK "${data.headName}" (RT ${data.rt.number}) ditambahkan`,
    });
    return NextResponse.json(data, { status: 201 });
  });
}
