import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, verifyPassword, hashPassword } from "@/lib/auth";
import { handle, fail } from "@/lib/api";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Kata sandi saat ini wajib diisi"),
    newPassword: z.string().min(6, "Kata sandi baru minimal 6 karakter"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["confirmPassword"],
  });

export async function PATCH(req: Request) {
  return handle(async () => {
    const session = await requireUser();
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Data tidak valid", 422);

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return fail("Pengguna tidak ditemukan", 404);
    if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      return fail("Kata sandi saat ini salah", 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });
    return NextResponse.json({ ok: true });
  });
}
