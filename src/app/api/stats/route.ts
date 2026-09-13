import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, rtScope } from "@/lib/auth";
import { handle } from "@/lib/api";
import { waStats } from "@/lib/wa";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const session = await requireUser();
    const scope = rtScope(session);

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [
      rtCount,
      families,
      residents,
      activeResidents,
      maleResidents,
      femaleResidents,
      billsCurrent,
      billsPaidCurrent,
      billsUnpaidCurrent,
      collectedAgg,
      outstandingAgg,
      upcomingActivities,
      recentLogs,
      topDebtorsRaw,
      wa,
      letterStats,
    ] = await Promise.all([
      prisma.rt.count(),
      prisma.family.count({ ...(scope.rtId ? { where: { rtId: scope.rtId } } : {}) }),
      prisma.resident.count(scope.rtId ? { where: { rtId: scope.rtId } } : undefined),
      prisma.resident.count({ where: { status: "AKTIF", ...(scope.rtId ? { rtId: scope.rtId } : {}) } }),
      prisma.resident.count({ where: { gender: "LAKI_LAKI", status: "AKTIF", ...(scope.rtId ? { rtId: scope.rtId } : {}) } }),
      prisma.resident.count({ where: { gender: "PEREMPUAN", status: "AKTIF", ...(scope.rtId ? { rtId: scope.rtId } : {}) } }),
      prisma.wasteBill.count({ where: { periodMonth: month, periodYear: year, ...(scope.rtId ? { rtId: scope.rtId } : {}) } }),
      prisma.wasteBill.count({
        where: { periodMonth: month, periodYear: year, status: "LUNAS", ...(scope.rtId ? { rtId: scope.rtId } : {}) },
      }),
      prisma.wasteBill.count({
        where: {
          periodMonth: month,
          periodYear: year,
          status: { in: ["BELUM_BAYAR", "MENUNGGU_KONFIRMASI"] },
          ...(scope.rtId ? { rtId: scope.rtId } : {}),
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { bill: { periodMonth: month, periodYear: year, ...(scope.rtId ? { rtId: scope.rtId } : {}) } },
      }),
      prisma.wasteBill.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: ["BELUM_BAYAR", "MENUNGGU_KONFIRMASI"] },
          ...(scope.rtId ? { rtId: scope.rtId } : {}),
        },
      }),
      prisma.activity.findMany({
        where: {
          status: "TERENCANA",
          startsAt: { gte: now },
          ...(scope.rtId ? { OR: [{ rtId: scope.rtId }, { rtId: null }] } : {}),
        },
        orderBy: { startsAt: "asc" },
        take: 5,
        include: { rt: { select: { number: true } }, _count: { select: { assignments: true } } },
      }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.wasteBill.findMany({
        where: { status: { in: ["BELUM_BAYAR", "MENUNGGU_KONFIRMASI"] }, ...(scope.rtId ? { rtId: scope.rtId } : {}) },
        include: { family: { select: { headName: true, kkNumber: true } }, rt: { select: { number: true } } },
        orderBy: { dueDate: "asc" },
        take: 6,
      }),
      waStats(),
      prisma.letter.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    // Tren 6 bulan terakhir: terkumpul vs target
    const months: { month: number; year: number; label: string; collected: number; target: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const [collected, target] = await Promise.all([
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { bill: { periodMonth: m, periodYear: y, ...(scope.rtId ? { rtId: scope.rtId } : {}) } },
        }),
        prisma.wasteBill.aggregate({
          _sum: { amount: true },
          where: { periodMonth: m, periodYear: y, status: { not: "DIBEBASKAN" }, ...(scope.rtId ? { rtId: scope.rtId } : {}) },
        }),
      ]);
      months.push({
        month: m,
        year: y,
        label: d.toLocaleString("id-ID", { month: "short" }),
        collected: collected._sum.amount ?? 0,
        target: target._sum.amount ?? 0,
      });
    }

    // Komposisi per RT
    const rtBreakdown = await prisma.rt.findMany({
      select: {
        id: true,
        number: true,
        areaName: true,
        _count: { select: { families: true, residents: true } },
      },
      orderBy: { number: "asc" },
    });

    const rtBills = await prisma.wasteBill.groupBy({
      by: ["rtId", "status"],
      _count: { _all: true },
      where: { periodMonth: month, periodYear: year },
    });

    const rtStats = rtBreakdown.map((rt) => {
      const rows = rtBills.filter((b) => b.rtId === rt.id);
      const paid = rows.filter((r) => r.status === "LUNAS").reduce((a, b) => a + b._count._all, 0);
      const total = rows.reduce((a, b) => a + b._count._all, 0);
      return {
        id: rt.id,
        number: rt.number,
        areaName: rt.areaName,
        families: rt._count.families,
        residents: rt._count.residents,
        paid,
        total,
        rate: total ? Math.round((paid / total) * 100) : 0,
      };
    });

    const collectionRate = billsCurrent ? Math.round((billsPaidCurrent / billsCurrent) * 100) : 0;

    return NextResponse.json({
      counts: {
        rt: rtCount,
        families,
        residents,
        activeResidents,
        male: maleResidents,
        female: femaleResidents,
      },
      bills: {
        current: billsCurrent,
        paid: billsPaidCurrent,
        unpaid: billsUnpaidCurrent,
        collected: collectedAgg._sum.amount ?? 0,
        outstanding: outstandingAgg._sum.amount ?? 0,
        collectionRate,
      },
      months,
      upcomingActivities,
      recentLogs,
      topDebtors: topDebtorsRaw.map((b) => ({
        id: b.id,
        name: b.family.headName,
        kk: b.family.kkNumber,
        rt: b.rt.number,
        amount: b.amount,
        dueDate: b.dueDate,
        status: b.status,
      })),
      rtStats,
      wa,
      letters: letterStats.reduce(
        (acc, s) => ({ ...acc, [s.status]: s._count._all }),
        {} as Record<string, number>,
      ),
      period: { month, year, label: new Date(year, month - 1, 1).toLocaleString("id-ID", { month: "long", year: "numeric" }) },
    });
  });
}
