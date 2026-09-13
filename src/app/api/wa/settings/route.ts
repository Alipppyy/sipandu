import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { getProfile } from "@/lib/wa";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  rwNumber: z.string().trim().optional(),
  village: z.string().trim().optional(),
  district: z.string().trim().optional(),
  city: z.string().trim().optional(),
  province: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  address: z.string().trim().optional(),
  ketuaName: z.string().trim().optional(),
  ketuaPhone: z.string().trim().optional(),
  sekretarisName: z.string().trim().optional(),
  bendaharaName: z.string().trim().optional(),
  waProvider: z.enum(["fonnte", "wablas", "meta"]).optional(),
  waToken: z.string().optional().nullable(),
  waSender: z.string().optional().nullable(),
  waEnabled: z.boolean().optional(),
  waAutoSend: z.boolean().optional(),
  trashFeeAmount: z.coerce.number().min(0).optional(),
  trashDueDay: z.coerce.number().min(1).max(28).optional(),
  reminderOffsets: z.string().trim().optional(),
  reminderHour: z.coerce.number().min(0).max(23).optional(),
  activityReminder: z.boolean().optional(),
  activityLeadHours: z.coerce.number().min(1).max(72).optional(),
});

export async function GET() {
  return handle(async () => {
    const session = await requireUser();
    const profile = await getProfile();
    const { waToken, ...rest } = profile;
    return NextResponse.json({
      ...rest,
      waToken: session.role === "ADMIN" ? waToken : undefined,
      hasToken: Boolean(waToken),
    });
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const session = await requireAdmin();
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);
    const profile = await getProfile();
    const data = await prisma.rwProfile.update({ where: { id: profile.id }, data: parsed.data });
    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "UPDATE",
      entity: "Pengaturan",
      description: "Pengaturan RW & gateway WhatsApp diperbarui",
    });
    return NextResponse.json(data);
  });
}
