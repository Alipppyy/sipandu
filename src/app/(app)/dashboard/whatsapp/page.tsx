"use client";

import * as React from "react";
import {
  MessageCircle,
  Send,

  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCode,

  Inbox,
  Pencil,
  RotateCcw,
  Zap,
  Eye,
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
} from "@/components/ui/primitives";
import { DataTable, RowActions, ActionItem, type Column } from "@/components/ui/table";
import { EmptyState, Pagination } from "@/components/ui/states";
import { Modal, Drawer } from "@/components/ui/overlay";
import { useCollection, useResource } from "@/hooks/use-collection";
import { useDebounce } from "@/hooks/use-debounce";
import { post, patch } from "@/lib/client/api";
import { WaComposeModal } from "@/components/forms/wa-compose";
import { toast } from "sonner";
import { formatDateTime, formatRelative, maskPhone } from "@/lib/utils";

type WaRow = {
  id: string;
  toPhone: string;
  toName: string;
  body: string;
  category: string;
  status: string;
  attempts: number;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
  provider: string | null;
};

type Template = {
  id: string;
  key: string;
  name: string;
  category: string;
  body: string;
  active: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  ANTRIAN: "Dalam antrean",
  TERKIRIM: "Terkirim",
  TERKIRIM_SIMULASI: "Terkirim (simulasi)",
  GAGAL: "Gagal",
};

const STATUS_TONE: Record<string, "neutral" | "warning" | "success" | "info" | "danger"> = {
  DRAFT: "neutral",
  ANTRIAN: "warning",
  TERKIRIM: "success",
  TERKIRIM_SIMULASI: "info",
  GAGAL: "danger",
};

const CATEGORY_LABEL: Record<string, string> = {
  PENGINGAT_SAMPAH: "Pengingat iuran",
  JADWAL_KEGIATAN: "Jadwal kegiatan",
  PENGUMUMAN: "Pengumuman",
  BUKTI_BAYAR: "Bukti bayar",
  SURAT_SELESAI: "Surat selesai",
  LAINNYA: "Lainnya",
};

export default function WhatsAppPage() {
  const [tab, setTab] = React.useState<"log" | "template" | "kirim" | "pengaturan">("log");

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="WhatsApp Center"
        description="Pusat pengingat dan siaran pesan untuk warga RW 05."
        actions={
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "log", label: "Log pesan" },
              { value: "template", label: "Template" },
              { value: "kirim", label: "Kirim pesan" },
              { value: "pengaturan", label: "Pengaturan" },
            ]}
          />
        }
      />

      <GatewayBanner />

      {tab === "log" && <LogTab />}
      {tab === "template" && <TemplateTab />}
      {tab === "kirim" && <KirimTab />}
      {tab === "pengaturan" && <SettingsTab />}
    </div>
  );
}

/* ── Banner gateway ─────────────────────────────────────── */

function GatewayBanner() {
  const { data } = useResource<{ waEnabled: boolean; hasToken: boolean; waProvider: string }>("/api/wa/settings");
  const live = data?.waEnabled && data?.hasToken;

  return (
    <Card className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
      live ? "border-success/30 bg-success-soft/40" : "border-warning/30 bg-warning-soft/40"
    }`}>
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            live ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
          }`}
        >
          {live ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        </span>
        <div>
          <p className="text-[13.5px] font-semibold">
            {live
              ? `Gateway aktif — ${data?.waProvider?.toUpperCase()}`
              : "Mode simulasi aktif"}
          </p>
          <p className="text-[12px] text-muted">
            {live
              ? "Pesan dikirim sungguhan ke nomor WhatsApp warga."
              : "Isi token gateway pada tab Pengaturan untuk mengirim pesan sungguhan. Pesan tetap dicatat pada log."}
          </p>
        </div>
      </div>
      <Badge tone={live ? "success" : "warning"}>{live ? "Live" : "Simulasi"}</Badge>
    </Card>
  );
}

