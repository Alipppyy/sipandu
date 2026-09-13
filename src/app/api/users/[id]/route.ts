import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  role: z.enum(["ADMIN", "OPERATOR", "KETUA_RT", "WARGA"]).optional(),
  phone: z.string().trim().nullable().optional(),
  rtId: z.string().nullable().optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

    const { password, ...rest } = parsed.data;
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...rest,
        email: rest.email ? rest.email.toLowerCase() : undefined,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "UPDATE",
      entity: "Pengguna",
      entityId: id,
      description: `Akun ${user.email} diperbarui`,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _pw, ...safe } = user;
    return NextResponse.json(safe);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireAdmin();
    const { id } = await params;
    if (id === session.id) return fail("Anda tidak dapat menghapus akun sendiri", 400);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return fail("Pengguna tidak ditemukan", 404);
    await prisma.user.delete({ where: { id } });
    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "DELETE",
      entity: "Pengguna",
      entityId: id,
      description: `Akun ${user.email} dihapus`,
    });
    return NextResponse.json({ ok: true });
  });
}
