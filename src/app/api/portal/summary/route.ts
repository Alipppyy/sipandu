import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handle, fail } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Ringkasan data untuk portal warga:
 * hanya menampilkan data milik warga yang sedang masuk.
 */
export async function GET() {
  return handle(async () => {
    const session = await requireUser();

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { residentId: true, name: true },
    });

    if (!user?.residentId) {
      return fail("Akun ini belum tertaut dengan data warga. Hubungi pengurus RW.", 404);
    }

    const resident = await prisma.resident.findUnique({
      where: { id: user.residentId },
      include: {
        rt: { select: { number: true, areaName: true } },
        family: {
          include: {
            head: { select: { id: true, name: true } },
            members: {
              select: { id: true, name: true, familyRole: true, gender: true, occupation: true, birthDate: true },
              orderBy: { birthDate: "asc" },
            },
          },
        },
        bills: {
          orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
          take: 24,
          include: { payments: { select: { id: true, amount: true, paidAt: true, receiptNo: true, method: true } } },
        },
        assignments: {
          where: { activity: { startsAt: { gte: new Date() } } },
          include: {
            activity: { select: { id: true, title: true, type: true, startsAt: true, endsAt: true, location: true, status: true, rtId: true } },
          },
          orderBy: { activity: { startsAt: "asc" } },
          take: 10,
        },
      },
    });

    if (!resident) return fail("Data warga tidak ditemukan", 404);

    const now = new Date();
    const activities = await prisma.activity.findMany({
      where: {
        status: { in: ["TERENCANA", "BERLANGSUNG"] },
        startsAt: { gte: now },
        OR: [{ rtId: null }, { rtId: resident.rtId }],
      },
      orderBy: { startsAt: "asc" },
      take: 8,
      include: { rt: { select: { number: true } } },
    });

    const announcements = await prisma.announcement.findMany({
      where: { published: true },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 6,
    });

    const unpaid = resident.bills.filter((b) => b.status === "BELUM_BAYAR" || b.status === "MENUNGGU_KONFIRMASI");

    return NextResponse.json({
      me: {
        id: resident.id,
        name: resident.name,
        nik: resident.nik,
        phone: resident.whatsapp ?? resident.phone,
        address: resident.family?.address ?? "-",
        rtNumber: resident.rt.number,
        rtArea: resident.rt.areaName,
        kkNumber: resident.family?.kkNumber ?? "-",
        headName: resident.family?.head?.name ?? resident.name,
        familyRole: resident.familyRole,
        occupation: resident.occupation,
      },
      members: resident.family?.members ?? [],
      bills: resident.bills.map((b) => ({
        id: b.id,
        billNumber: b.billNumber,
        periodMonth: b.periodMonth,
        periodYear: b.periodYear,
        amount: b.amount,
        status: b.status,
        dueDate: b.dueDate,
        paidAt: b.paidAt,
        receiptNo: b.receiptNo,
        payments: b.payments,
      })),
      summary: {
        total: resident.bills.length,
        unpaidCount: unpaid.length,
        unpaidTotal: unpaid.reduce((a, b) => a + b.amount, 0),
        paidTotal: resident.bills
          .filter((b) => b.status === "LUNAS")
          .reduce((a, b) => a + b.amount, 0),
      },
      myDuties: resident.assignments.map((a) => ({
        id: a.id,
        role: a.role,
        status: a.status,
        activity: a.activity,
      })),
      activities: activities.map((a) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        location: a.location,
        status: a.status,
        rt: a.rt,
        assigned: resident.assignments.some((x) => x.activity.id === a.id),
      })),
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        category: a.category,
        pinned: a.pinned,
        publishedAt: a.publishedAt,
      })),
    });
  });
}
