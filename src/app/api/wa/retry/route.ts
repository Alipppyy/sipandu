import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { retryMessage, processOutbox } from "@/lib/wa";

export const dynamic = "force-dynamic";

const schema = z.object({ id: z.string().optional() });

export async function POST(req: Request) {
  return handle(async () => {
    await requireStaff();
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return fail("Data tidak valid", 422);

    if (parsed.data.id) {
      const msg = await retryMessage(parsed.data.id);
      return NextResponse.json(msg);
    }
    // ulang semua yang gagal
    const failed = await prisma.waMessage.findMany({ where: { status: "GAGAL" }, take: 100 });
    for (const m of failed) await retryMessage(m.id);
    return NextResponse.json({ retried: failed.length });
  });
}

export async function GET() {
  return handle(async () => {
    await requireStaff();
    return NextResponse.json(await processOutbox(200));
  });
}
