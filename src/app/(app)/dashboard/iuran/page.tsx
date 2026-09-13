"use client";

import * as React from "react";
import {
  Trash2 as TrashIcon,
  Wallet,
  Plus,
  Pencil,
  Eye,

  CreditCard,
  Bell,
  Receipt,
  RotateCcw,
  CalendarRange,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Printer,
} from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import {
  Card,
  CardHeader,
  Button,
  Badge,
  SearchInput,
  Select,
  Input,
  Field,
  Textarea,
  Switch,
  Avatar,
  Segmented,
  Progress,
} from "@/components/ui/primitives";
import { DataTable, RowActions, ActionItem, type Column } from "@/components/ui/table";
import { ExportButton } from "@/components/ui/export-button";
import { EmptyState, Pagination, TableSkeleton } from "@/components/ui/states";
import { Modal, ConfirmDialog, Drawer } from "@/components/ui/overlay";
import { useCollection, useResource } from "@/hooks/use-collection";
import { useDebounce } from "@/hooks/use-debounce";
import { post, patch, del, api } from "@/lib/client/api";
import { WaComposeModal } from "@/components/forms/wa-compose";
import { toast } from "sonner";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  toISODateInput,
  BULAN_LIST,
  BULAN_PENDEK_LIST,
} from "@/lib/utils";

type BillRow = {
  id: string;
  billNumber: string;
  periodMonth: number;
  periodYear: number;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: string;
  paidAt: string | null;
  receiptNo: string | null;
  notes: string | null;
  reminderCount: number;
  lastReminderAt: string | null;
  family: { id: string; kkNumber: string; headName: string; address: string; economicStatus: string };
  payer: { id: string; name: string; phone: string | null; whatsapp: string | null } | null;
  rt: { number: string; areaName: string };
  _count: { payments: number };
};

type BillDetail = BillRow & {
  payments: {
    id: string;
    amount: number;
    method: string;
    paidAt: string;
    receiptNo: string;
    note: string | null;
    receiver: { name: string } | null;
  }[];
};

type PaymentRow = {
  id: string;
  amount: number;
  method: string;
  paidAt: string;
  receiptNo: string;
  note: string | null;
  receiver: { name: string } | null;
  bill: {
    id: string;
    billNumber: string;
    periodMonth: number;
    periodYear: number;
    family: { headName: string; kkNumber: string };
    rt: { number: string };
  };
};

const STATUS_LABEL: Record<string, string> = {
  BELUM_BAYAR: "Belum bayar",
  MENUNGGU_KONFIRMASI: "Menunggu",
  LUNAS: "Lunas",
  DIBEBASKAN: "Dibebaskan",
};

const STATUS_TONE: Record<string, "danger" | "warning" | "success" | "neutral"> = {
  BELUM_BAYAR: "danger",
  MENUNGGU_KONFIRMASI: "warning",
  LUNAS: "success",
  DIBEBASKAN: "neutral",
};

