import { NextResponse } from "next/server";
import { handle, fail } from "@/lib/api";
import { runScheduler } from "@/lib/scheduler";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Endpoint untuk cron eksternal: GET /api/cron/reminders?secret=... */
export async function GET(req: Request) {
  return handle(async () => {
    const secret = new URL(req.url).searchParams.get("secret");
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return fail("Secret tidak valid", 401);
    }
    const summary = await runScheduler();
    return NextResponse.json({ ok: true, summary });
  });
}

export async function POST(req: Request) {
  return GET(req);
}
