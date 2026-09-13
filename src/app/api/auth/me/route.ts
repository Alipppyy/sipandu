import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { handle } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const session = await getSession();
    return NextResponse.json({ user: session ?? null });
  });
}
