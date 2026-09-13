import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
import { logActivity } from "@/lib/audit";
import { enqueue, renderByKey } from "@/lib/wa";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const paySchema = z.object({
  amount: z.coerce.number().min(1, "Nominal pembayaran wajib diisi"),
  method: z.enum(["TUNAI", "TRANSFER", "QRIS", "LAINNYA"]).default("TUNAI"),
  paidAt: z.coerce.date().optional(),
  note: z.string().trim().optional().nullable(),
  notify: z.boolean().default(true),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireStaff();
    const { id } = await params;
    const body = await req.json();
    const parsed = paySchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

    const bill = await prisma.wasteBill.findUnique({
      where: { id },
      include: { family: { include: { head: true, rt: true } }, payer: true },
    });
    if (!bill) return fail("Tagihan tidak ditemukan", 404);

    const paidAt = parsed.data.paidAt ?? new Date();
    const totalPaid = bill.paidAmount + parsed.data.amount;
    const lunas = totalPaid >= bill.amount;

    const paymentIndex = (await prisma.payment.count()) + 1;
    const receiptNo = `KW/${bill.periodYear}${String(bill.periodMonth).padStart(2, "0")}/${String(
      paymentIndex,
    ).padStart(4, "0")}`;

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          billId: bill.id,
          amount: parsed.data.amount,
          method: parsed.data.method,
          paidAt,
          receivedBy: session.id,
          receiptNo,
          note: parsed.data.note ?? null,
        },
      }),
      prisma.wasteBill.update({
        where: { id: bill.id },
        data: {
          paidAmount: totalPaid,
          status: lunas ? "LUNAS" : "MENUNGGU_KONFIRMASI",
          paidAt: lunas ? paidAt : null,
          paidById: session.id,
          method: parsed.data.method,
          receiptNo: lunas ? receiptNo : bill.receiptNo,
        },
      }),
    ]);

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "PAY",
      entity: "Tagihan",
      entityId: bill.id,
      description: `Pembayaran ${formatCurrency(parsed.data.amount)} diterima untuk ${bill.family.headName} (${receiptNo})`,
    });

    // Kirim bukti pembayaran via WhatsApp
    if (parsed.data.notify && lunas) {
      const person = bill.payer ?? bill.family.head;
      const phone = person?.whatsapp ?? person?.phone;
      if (phone) {
        const periode = new Date(bill.periodYear, bill.periodMonth - 1, 1).toLocaleString("id-ID", {
          month: "long",
          year: "numeric",
        });
        const bodyMsg =
          (await renderByKey("PAYMENT_RECEIPT", {
            nama: person?.name ?? bill.family.headName,
            periode,
            jumlah: formatCurrency(bill.amount),
            no_kwitansi: receiptNo,
            tanggal_bayar: formatDate(paidAt, true),
            metode: parsed.data.method,
          })) ??
          `Terima kasih ${person?.name ?? ""}, pembayaran iuran ${periode} sebesar ${formatCurrency(
            bill.amount,
          )} telah kami terima (${receiptNo}).`;

        await enqueue({
          toPhone: phone,
          toName: person?.name ?? bill.family.headName,
          body: bodyMsg,
          category: "BUKTI_BAYAR",
          templateKey: `RECEIPT_${bill.id}`,
          relatedType: "WasteBill",
          relatedId: bill.id,
        });
      }
    }

    return NextResponse.json({ payment, lunas });
  });
}