/* ── Log ───────────────────────────────────────────────── */

function LogTab() {
  const [search, setSearch] = React.useState("");
  const q = useDebounce(search, 300);
  const [status, setStatus] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [retrying, setRetrying] = React.useState(false);

  const col = useCollection<WaRow>({
    path: "/api/wa/messages",
    query: { q, status, category, page, perPage: 20 },
  });

  React.useEffect(() => setPage(1), [q, status, category]);

  const { data: statsData } = useResource<{
    stats: { total: number; sent: number; failed: number; queued: number; today: number };
  }>(`/api/wa/messages?perPage=1`);

  const columns: Column<WaRow>[] = [
    {
      key: "penerima",
      header: "Penerima",
      cell: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.toName} size="sm" color="teal" />
          <div className="min-w-0">
            <p className="truncate font-medium">{m.toName}</p>
            <p className="truncate text-[11px] text-muted">{maskPhone(m.toPhone)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "kategori",
      header: "Kategori",
      className: "hidden lg:table-cell",
      cell: (m) => <Badge tone="neutral">{CATEGORY_LABEL[m.category] ?? m.category}</Badge>,
    },
    {
      key: "pesan",
      header: "Pesan",
      className: "hidden xl:table-cell",
      cell: (m) => <span className="line-clamp-1 text-[12.5px] text-muted">{m.body}</span>,
    },
    {
      key: "waktu",
      header: "Waktu",
      className: "hidden md:table-cell",
      cell: (m) => (
        <div>
          <p className="text-[12.5px]">{m.sentAt ? formatDateTime(m.sentAt) : formatDateTime(m.createdAt)}</p>
          <p className="text-[11px] text-muted">{formatRelative(m.sentAt ?? m.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (m) => (
        <div>
          <Badge tone={STATUS_TONE[m.status] ?? "neutral"}>{STATUS_LABEL[m.status] ?? m.status}</Badge>
          {m.attempts > 1 && <p className="mt-0.5 text-[10.5px] text-muted">{m.attempts} percobaan</p>}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total pesan", value: statsData?.stats.total ?? 0, icon: MessageCircle, tone: "text-primary", bg: "bg-primary-soft" },
          { label: "Terkirim", value: statsData?.stats.sent ?? 0, icon: CheckCircle2, tone: "text-success", bg: "bg-success-soft" },
          { label: "Gagal", value: statsData?.stats.failed ?? 0, icon: AlertTriangle, tone: "text-danger", bg: "bg-danger-soft" },
          { label: "Dalam antrean", value: statsData?.stats.queued ?? 0, icon: Clock, tone: "text-warning", bg: "bg-warning-soft" },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12.5px] text-muted">{s.label}</p>
                <p className="mt-1 text-xl font-bold tabular-nums">{s.value.toLocaleString("id-ID")}</p>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg} ${s.tone}`}>
                <s.icon className="h-5 w-5" />
              </span>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Log pesan WhatsApp"
          description="Riwayat pengingat iuran, jadwal kegiatan, dan siaran pengumuman"
          action={
            <>
              <Button
                variant="secondary"
                size="sm"
                loading={retrying}
                onClick={async () => {
                  setRetrying(true);
                  try {
                    const res = await post<{ retried: number }>("/api/wa/retry", {});
                    toast.success(`${res.retried} pesan gagal dikirim ulang`);
                    col.refresh();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Gagal mengirim ulang");
                  } finally {
                    setRetrying(false);
                  }
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Kirim ulang gagal
              </Button>
              <Button size="sm" onClick={() => setComposeOpen(true)}>
                <Send className="h-3.5 w-3.5" />
                Kirim pesan
              </Button>
            </>
          }
        />
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari nama warga, nomor, atau isi pesan…"
            className="sm:max-w-sm"
          />
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Semua status</option>
              <option value="TERKIRIM">Terkirim</option>
              <option value="TERKIRIM_SIMULASI">Terkirim (simulasi)</option>
              <option value="ANTRIAN">Dalam antrean</option>
              <option value="GAGAL">Gagal</option>
            </Select>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Semua kategori</option>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={col.rows}
          loading={col.isLoading}
          error={col.error}
          onRetry={col.refresh}
          onRowClick={(m) => setDetailId(m.id)}
          skeletonRows={8}
          dense
          rowActions={(m) => (
            <RowActions>
              <ActionItem icon={<Eye className="h-4 w-4" />} onClick={() => setDetailId(m.id)}>
                Lihat isi pesan
              </ActionItem>
              {m.status === "GAGAL" && (
                <ActionItem
                  icon={<RotateCcw className="h-4 w-4" />}
                  onClick={async () => {
                    try {
                      await post("/api/wa/retry", { id: m.id });
                      toast.success("Pesan dikirim ulang");
                      col.refresh();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Gagal mengirim ulang");
                    }
                  }}
                >
                  Kirim ulang
                </ActionItem>
              )}
            </RowActions>
          )}
          renderCard={(m) => (
            <div className="pr-8">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[13.5px] font-medium">{m.toName}</p>
                <Badge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Badge>
              </div>
              <p className="line-clamp-2 text-[11.5px] text-muted">{m.body}</p>
              <p className="mt-1 text-[11px] text-muted">
                {CATEGORY_LABEL[m.category]} · {formatRelative(m.sentAt ?? m.createdAt)}
              </p>
            </div>
          )}
          empty={
            <EmptyState
              icon={<Inbox className="h-6 w-6" />}
              title={search || status ? "Pesan tidak ditemukan" : "Belum ada pesan terkirim"}
              description={
                search || status
                  ? "Ubah filter pencarian."
                  : "Jalankan penjadwal atau kirim pesan untuk mulai mengisi log WhatsApp."
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

      <MessageDetail id={detailId} onClose={() => setDetailId(null)} />
      {composeOpen && <WaComposeModal open onClose={() => setComposeOpen(false)} />}
    </>
  );
}

function MessageDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data } = useResource<{ data: WaRow[] }>(`/api/wa/messages?perPage=200`);
  const msg = data?.data.find((m) => m.id === id) ?? null;

  return (
    <Drawer
      open={Boolean(id)}
      onClose={onClose}
      title={msg ? `Pesan ke ${msg.toName}` : "Detail pesan"}
      subtitle={msg ? `${maskPhone(msg.toPhone)} · ${CATEGORY_LABEL[msg.category]}` : undefined}
    >
      {msg ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[msg.status]}>{STATUS_LABEL[msg.status]}</Badge>
            <Badge tone="neutral">{msg.provider ?? "—"}</Badge>
            <Badge tone="neutral">{msg.attempts} percobaan</Badge>
          </div>
          <div className="rounded-2xl border border-line bg-[#efeae2] p-3 dark:bg-[#0f1a17]">
            <div className="ml-auto max-w-[90%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap text-slate-800 shadow-sm dark:bg-[#005c4b] dark:text-slate-100">
              {msg.body}
              <span className="mt-1 block text-right text-[10px] text-slate-500 dark:text-slate-300">
                {msg.sentAt ? formatDateTime(msg.sentAt) : "belum terkirim"} ✓✓
              </span>
            </div>
          </div>
          {msg.error && (
            <div className="rounded-xl border border-danger/30 bg-danger-soft p-3.5">
              <p className="text-[12.5px] font-semibold text-danger">Keterangan gagal</p>
              <p className="mt-0.5 text-[12.5px] text-danger/90">{msg.error}</p>
            </div>
          )}
          <div className="rounded-xl border border-line p-3.5 text-[12.5px]">
            <div className="flex justify-between py-1">
              <span className="text-muted">Dibuat</span>
              <span>{formatDateTime(msg.createdAt)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted">Dikirim</span>
              <span>{msg.sentAt ? formatDateTime(msg.sentAt) : "—"}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted">Percobaan</span>
              <span>{msg.attempts}×</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-4 w-full" />
          ))}
        </div>
      )}
    </Drawer>
  );
}

/* ── Template ───────────────────────────────────────────── */

const TEMPLATE_VARS = ["nama", "nama_rw", "periode", "jumlah", "jatuh_tempo", "kegiatan", "tanggal", "jam", "lokasi", "penanggung_jawab", "judul", "pesan", "no_kwitansi", "metode", "jenis_surat", "nomor_surat", "hari_lagi", "hari_terlambat"];

function TemplateTab() {
  const { data, isLoading, refresh } = useResource<{ data: Template[] }>("/api/wa/templates");
  const [editing, setEditing] = React.useState<Template | null>(null);

  return (
    <Card>
      <CardHeader
        title="Template pesan"
        description="Teks otomatis untuk setiap jenis notifikasi. Variabel ditulis dengan {{nama}}."
        action={
          <span className="flex flex-wrap gap-1.5">
            {TEMPLATE_VARS.slice(0, 6).map((v) => (
              <span
                key={v}
                className="rounded-md border border-line bg-surface-muted px-1.5 py-0.5 font-mono text-[10.5px] text-muted"
              >
                {`{{${v}}}`}
              </span>
            ))}
          </span>
        }
      />
      {isLoading ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-12" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-line">
          {(data?.data ?? []).map((t) => (
            <div key={t.id} className="flex items-start gap-3 px-5 py-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <FileCode className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13.5px] font-semibold">{t.name}</p>
                  <Badge tone="neutral">{CATEGORY_LABEL[t.category] ?? t.category}</Badge>
                  {!t.active && <Badge tone="warning">Nonaktif</Badge>}
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-muted">{t.key}</p>
                <p className="mt-1.5 line-clamp-2 text-[12.5px] whitespace-pre-wrap text-muted">{t.body}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditing(t)} aria-label="Ubah template">
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <TemplateModal template={editing} onClose={() => setEditing(null)} onSaved={refresh} />
    </Card>
  );
}

function TemplateModal({
  template,
  onClose,
  onSaved,
}: {
  template: Template | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [body, setBody] = React.useState(template?.body ?? "");
  const [active, setActive] = React.useState(template?.active ?? true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setBody(template?.body ?? "");
    setActive(template?.active ?? true);
  }, [template]);

  async function save() {
    if (!template) return;
    setSaving(true);
    try {
      await patch(`/api/wa/templates/${template.id}`, { body, active });
      toast.success("Template diperbarui");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={Boolean(template)}
      onClose={onClose}
      size="lg"
      title={`Ubah template — ${template?.name ?? ""}`}
      description={template?.key}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={save} loading={saving}>
            Simpan template
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="Isi pesan"
          hint="Variabel yang tersedia: {{nama}}, {{periode}}, {{jumlah}}, {{jatuh_tempo}}, {{kegiatan}}, {{tanggal}}, {{jam}}, {{lokasi}}, {{nama_rw}}"
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="font-mono text-[12.5px] leading-relaxed"
          />
        </Field>
        <div className="flex items-center justify-between rounded-xl border border-line bg-surface-muted/40 px-4 py-3">
          <div>
            <p className="text-[13px] font-medium">Template aktif</p>
            <p className="text-[11.5px] text-muted">Template nonaktif tidak dipakai penjadwal</p>
          </div>
          <Switch checked={active} onChange={setActive} />
        </div>
        <div className="rounded-2xl border border-line bg-[#efeae2] p-3 dark:bg-[#0f1a17]">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#128c7e]">Pratinjau</p>
          <div className="ml-auto max-w-[88%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap text-slate-800 shadow-sm dark:bg-[#005c4b] dark:text-slate-100">
            {body || "—"}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ── Kirim ──────────────────────────────────────────────── */

function KirimTab() {
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [report, setReport] = React.useState<{
    trashReminders: number;
    activityReminders: number;
    autoGenerated: number;
    delivery: { processed: number; sent: number; failed: number };
    details: string[];
    ranAt: string;
  } | null>(null);

  async function runScheduler() {
    setRunning(true);
    try {
      const res = await post<{ summary: typeof report }>("/api/wa/run");
      setReport(res.summary);
      toast.success("Penjadwal selesai dijalankan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menjalankan penjadwal");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-[15px] font-semibold">Kirim pesan ke warga</h3>
          <p className="mt-1 text-[13px] text-muted">
            Pilih sasaran pengiriman: seluruh warga, RT tertentu, warga dengan tunggakan, atau petugas kegiatan.
          </p>
          <Button className="mt-4" onClick={() => setComposeOpen(true)}>
            <Send className="h-4 w-4" />
            Buka composer pesan
          </Button>
        </Card>

        <Card className="p-5">
          <h3 className="text-[15px] font-semibold">Jalankan penjadwal otomatis</h3>
          <p className="mt-1 text-[13px] text-muted">
            Memproses antrean, membuat tagihan periode berjalan, mengirim pengingat iuran (H-3, jatuh tempo, H+3, H+7)
            dan pengingat kegiatan.
          </p>
          <Button className="mt-4" variant="secondary" onClick={runScheduler} loading={running}>
            {!running && <Zap className="h-4 w-4" />}
            Jalankan sekarang
          </Button>

          {report && (
            <div className="animate-fade-in mt-4 space-y-2 rounded-xl border border-line bg-surface-muted/40 p-3.5">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[11px] text-muted">Pengingat iuran</p>
                  <p className="text-lg font-bold tabular-nums">{report.trashReminders}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted">Pengingat kegiatan</p>
                  <p className="text-lg font-bold tabular-nums">{report.activityReminders}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted">Terkirim</p>
                  <p className="text-lg font-bold tabular-nums text-success">{report.delivery.sent}</p>
                </div>
              </div>
              {report.details.length > 0 && (
                <div className="max-h-40 space-y-1 overflow-y-auto scrollbar-thin border-t border-line pt-2">
                  {report.details.slice(0, 20).map((d, i) => (
                    <p key={i} className="text-[11.5px] text-muted">
                      • {d}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Jadwal pengingat otomatis"
          description="Siklus pengingat iuran kebersihan yang berjalan otomatis"
        />
        <div className="grid gap-3 p-5 pt-0 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { when: "H-3", label: "Menjelang jatuh tempo", desc: "Pemberitahuan tagihan akan segera jatuh tempo", tone: "info" },
            { when: "H", label: "Hari jatuh tempo", desc: "Pengingat pada hari terakhir pembayaran", tone: "warning" },
            { when: "H+3", label: "Tunggakan 3 hari", desc: "Pengingat pertama untuk tunggakan", tone: "danger" },
            { when: "H+7", label: "Tunggakan 7 hari", desc: "Pengingat lanjutan beserta konfirmasi", tone: "danger" },
          ].map((s) => (
            <div key={s.when} className="rounded-xl border border-line p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold">{s.when}</span>
                <Badge tone={s.tone as never}>Otomatis</Badge>
              </div>
              <p className="mt-1 text-[12.5px] font-medium">{s.label}</p>
              <p className="mt-0.5 text-[11.5px] text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {composeOpen && <WaComposeModal open onClose={() => setComposeOpen(false)} />}
    </>
  );
}

/* ── Pengaturan gateway ─────────────────────────────────── */

function SettingsTab() {
  const { data, isLoading, refresh } = useResource<Record<string, unknown>>("/api/wa/settings");
  const [form, setForm] = React.useState<Record<string, unknown>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (data) setForm(data as Record<string, unknown>);
  }, [data]);

  async function save() {
    setSaving(true);
    try {
      await patch("/api/wa/settings", {
        waProvider: form.waProvider,
        waToken: form.waToken,
        waSender: form.waSender,
        waEnabled: form.waEnabled,
        waAutoSend: form.waAutoSend,
        trashFeeAmount: Number(form.trashFeeAmount),
        trashDueDay: Number(form.trashDueDay),
        reminderOffsets: form.reminderOffsets,
        reminderHour: Number(form.reminderHour),
        activityReminder: form.activityReminder,
        activityLeadHours: Number(form.activityLeadHours),
      });
      toast.success("Pengaturan gateway tersimpan");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !data) {
    return (
      <Card className="space-y-3 p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-10" />
        ))}
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Gateway WhatsApp" description="Sambungkan ke penyedia WhatsApp gateway" />
        <div className="space-y-4 p-5 pt-0">
          <Field label="Penyedia">
            <Select
              value={String(form.waProvider ?? "fonnte")}
              onChange={(e) => setForm({ ...form, waProvider: e.target.value })}
            >
              <option value="fonnte">Fonnte</option>
              <option value="wablas">Wablas</option>
              <option value="meta">Meta Cloud API</option>
            </Select>
          </Field>
          <Field label="Token API" hint="Token tidak ditampilkan ke perangkat RW selain admin">
            <Input
              type="password"
              value={String(form.waToken ?? "")}
              onChange={(e) => setForm({ ...form, waToken: e.target.value })}
              placeholder="Masukkan token Fonnte"
            />
          </Field>
          <Field label="Device / nomor pengirim" hint="Opsional — untuk akun multi-device">
            <Input
              value={String(form.waSender ?? "")}
              onChange={(e) => setForm({ ...form, waSender: e.target.value })}
              placeholder="kosongkan bila hanya satu device"
            />
          </Field>
          <div className="space-y-3 rounded-xl border border-line p-3.5">
            <Switch
              checked={Boolean(form.waEnabled)}
              onChange={(v) => setForm({ ...form, waEnabled: v })}
              label="Aktifkan pengiriman nyata"
              description="Nonaktif = mode simulasi, pesan hanya dicatat pada log"
            />
            <Switch
              checked={Boolean(form.waAutoSend)}
              onChange={(v) => setForm({ ...form, waAutoSend: v })}
              label="Penjadwal otomatis"
              description="Kirim pengingat terjadwal tanpa intervensi"
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Aturan pengingat" description="Kapan pesan dikirim ke warga" />
        <div className="space-y-4 p-5 pt-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nominal iuran per KK">
              <Input
                type="number"
                value={String(form.trashFeeAmount ?? 0)}
                onChange={(e) => setForm({ ...form, trashFeeAmount: e.target.value })}
              />
            </Field>
            <Field label="Tanggal jatuh tempo">
              <Input
                type="number"
                min={1}
                max={28}
                value={String(form.trashDueDay ?? 10)}
                onChange={(e) => setForm({ ...form, trashDueDay: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Hari pengingat" hint="Hari relatif terhadap jatuh tempo, pisahkan dengan koma">
            <Input
              value={String(form.reminderOffsets ?? "")}
              onChange={(e) => setForm({ ...form, reminderOffsets: e.target.value })}
              placeholder="-3,0,3,7"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jam pengiriman">
              <Input
                type="number"
                min={0}
                max={23}
                value={String(form.reminderHour ?? 8)}
                onChange={(e) => setForm({ ...form, reminderHour: e.target.value })}
              />
            </Field>
            <Field label="Pengingat kegiatan (jam sebelum)">
              <Input
                type="number"
                min={1}
                max={72}
                value={String(form.activityLeadHours ?? 12)}
                onChange={(e) => setForm({ ...form, activityLeadHours: e.target.value })}
              />
            </Field>
          </div>
          <Switch
            checked={Boolean(form.activityReminder)}
            onChange={(v) => setForm({ ...form, activityReminder: v })}
            label="Kirim pengingat kegiatan"
            description="Warga yang ditugaskan menerima pesan menjelang kegiatan"
          />
          <Button className="w-full" onClick={save} loading={saving}>
            Simpan pengaturan
          </Button>
        </div>
      </Card>
    </div>
  );
}