export default function IuranPage() {
  const now = new Date();
  const [tab, setTab] = React.useState<"tagihan" | "pembayaran">("tagihan");
  const [search, setSearch] = React.useState("");
  const q = useDebounce(search, 300);
  const [status, setStatus] = React.useState("");
  const [rtId, setRtId] = React.useState("");
  const [month, setMonth] = React.useState(String(now.getMonth() + 1));
  const [year, setYear] = React.useState(String(now.getFullYear()));
  const [page, setPage] = React.useState(1);

  const [payFor, setPayFor] = React.useState<BillRow | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<BillRow | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<BillRow | null>(null);
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [remindOpen, setRemindOpen] = React.useState(false);
  const [runningScheduler, setRunningScheduler] = React.useState(false);

  const col = useCollection<BillRow>({
    path: "/api/bills",
    query: { q, status, rtId, month, year, page, perPage: 12 },
  });
  const payments = useCollection<PaymentRow>({
    path: "/api/payments",
    query: { perPage: 20, page },
    enabled: tab === "pembayaran",
  });
  const { data: rtData } = useResource<{ data: { id: string; number: string; areaName: string }[] }>("/api/rt");

  React.useEffect(() => setPage(1), [q, status, rtId, month, year, tab]);

  const columns: Column<BillRow>[] = [
    {
      key: "kk",
      header: "Kartu Keluarga",
      cell: (b) => (
        <div className="flex items-center gap-3">
          <Avatar name={b.family.headName} size="sm" color="amber" />
          <div className="min-w-0">
            <p className="truncate font-medium">{b.family.headName}</p>
            <p className="truncate font-mono text-[11px] text-muted">{b.billNumber}</p>
          </div>
        </div>
      ),
    },
    {
      key: "rt",
      header: "RT",
      className: "hidden lg:table-cell",
      cell: (b) => <Badge tone="primary">RT {b.rt.number}</Badge>,
    },
    {
      key: "periode",
      header: "Periode",
      className: "hidden md:table-cell",
      cell: (b) => (
        <span className="text-[12.5px]">
          {BULAN_PENDEK_LIST[b.periodMonth - 1]} {b.periodYear}
        </span>
      ),
    },
    {
      key: "jumlah",
      header: "Jumlah",
      align: "right",
      cell: (b) => (
        <div>
          <p className="text-[13px] font-semibold tabular-nums">{formatCurrency(b.amount)}</p>
          {b.paidAmount > 0 && b.paidAmount < b.amount && (
            <p className="text-[11px] text-muted">dibayar {formatCurrency(b.paidAmount)}</p>
          )}
        </div>
      ),
    },
    {
      key: "jatuh_tempo",
      header: "Jatuh tempo",
      className: "hidden xl:table-cell",
      cell: (b) => {
        const overdue = new Date(b.dueDate) < new Date() && b.status !== "LUNAS" && b.status !== "DIBEBASKAN";
        return (
          <span className={`text-[12.5px] ${overdue ? "font-medium text-danger" : "text-muted"}`}>
            {formatDate(b.dueDate)}
            {overdue && " • telat"}
          </span>
        );
      },
    },
    {
      key: "pengingat",
      header: "Pengingat",
      className: "hidden xl:table-cell",
      cell: (b) =>
        b.reminderCount > 0 ? (
          <span className="flex items-center gap-1 text-[11.5px] text-muted">
            <Bell className="h-3 w-3" />
            {b.reminderCount}×
          </span>
        ) : (
          <span className="text-[11.5px] text-muted">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (b) => <Badge tone={STATUS_TONE[b.status] ?? "neutral"}>{STATUS_LABEL[b.status] ?? b.status}</Badge>,
    },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Iuran Sampah & Kebersihan"
        description="Tagihan bulanan per KK — pengingat jatuh tempo dan tunggakan dikirim otomatis ke WhatsApp."
        actions={
          <>
            <Button variant="secondary" onClick={() => setRemindOpen(true)}>
              <Bell className="h-4 w-4" />
              Kirim pengingat
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                setRunningScheduler(true);
                try {
                  const res = await post<{
                    summary: { trashReminders: number; delivery: { sent: number; failed: number } };
                  }>("/api/wa/run");
                  toast.success(
                    `Penjadwal: ${res.summary.trashReminders} pengingat dibuat, ${res.summary.delivery.sent} pesan terkirim`,
                  );
                  col.refresh();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Gagal menjalankan penjadwal");
                } finally {
                  setRunningScheduler(false);
                }
              }}
              loading={runningScheduler}
            >
              <CalendarRange className="h-4 w-4" />
              Jalankan penjadwal
            </Button>
            <ExportButton
              path="/api/bills/export"
              query={{ q, status, rtId, month: month || undefined, year: year || undefined }}
              filename="rekap-iuran"
            />
            <Button onClick={() => setGenerateOpen(true)}>
              <Plus className="h-4 w-4" />
              Generate tagihan
            </Button>
          </>
        }
      />

      {/* Ringkasan */}
      <BillSummary month={month} year={year} rtId={rtId} />

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "tagihan", label: "Daftar tagihan" },
          { value: "pembayaran", label: "Riwayat pembayaran" },
        ]}
      />

      {tab === "tagihan" ? (
        <Card>
          <div className="flex flex-col gap-3 border-b border-line p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Cari nama KK, no. KK, atau no. tagihan…"
                className="sm:max-w-sm"
              />
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Semua status</option>
                  <option value="BELUM_BAYAR">Belum bayar</option>
                  <option value="MENUNGGU_KONFIRMASI">Menunggu konfirmasi</option>
                  <option value="LUNAS">Lunas</option>
                  <option value="DIBEBASKAN">Dibebaskan</option>
                </Select>
                <Select value={rtId} onChange={(e) => setRtId(e.target.value)}>
                  <option value="">Semua RT</option>
                  {(rtData?.data ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      RT {r.number} — {r.areaName}
                    </option>
                  ))}
                </Select>
                <div className="flex gap-2">
                  <Select value={month} onChange={(e) => setMonth(e.target.value)}>
                    {BULAN_LIST.map((b, i) => (
                      <option key={b} value={String(i + 1)}>
                        {b}
                      </option>
                    ))}
                  </Select>
                  <Select value={year} onChange={(e) => setYear(e.target.value)} className="w-24">
                    {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DataTable
            columns={columns}
            rows={col.rows}
            loading={col.isLoading}
            error={col.error}
            onRetry={col.refresh}
            onRowClick={(b) => setDetailId(b.id)}
            skeletonRows={6}
            rowActions={(b) => (
              <RowActions>
                <ActionItem icon={<Eye className="h-4 w-4" />} onClick={() => setDetailId(b.id)}>
                  Lihat detail
                </ActionItem>
                {b.status !== "LUNAS" && b.status !== "DIBEBASKAN" && (
                  <ActionItem icon={<CreditCard className="h-4 w-4" />} onClick={() => setPayFor(b)}>
                    Catat pembayaran
                  </ActionItem>
                )}
                {b.receiptNo && (
                  <ActionItem
                    icon={<Printer className="h-4 w-4" />}
                    onClick={() => window.open(`/kwitansi/${b.id}`, "_blank")}
                  >
                    Cetak kwitansi
                  </ActionItem>
                )}
                <ActionItem icon={<Bell className="h-4 w-4" />} onClick={() => remindOne(b)}>
                  Ingatkan via WhatsApp
                </ActionItem>
                <ActionItem
                  icon={<Pencil className="h-4 w-4" />}
                  onClick={() => {
                    setEditing(b);
                    setFormOpen(true);
                  }}
                >
                  Ubah tagihan
                </ActionItem>
                <ActionItem icon={<TrashIcon className="h-4 w-4" />} destructive onClick={() => setDeleting(b)}>
                  Hapus
                </ActionItem>
              </RowActions>
            )}
            renderCard={(b) => (
              <div className="pr-8">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13.5px] font-medium">{b.family.headName}</p>
                  <p className="shrink-0 text-[13px] font-semibold tabular-nums">{formatCurrency(b.amount)}</p>
                </div>
                <p className="text-[11.5px] text-muted">
                  {BULAN_LIST[b.periodMonth - 1]} {b.periodYear} · RT {b.rt.number}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge>
                  <span className="text-[11px] text-muted">Jatuh tempo {formatDate(b.dueDate)}</span>
                </div>
              </div>
            )}
            empty={
              <EmptyState
                icon={<Wallet className="h-6 w-6" />}
                title={search || status ? "Tagihan tidak ditemukan" : "Belum ada tagihan periode ini"}
                description={
                  search || status
                    ? "Ubah kata kunci atau filter untuk melihat tagihan lain."
                    : "Gunakan tombol Generate tagihan untuk membuat tagihan massal seluruh KK."
                }
                action={
                  !search &&
                  !status && (
                    <Button size="sm" onClick={() => setGenerateOpen(true)}>
                      <Plus className="h-4 w-4" />
                      Generate tagihan
                    </Button>
                  )
                }
              />
            }
          />
          <Pagination
            page={col.meta.page}
            totalPages={col.meta.totalPages}
            total={col.meta.total}
            perPage={col.meta.perPage}
            onPage={setPage}
            isLoading={col.isValidating}
          />
        </Card>
      ) : (
        <Card>
          <CardHeader title="Riwayat pembayaran" description="Setoran iuran yang tercatat pada sistem" />
          {payments.isLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : payments.rows.length ? (
            <div className="divide-y divide-line">
              {payments.rows.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-soft text-success">
                    <Receipt className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{p.bill.family.headName}</p>
                    <p className="truncate text-[11.5px] text-muted">
                      {p.receiptNo} · {BULAN_PENDEK_LIST[p.bill.periodMonth - 1]} {p.bill.periodYear} · RT{" "}
                      {p.bill.rt.number} · {p.method}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] font-semibold tabular-nums text-success">{formatCurrency(p.amount)}</p>
                    <p className="text-[11px] text-muted">{formatDateTime(p.paidAt)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-danger"
                    onClick={async () => {
                      if (!confirm(`Batalkan pembayaran ${p.receiptNo}?`)) return;
                      try {
                        await del(`/api/payments/${p.id}`);
                        toast.success("Pembayaran dibatalkan");
                        payments.refresh();
                        col.refresh();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Gagal membatalkan");
                      }
                    }}
                    aria-label="Batalkan pembayaran"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Receipt className="h-6 w-6" />}
              title="Belum ada pembayaran"
              description="Pembayaran yang dicatat akan muncul di sini."
              compact
            />
          )}
        </Card>
      )}

      {/* Modals */}
      <PayModal bill={payFor} onClose={() => setPayFor(null)} onDone={col.refresh} />
      <BillDetailDrawer id={detailId} onClose={() => setDetailId(null)} onPay={(b) => {
        setDetailId(null);
        setPayFor(b);
      }} />
      <BillFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        bill={editing}
        onSaved={col.refresh}
      />
      <GenerateModal open={generateOpen} onClose={() => setGenerateOpen(false)} onDone={col.refresh} />
      {remindOpen && (
        <WaComposeModal
          open
          onClose={() => setRemindOpen(false)}
          title="Kirim pengingat iuran"
          defaultMessage="Halo Bapak/Ibu {{nama}} 👋

Mengingatkan iuran kebersihan RW {{nama_rw}} bulan ini yang belum kami terima. Mohon segera dibayarkan melalui ketua RT masing-masing.

Terima kasih 🙏"
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await col.remove(deleting.id, `Tagihan ${deleting.billNumber} dihapus`);
          setDeleting(null);
        }}
        title="Hapus tagihan"
        message={
          <>
            Hapus tagihan <strong>{deleting?.billNumber}</strong>? Riwayat pembayaran terkait juga akan terhapus.
          </>
        }
        confirmLabel="Hapus tagihan"
      />
    </div>
  );
}

