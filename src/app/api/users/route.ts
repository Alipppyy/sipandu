import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handle, getPagination, buildMeta, fail } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createSchema = z
  .object({
    name: z.string().trim().min(2, "Nama minimal 2 karakter"),
    email: z.string().trim().email("Email tidak valid"),
    password: z.string().min(6, "Kata sandi minimal 6 karakter"),
    role: z.enum(["ADMIN", "OPERATOR", "KETUA_RT", "WARGA"]),
    phone: z.string().trim().optional().nullable(),
    rtId: z.string().optional().nullable(),
    active: z.boolean().default(true),
  })
  .refine((d) => (d.role === "KETUA_RT" ? Boolean(d.rtId) : true), {
    message: "Pilih RT untuk akun ketua RT",
    path: ["rtId"],
  });

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const sp = new URL(req.url).searchParams;
    const p = getPagination(sp, 20);
    const q = sp.get("q")?.trim() ?? "";
    const role = sp.get("role") ?? "";

    const where = {
      ...(role ? { role: role as "ADMIN" | "OPERATOR" | "KETUA_RT" | "WARGA" } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: p.skip,
        take: p.take,
        include: { rt: { select: { number: true, areaName: true } } },
      }),
    ]);

    return NextResponse.json({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      data: data.map(({ passwordHash: _pw, ...rest }) => rest),
      meta: buildMeta(total, p),
    });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireAdmin();
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (exists) return fail("Email sudah terdaftar", 409);

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash: await hashPassword(parsed.data.password),
        role: parsed.data.role,
        phone: parsed.data.phone || null,
        rtId: parsed.data.rtId || null,
        active: parsed.data.active,
      },
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "CREATE",
      entity: "Pengguna",
      entityId: user.id,
      description: `Akun ${user.email} dibuat`,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _pw, ...rest } = user;
    return NextResponse.json(rest, { status: 201 });
  });
}
