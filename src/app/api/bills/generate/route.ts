import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";
import { getProfile } from "@/lib/wa";

export const dynamic = "force-dynamic";

const schema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
  amount: z.coerce.number().min(0).optional(),
  dueDay: z.coerce.number().min(1).max(28).optional(),
  rtId: z.string().optional().nullable(),
  overwrite: z.boolean().default(false),
});

/** Generate tagihan massal untuk seluruh KK pada periode tertentu. */
export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireStaff();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

    const profile = await getProfile();
    const amount = parsed.data.amount ?? profile.trashFeeAmount;
    const dueDay = parsed.data.dueDay ?? profile.trashDueDay;
    const dueDate = new Date(parsed.data.year, parsed.data.month - 1, dueDay, 23, 59);

    const families = await prisma.family.findMany({
      where: {
        members: { some: { status: "AKTIF" } },
        ...(parsed.data.rtId ? { rtId: parsed.data.rtId } : {}),
      },
      include: { head: true, rt: { select: { number: true } } },
    });

    let created = 0;
    let skipped = 0;
    for (const family of families) {
      const exists = await prisma.wasteBill.findUnique({
        where: {
          familyId_periodMonth_periodYear: {
            familyId: family.id,
            periodMonth: parsed.data.month,
            periodYear: parsed.data.year,
          },
        },
      });
      if (exists) {
        if (parsed.data.overwrite) {
          await prisma.wasteBill.update({
            where: { id: exists.id },
            data: { amount: family.economicStatus === "KURANG_MAMPU" ? Math.round(amount / 2) : amount, dueDate },
          });
          created++;
        } else {
          skipped++;
        }
        continue;
      }
      await prisma.wasteBill.create({
        data: {
          billNumber: `INV/${parsed.data.year}${String(parsed.data.month).padStart(2, "0")}/${
            family.rt.number
          }/${family.kkNumber.slice(-4)}`,
          familyId: family.id,
          payerId: family.headId,
          rtId: family.rtId,
          periodMonth: parsed.data.month,
          periodYear: parsed.data.year,
          amount: family.economicStatus === "KURANG_MAMPU" ? Math.round(amount / 2) : amount,
          dueDate,
        },
      });
      created++;
    }

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "CREATE",
      entity: "Tagihan",
      description: `Generate tagihan ${parsed.data.month}/${parsed.data.year}: ${created} dibuat, ${skipped} dilewati`,
    });

    return NextResponse.json({ created, skipped, amount, dueDate });
  });
}
