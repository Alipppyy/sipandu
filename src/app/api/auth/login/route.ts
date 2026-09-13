import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword, touchLogin } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Data tidak valid", 422);
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      include: { rt: { select: { number: true } } },
    });

    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return fail("Email atau kata sandi salah", 401);
    }
    if (!user.active) return fail("Akun Anda dinonaktifkan. Hubungi pengurus RW.", 403);

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      rtId: user.rtId,
      rtNumber: user.rt?.number ?? null,
      avatarColor: user.avatarColor,
    });
    await touchLogin(user.id);
    await logActivity({
      userId: user.id,
      userName: user.name,
      action: "LOGIN",
      entity: "Pengguna",
      description: `${user.name} masuk ke sistem`,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        rtId: user.rtId,
        rtNumber: user.rt?.number ?? null,
        avatarColor: user.avatarColor,
      },
    });
  });
}
