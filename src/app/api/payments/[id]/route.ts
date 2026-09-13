import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Batalkan pembayaran: kembalikan status tagihan. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireStaff();
    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { bill: { include: { family: { select: { headName: true } } } } },
    });
    if (!payment) return fail("Pembayaran tidak ditemukan", 404);

    await prisma.payment.delete({ where: { id } });

    const remaining = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { billId: payment.billId },
    });
    const paidAmount = remaining._sum.amount ?? 0;

    await prisma.wasteBill.update({
      where: { id: payment.billId },
      data: {
        paidAmount,
        status: paidAmount >= payment.bill.amount ? "LUNAS" : paidAmount > 0 ? "MENUNGGU_KONFIRMASI" : "BELUM_BAYAR",
        paidAt: paidAmount >= payment.bill.amount ? new Date() : null,
        receiptNo:
          paidAmount >= payment.bill.amount
            ? (await prisma.payment.findFirst({
                where: { billId: payment.billId },
                orderBy: { paidAt: "desc" },
                select: { receiptNo: true },
              }))?.receiptNo ?? null
            : null,
      },
    });

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "DELETE",
      entity: "Pembayaran",
      entityId: id,
      description: `Pembayaran ${payment.receiptNo} (${formatCurrency(payment.amount)}) dibatalkan`,
    });

    return NextResponse.json({ ok: true });
  });
}