async function remindOne(b: BillRow) {
  try {
    await api("/api/wa/send", {
      method: "POST",
      body: JSON.stringify({
        audience: "pilihan",
        residentIds: b.payer?.id ? [b.payer.id] : [],
        message: `Halo Bapak/Ibu {{nama}} 👋\n\nMengingatkan tagihan iuran kebersihan ${b.billNumber} sebesar ${formatCurrency(
          b.amount,
        )} dengan jatuh tempo ${formatDate(b.dueDate)}.\n\nTerima kasih 🙏`,
      }),
    });
    toast.success("Pengingat terkirim");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Gagal mengirim pengingat");
  }
}

/* ── Ringkasan ──────────────────────────────────────────── */

function BillSummary({ month, year, rtId }: { month: string; year: string; rtId: string }) {
  const { data, isLoading } = useResource<{
    data: BillRow[];
    meta: { total: number };
    summary: { status: string; _count: { _all: number }; _sum: { amount: number | null } }[];
  }>(`/api/bills?month=${month}&year=${year}${rtId ? `&rtId=${rtId}` : ""}&perPage=1`);

  const s = data?.summary ?? [];
  const get = (status: string) => s.find((x) => x.status === status);
  const lunas = get("LUNAS");
  const belum = get("BELUM_BAYAR");
  const menunggu = get("MENUNGGU_KONFIRMASI");
  const dibebaskan = get("DIBEBASKAN");
  const total = s.reduce((a, b) => a + b._count._all, 0);
  const collected = lunas?._sum.amount ?? 0;
  const outstanding = (belum?._sum.amount ?? 0) + (menunggu?._sum.amount ?? 0);
  const rate = total ? Math.round(((lunas?._count._all ?? 0) / total) * 100) : 0;

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="space-y-3 p-5">
            <div className="skeleton h-3.5 w-24" />
            <div className="skeleton h-7 w-28" />
          </Card>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: "Total tagihan",
      value: formatCurrency(s.reduce((a, b) => a + (b._sum.amount ?? 0), 0)),
      hint: `${total} KK · ${BULAN_LIST[Number(month) - 1]} ${year}`,
      icon: Wallet,
      tone: "text-primary",
      bg: "bg-primary-soft",
    },
    {
      label: "Terkumpul",
      value: formatCurrency(collected),
      hint: `${lunas?._count._all ?? 0} KK lunas (${rate}%)`,
      icon: CheckCircle2,
      tone: "text-success",
      bg: "bg-success-soft",
    },
    {
      label: "Belum bayar",
      value: formatCurrency(belum?._sum.amount ?? 0),
      hint: `${belum?._count._all ?? 0} KK belum menyetor`,
      icon: AlertCircle,
      tone: "text-danger",
      bg: "bg-danger-soft",
    },
    {
      label: "Menunggu konfirmasi",
      value: formatCurrency(menunggu?._sum.amount ?? 0),
      hint: `${menunggu?._count._all ?? 0} KK · ${dibebaskan?._count._all ?? 0} dibebaskan`,
      icon: Clock3,
      tone: "text-warning",
      bg: "bg-warning-soft",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((i) => (
        <Card key={i.label} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12.5px] text-muted">{i.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{i.value}</p>
              <p className="mt-0.5 truncate text-[11.5px] text-muted">{i.hint}</p>
            </div>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${i.bg} ${i.tone}`}>
              <i.icon className="h-5 w-5" />
            </span>
          </div>
          {i.label === "Terkumpul" && (
            <div className="mt-3">
              <Progress value={rate} tone={rate >= 80 ? "success" : rate >= 50 ? "warning" : "danger"} />
            </div>
          )}
          {i.label === "Belum bayar" && outstanding > 0 && (
            <p className="mt-3 text-[11.5px] text-muted">
              Total tunggakan periode ini <span className="font-semibold text-danger">{formatCurrency(outstanding)}</span>
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ── Form pembayaran ────────────────────────────────────── */

function PayModal({
  bill,
  onClose,
  onDone,
}: {
  bill: BillRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const remaining = bill ? Math.max(0, bill.amount - bill.paidAmount) : 0;
  const [amount, setAmount] = React.useState(remaining);
  const [method, setMethod] = React.useState<"TUNAI" | "TRANSFER" | "QRIS" | "LAINNYA">("TUNAI");
  const [paidAt, setPaidAt] = React.useState(toISODateInput(new Date()));
  const [note, setNote] = React.useState("");
  const [notify, setNotify] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (bill) {
      setAmount(Math.max(0, bill.amount - bill.paidAmount));
      setMethod("TUNAI");
      setPaidAt(toISODateInput(new Date()));
      setNote("");
      setNotify(true);
    }
  }, [bill]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!bill) return;
    setSaving(true);
    try {
      await post(`/api/bills/${bill.id}/pay`, {
        amount,
        method,
        paidAt: new Date(`${paidAt}T08:00:00`).toISOString(),
        note: note || null,
        notify,
      });
      toast.success(
        notify
          ? "Pembayaran tercatat & bukti dikirim ke WhatsApp warga"
          : "Pembayaran berhasil dicatat",
      );
      onDone();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pembayaran");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={Boolean(bill)}
      onClose={onClose}
      title="Catat pembayaran iuran"
      description={bill ? `${bill.billNumber} · ${bill.family.headName} · RT ${bill.rt.number}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={submit} loading={saving}>
            <CreditCard className="h-4 w-4" />
            Simpan pembayaran
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl border border-line bg-surface-muted/50 p-4">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted">Total tagihan</span>
            <span className="font-semibold tabular-nums">{formatCurrency(bill?.amount ?? 0)}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[13px]">
            <span className="text-muted">Sudah dibayar</span>
            <span className="tabular-nums">{formatCurrency(bill?.paidAmount ?? 0)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-[13.5px]">
            <span className="font-medium">Sisa</span>
            <span className="font-bold tabular-nums text-danger">{formatCurrency(remaining)}</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jumlah dibayar" required>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={0}
              required
            />
          </Field>
          <Field label="Metode pembayaran">
            <Select value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
              <option value="TUNAI">Tunai</option>
              <option value="TRANSFER">Transfer bank</option>
              <option value="QRIS">QRIS</option>
              <option value="LAINNYA">Lainnya</option>
            </Select>
          </Field>
          <Field label="Tanggal bayar" required>
            <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
          </Field>
          <Field label="Catatan">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="opsional" />
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-line bg-surface-muted/40 px-4 py-3">
          <div>
            <p className="text-[13px] font-medium">Kirim bukti pembayaran</p>
            <p className="text-[11.5px] text-muted">Notifikasi dikirim ke WhatsApp warga bila tagihan lunas</p>
          </div>
          <Switch checked={notify} onChange={setNotify} />
        </div>

        {amount < remaining && (
          <p className="rounded-lg bg-warning-soft px-3 py-2 text-[12px] text-warning">
            Pembayaran kurang dari sisa tagihan — status akan menjadi <strong>menunggu konfirmasi</strong>.
          </p>
        )}
      </form>
    </Modal>
  );
}

/* ── Detail tagihan ─────────────────────────────────────── */

function BillDetailDrawer({
  id,
  onClose,
  onPay,
}: {
  id: string | null;
  onClose: () => void;
  onPay: (b: BillRow) => void;
}) {
  const { data, isLoading } = useResource<BillDetail>(id ? `/api/bills/${id}` : null);
  return (
    <Drawer
      open={Boolean(id)}
      onClose={onClose}
      title={data ? `Tagihan ${data.billNumber}` : "Detail tagihan"}
      subtitle={
        data
          ? `${data.family.headName} · ${BULAN_LIST[data.periodMonth - 1]} ${data.periodYear} · RT ${data.rt.number}`
          : undefined
      }
      footer={
        data && (
          <div className="flex flex-1 gap-2">
            {data.status !== "LUNAS" && data.status !== "DIBEBASKAN" && (
              <Button className="flex-1" onClick={() => onPay(data)}>
                <CreditCard className="h-4 w-4" />
                Catat pembayaran
              </Button>
            )}
            {data.receiptNo && (
              <a
                href={`/kwitansi/${data.id}`}
                target="_blank"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px] font-medium transition-colors hover:bg-surface-muted"
              >
                <Printer className="h-4 w-4" />
                Cetak kwitansi
              </a>
            )}
          </div>
        )
      }
    >
      {isLoading || !data ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-4 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-line p-4">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] text-muted">Status</span>
              <Badge tone={STATUS_TONE[data.status]}>{STATUS_LABEL[data.status]}</Badge>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-[12.5px] text-muted">Jumlah tagihan</p>
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(data.amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-[12.5px] text-muted">Dibayar</p>
                <p className="text-lg font-semibold tabular-nums text-success">{formatCurrency(data.paidAmount)}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-[12.5px]">
              <div>
                <p className="text-muted">Jatuh tempo</p>
                <p className="font-medium">{formatDate(data.dueDate)}</p>
              </div>
              <div>
                <p className="text-muted">Pengingat terkirim</p>
                <p className="font-medium">
                  {data.reminderCount}× {data.lastReminderAt && `(${formatDate(data.lastReminderAt)})`}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-muted">Informasi KK</p>
            <div className="rounded-xl border border-line px-3 py-2.5 text-[12.5px]">
              <div className="flex justify-between py-1">
                <span className="text-muted">Kepala keluarga</span>
                <span className="font-medium">{data.family.headName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">No. KK</span>
                <span className="font-mono text-[11.5px]">{data.family.kkNumber}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Alamat</span>
                <span className="max-w-[55%] text-right">{data.family.address}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Wilayah</span>
                <span className="font-medium">RT {data.rt.number} — {data.rt.areaName}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-muted">
              Riwayat pembayaran ({data.payments.length})
            </p>
            {data.payments.length ? (
              <div className="space-y-1.5">
                {data.payments.map((p) => (
                  <div key={p.id} className="rounded-xl border border-line px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-medium">{p.receiptNo}</span>
                      <span className="text-[12.5px] font-semibold tabular-nums text-success">
                        {formatCurrency(p.amount)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {formatDateTime(p.paidAt)} · {p.method} · diterima {p.receiver?.name ?? "-"}
                    </p>
                    {p.note && <p className="mt-1 text-[11.5px] text-muted">“{p.note}”</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted">Belum ada pembayaran tercatat.</p>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

/* ── Form ubah tagihan ──────────────────────────────────── */

function BillFormModal({
  open,
  onClose,
  bill,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  bill: BillRow | null;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState({
    amount: 0,
    dueDate: "",
    status: "BELUM_BAYAR",
    notes: "",
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open && bill) {
      setForm({
        amount: bill.amount,
        dueDate: toISODateInput(bill.dueDate),
        status: bill.status,
        notes: bill.notes ?? "",
      });
    }
  }, [open, bill]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!bill) return;
    setSaving(true);
    try {
      await patch(`/api/bills/${bill.id}`, {
        ...form,
        dueDate: new Date(`${form.dueDate}T23:59:00`).toISOString(),
        notes: form.notes || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ubah tagihan"
      description={bill?.billNumber}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={submit} loading={saving}>
            Simpan
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jumlah tagihan" required>
            <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} required />
          </Field>
          <Field label="Jatuh tempo" required>
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
          </Field>
        </div>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="BELUM_BAYAR">Belum bayar</option>
            <option value="MENUNGGU_KONFIRMASI">Menunggu konfirmasi</option>
            <option value="LUNAS">Lunas</option>
            <option value="DIBEBASKAN">Dibebaskan</option>
          </Select>
        </Field>
        <Field label="Catatan">
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
        </Field>
      </form>
    </Modal>
  );
}

/* ── Generate tagihan massal ────────────────────────────── */

function GenerateModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const now = new Date();
  const [form, setForm] = React.useState({
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    amount: 30000,
    dueDay: 10,
    rtId: "",
    overwrite: false,
  });
  const [saving, setSaving] = React.useState(false);
  const { data: rtData } = useResource<{ data: { id: string; number: string; areaName: string }[] }>(
    open ? "/api/rt" : null,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await post<{ created: number; skipped: number }>("/api/bills/generate", {
        ...form,
        month: Number(form.month),
        year: Number(form.year),
        amount: Number(form.amount),
        dueDay: Number(form.dueDay),
        rtId: form.rtId || null,
      });
      toast.success(`${res.created} tagihan dibuat, ${res.skipped} dilewati (sudah ada)`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat tagihan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate tagihan massal"
      description="Buat tagihan iuran untuk seluruh KK aktif pada periode yang dipilih."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={submit} loading={saving}>
            <Plus className="h-4 w-4" />
            Buat tagihan
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bulan" required>
            <Select value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
              {BULAN_LIST.map((b, i) => (
                <option key={b} value={String(i + 1)}>
                  {b}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tahun" required>
            <Select value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nominal per KK" hint="KK kurang mampu otomatis 50%">
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            />
          </Field>
          <Field label="Tanggal jatuh tempo">
            <Input
              type="number"
              min={1}
              max={28}
              value={form.dueDay}
              onChange={(e) => setForm({ ...form, dueDay: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Wilayah">
          <Select value={form.rtId} onChange={(e) => setForm({ ...form, rtId: e.target.value })}>
            <option value="">Seluruh RT</option>
            {(rtData?.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                RT {r.number} — {r.areaName}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-center justify-between rounded-xl border border-line bg-surface-muted/40 px-4 py-3">
          <div>
            <p className="text-[13px] font-medium">Timpa tagihan yang sudah ada</p>
            <p className="text-[11.5px] text-muted">Perbarui nominal & jatuh tempo pada tagihan Existing</p>
          </div>
          <Switch checked={form.overwrite} onChange={(v) => setForm({ ...form, overwrite: v })} />
        </div>
      </form>
    </Modal>
  );
}
