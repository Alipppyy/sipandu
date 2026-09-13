import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { handle } from "@/lib/api";
import { runScheduler } from "@/lib/scheduler";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  return handle(async () => {
    const session = await requireStaff();
    const summary = await runScheduler();
    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "SEND",
      entity: "WhatsApp",
      description: `Penjadwal dijalankan manual: ${summary.trashReminders} pengingat iuran, ${summary.activityReminders} pengingat kegiatan, ${summary.delivery.sent} pesan terkirim`,
    });
    return NextResponse.json({ summary });
  });
}
