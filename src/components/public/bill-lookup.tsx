"use client";

import * as React from "react";
import { Search, Loader2, Wallet, AlertCircle, CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { Button, Input, Badge, Card } from "@/components/ui/primitives";
import { api, ApiError } from "@/lib/client/api";
import { formatCurrency, formatDate } from "@/lib/utils";

type LookupResult = {
  family: {
    kkNumber: string;
    headName: string;
    address: string;
    rtNumber: string;
    rtArea: string;
    phone: string;
    membersCount: number;
  };
  bills: {
    id: string;
    billNumber: string;
    period: string;
    amount: number;
    dueDate: string;
    status: string;
    paidAt: string | null;
    receiptNo: string | null;
  }[];
};

export function BillLookup() {
  const [keyword, setKeyword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<LookupResult | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api<LookupResult>("/api/public/lookup", {
        method: "POST",
        body: JSON.stringify({ keyword }),
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  const unpaid = result?.bills.filter((b) => b.status === "BELUM_BAYAR" || b.status === "MENUNGGU_KONFIRMASI") ?? [];
  const totalUnpaid = unpaid.reduce((a, b) => a + b.amount, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="p-5 sm:p-6">
        <form onSubmit={check} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value.replace(/[^\d]/g, "").slice(0, 20))}
              placeholder="Masukkan NIK atau No. Kartu Keluarga (KK)"
              className="h-11 pl-10 text-[13.5px]"
              inputMode="numeric"
              required
              minLength={6}
            />
          </div>
          <Button type="submit" size="lg" loading={loading} className="sm:w-40">
            {!loading && <Search className="h-4 w-4" />}
            Cek tagihan
          </Button>
        </form>

        <p className="mt-3 flex items-start gap-2 text-[11.5px] text-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Data pribadi tidak ditampilkan secara penuh — nomor telepon disamarkan untuk menjaga privasi warga.
        </p>

        {error && (
          <div className="animate-fade-in mt-4 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <p className="text-[13px] text-danger">{error}</p>
          </div>
        )}

        {result && (
          <div className="animate-fade-in-up mt-5 space-y-4">
            <div className="rounded-xl border border-line bg-surface-muted/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold">KK {result.family.headName}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    No. KK {result.family.kkNumber} · RT {result.family.rtNumber} {result.family.rtArea}
                  </p>
                  <p className="text-[12.5px] text-muted">{result.family.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11.5px] text-muted">Kontak</p>
                  <p className="text-[13px] font-medium">{result.family.phone}</p>
                  <p className="text-[11.5px] text-muted">{result.family.membersCount} anggota keluarga</p>
                </div>
              </div>
            </div>

            {unpaid.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-warning">
                    {unpaid.length} tagihan belum lunas
                  </p>
                  <p className="text-[11.5px] text-warning/80">
                    Segera selesaikan melalui ketua RT atau sekretariat RW
                  </p>
                </div>
                <p className="text-[17px] font-bold tabular-nums text-warning">{formatCurrency(totalUnpaid)}</p>
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-line">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-line bg-surface-muted/50 px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted">
                <span>Periode</span>
                <span className="text-right">Jumlah</span>
                <span className="w-28 text-right">Status</span>
              </div>
              {result.bills.map((b) => (
                <div
                  key={b.id}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-line px-4 py-3 text-[13px] last:border-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{b.period}</p>
                    <p className="text-[11px] text-muted">
                      {b.paidAt
                        ? `Dibayar ${formatDate(b.paidAt)}`
                        : `Jatuh tempo ${formatDate(b.dueDate)}`}
                    </p>
                  </div>
                  <span className="text-right font-semibold tabular-nums">{formatCurrency(b.amount)}</span>
                  <span className="w-28 text-right">
                    <Badge
                      tone={
                        b.status === "LUNAS"
                          ? "success"
                          : b.status === "MENUNGGU_KONFIRMASI"
                            ? "warning"
                            : b.status === "DIBEBASKAN"
                              ? "neutral"
                              : "danger"
                      }
                    >
                      {b.status === "LUNAS"
                        ? "Lunas"
                        : b.status === "MENUNGGU_KONFIRMASI"
                          ? "Menunggu"
                          : b.status === "DIBEBASKAN"
                            ? "Dibebaskan"
                            : "Belum bayar"}
                    </Badge>
                  </span>
                </div>
              ))}
              {result.bills.length === 0 && (
                <p className="px-4 py-8 text-center text-[13px] text-muted">
                  Belum ada tagihan untuk keluarga ini.
                </p>
              )}
            </div>

            {unpaid.length === 0 && result.bills.length > 0 && (
              <p className="flex items-center justify-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-[13px] font-medium text-success">
                <CheckCircle2 className="h-4 w-4" />
                Semua iuran kebersihan keluarga ini sudah lunas. Terima kasih!
              </p>
            )}

            <p className="flex items-start gap-2 text-[11.5px] text-muted">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Butuh keterangan lebih lanjut? Hubungi ketua RT atau datang ke sekretariat RW pada jam pelayanan
              18.00–20.00 WIB.
            </p>
          </div>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11.5px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5" />
          Iuran kebersihan dikelola langsung oleh kas RW
        </span>
        <span className="hidden h-1 w-1 rounded-full bg-line-strong sm:block" />
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="hidden" />
          Pengingat dikirim otomatis melalui WhatsApp
        </span>
      </div>
    </div>
  );
}
