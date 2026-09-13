"use client";

import * as React from "react";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
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
} from "@/components/ui/primitives";
import { DataTable, RowActions, ActionItem, type Column } from "@/components/ui/table";
import { EmptyState, Pagination } from "@/components/ui/states";
import { Modal, ConfirmDialog, Drawer } from "@/components/ui/overlay";
import { useCollection } from "@/hooks/use-collection";
import { useDebounce } from "@/hooks/use-debounce";
import { patch, post } from "@/lib/client/api";
import { formatDate, formatDateTime } from "@/lib/utils";

type LetterRow = {
  id: string;
  number: string;
  type: string;
  purpose: string;
  status: string;
  notes: string | null;
  createdAt: string;
  finishedAt: string | null;
  notifyReadyAt: string | null;
  resident: { id: string; name: string; nik: string; phone: string | null; whatsapp: string | null };
  rt: { number: string; areaName: string };
  processedBy: { name: string } | null;
};

const TYPE_LABEL: Record<string, string> = {
  DOMISILI: "Keterangan Domisili",
  SKCK: "Pengantar SKCK",
  PENGANTAR_KTP: "Pengantar KTP",
  PENGANTAR_KK: "Pengantar KK",
  USAHA: "Keterangan Usaha",
  TIDAK_MAMPU: "Keterangan Tidak Mampu",
  KETERANGAN_LAIN: "Keterangan Lainnya",
};

const STATUS_LABEL: Record<string, string> = {
  DIAJUKAN: "Diajukan",
  DIPROSES: "Diproses",
  SELESAI: "Selesai",
  DITOLAK: "Ditolak",
};

const STATUS_TONE: Record<string, "warning" | "info" | "success" | "danger"> = {
  DIAJUKAN: "warning",
  DIPROSES: "info",
  SELESAI: "success",
  DITOLAK: "danger",
};

export default function SuratPage() {
  const [search, setSearch] = React.useState("");
  const q = useDebounce(search, 300);
  const [status, setStatus] = React.useState("");
  const [type, setType] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LetterRow | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<LetterRow | null>(null);

  const col = useCollection<LetterRow>({
    path: "/api/letters",
    query: { q, status, type, page, perPage: 12 },
  });

  React.useEffect(() => setPage(1), [q, status, type]);

  const columns: Column<LetterRow>[] = [
    {
      key: "nomor",
      header: "Nomor & pemohon",
      cell: (l) => (
        <div className="flex items-center gap-3">
          <Avatar name={l.resident.name} size="sm" color="violet" />
          <div className="min-w-0">
            <p className="truncate font-medium">{l.resident.name}</p>
            <p className="truncate font-mono text-[11px] text-muted">{l.number}</p>
          </div>
        </div>
      ),
    },
    {
      key: "jenis",
      header: "Jenis surat",
      className: "hidden md:table-cell",
      cell: (l) => <span className="text-[12.5px]">{TYPE_LABEL[l.type] ?? l.type}</span>,
    },
    {
      key: "keperluan",
      header: "Keperluan",
      className: "hidden lg:table-cell",
      cell: (l) => <span className="line-clamp-1 text-[12.5px] text-muted">{l.purpose}</span>,
    },
    { key: "rt", header: "RT", className: "hidden xl:table-cell", cell: (l) => <Badge tone="primary">RT {l.rt.number}</Badge> },
    {
      key: "tanggal",
      header: "Diajukan",
      className: "hidden lg:table-cell",
      cell: (l) => <span className="text-[12.5px] text-muted">{formatDate(l.createdAt)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (l) => <Badge tone={STATUS_TONE[l.status]}>{STATUS_LABEL[l.status]}</Badge>,
    },
  ];

  async function changeStatus(l: LetterRow, next: string) {
    await col.update(
      l.id,
      { status: next } as never,
      `Status surat ${l.number} menjadi ${STATUS_LABEL[next]}`,
      (row) => ({ ...row, status: next }),
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Surat Pengantar"
        description="Layanan permohonan surat pengantar warga — notifikasi otomatis saat surat siap diambil."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Buat permohonan
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari nomor surat, nama pemohon, atau keperluan…"
            className="sm:max-w-md"
          />
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Semua status</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Semua jenis</option>
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={`Permohonan surat (${col.meta.total})`} description="Ubah status langsung dari menu aksi" />
        <DataTable
          columns={columns}
          rows={col.rows}
          loading={col.isLoading}
          error={col.error}
          onRetry={col.refresh}
          onRowClick={(l) => setDetailId(l.id)}
          skeletonRows={6}
          rowActions={(l) => (
            <RowActions>
              <ActionItem icon={<Eye className="h-4 w-4" />} onClick={() => setDetailId(l.id)}>
                Lihat detail
              </ActionItem>
              {l.status !== "DIPROSES" && (
                <ActionItem icon={<Loader2 className="h-4 w-4" />} onClick={() => changeStatus(l, "DIPROSES")}>
                  Tandai diproses
                </ActionItem>
              )}
              {l.status !== "SELESAI" && (
                <ActionItem icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => changeStatus(l, "SELESAI")}>
                  Tandai selesai
                </ActionItem>
              )}
              {l.status !== "DITOLAK" && (
                <ActionItem icon={<XCircle className="h-4 w-4" />} onClick={() => changeStatus(l, "DITOLAK")}>
                  Tolak permohonan
                </ActionItem>
              )}
              <ActionItem
                icon={<Printer className="h-4 w-4" />}
                onClick={() => window.open(`/surat/${l.id}/cetak`, "_blank")}
              >
                Cetak surat
              </ActionItem>
              <ActionItem
                icon={<Pencil className="h-4 w-4" />}
                onClick={() => {
                  setEditing(l);
                  setFormOpen(true);
                }}
              >
                Ubah data
              </ActionItem>
              <ActionItem icon={<Trash2 className="h-4 w-4" />} destructive onClick={() => setDeleting(l)}>
                Hapus
              </ActionItem>
            </RowActions>
          )}
          renderCard={(l) => (
            <div className="pr-8">
              <p className="truncate text-[13.5px] font-medium">{l.resident.name}</p>
              <p className="truncate text-[11.5px] text-muted">
                {TYPE_LABEL[l.type]} · {l.number}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge tone={STATUS_TONE[l.status]}>{STATUS_LABEL[l.status]}</Badge>
                <span className="text-[11px] text-muted">{formatDate(l.createdAt)}</span>
              </div>
            </div>
          )}
          empty={
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title={search || status ? "Permohonan tidak ditemukan" : "Belum ada permohonan surat"}
              description={
                search || status
                  ? "Ubah kata kunci atau filter."
                  : "Catat permohonan surat pengantar warga untuk diproses pengurus."
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

      <LetterFormModal open={formOpen} onClose={() => setFormOpen(false)} letter={editing} onSaved={col.refresh} />
      <LetterDetailDrawer
        id={detailId}
        rows={col.rows}
        onClose={() => setDetailId(null)}
        onEdit={(l) => {
          setDetailId(null);
          setEditing(l);
          setFormOpen(true);
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await col.remove(deleting.id, `Surat ${deleting.number} dihapus`);
          setDeleting(null);
        }}
        title="Hapus permohonan surat"
        message={
          <>
            Hapus permohonan <strong>{deleting?.number}</strong> atas nama {deleting?.resident.name}?
          </>
        }
        confirmLabel="Hapus surat"
      />
    </div>
  );
}

/* ── Form surat ─────────────────────────────────────────── */

function LetterFormModal({
  open,
  onClose,
  letter,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  letter: LetterRow | null;
  onSaved: () => void;
}) {
  const [residentQuery, setResidentQuery] = React.useState("");
  const debounced = useDebounce(residentQuery, 300);
  const [form, setForm] = React.useState({
    residentId: "",
    residentName: "",
    type: "DOMISILI",
    purpose: "",
    status: "DIAJUKAN",
    notes: "",
    notify: true,
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const residents = useCollection<{ id: string; name: string; nik: string }>({
    path: "/api/residents",
    query: { q: debounced, perPage: 8, status: "AKTIF" },
    enabled: open && debounced.length > 1,
    silent: true,
  });

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (letter) {
      setForm({
        residentId: letter.resident.id,
        residentName: letter.resident.name,
        type: letter.type,
        purpose: letter.purpose,
        status: letter.status,
        notes: letter.notes ?? "",
        notify: false,
      });
    } else {
      setForm({
        residentId: "",
        residentName: "",
        type: "DOMISILI",
        purpose: "",
        status: "DIAJUKAN",
        notes: "",
        notify: true,
      });
    }
    setResidentQuery("");
  }, [open, letter]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        residentId: form.residentId,
        type: form.type,
        purpose: form.purpose,
        status: form.status,
        notes: form.notes || null,
        notify: form.notify,
      };
      if (letter) await patch(`/api/letters/${letter.id}`, payload);
      else await post("/api/letters", payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={letter ? "Ubah permohonan surat" : "Buat permohonan surat"}
      description="Warga akan diberi tahu lewat WhatsApp ketika surat selesai."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={submit} loading={saving} disabled={!form.residentId}>
            Simpan
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
            {error}
          </div>
        )}

        <Field label="Pemohon" required>
          {form.residentId ? (
            <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-muted px-3 py-2">
              <Avatar name={form.residentName} size="xs" color="violet" />
              <span className="flex-1 truncate text-[13px]">{form.residentName}</span>
              {!letter && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, residentId: "", residentName: "" })}
                  className="text-[11.5px] font-medium text-primary hover:underline"
                >
                  Ganti
                </button>
              )}
            </div>
          ) : (
            <>
              <Input
                value={residentQuery}
                onChange={(e) => setResidentQuery(e.target.value)}
                placeholder="Ketik nama warga untuk mencari…"
              />
              {debounced.length > 1 && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-line scrollbar-thin">
                  {residents.rows.length ? (
                    residents.rows.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setForm({ ...form, residentId: r.id, residentName: r.name })}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-surface-muted"
                      >
                        <Avatar name={r.name} size="xs" color="violet" />
                        <span className="truncate">{r.name}</span>
                        <span className="ml-auto font-mono text-[10.5px] text-muted">{r.nik.slice(-6)}</span>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2.5 text-[12.5px] text-muted">
                      {residents.isLoading ? "Mencari…" : "Warga tidak ditemukan."}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jenis surat" required>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Keperluan" required>
          <Textarea
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            rows={3}
            required
            placeholder="Contoh: Persyaratan pengajuan KTP elektronik"
          />
        </Field>
        <Field label="Catatan pengurus">
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            placeholder="opsional"
          />
        </Field>

        {form.status === "SELESAI" && (
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface-muted/40 px-4 py-3">
            <div>
              <p className="text-[13px] font-medium">Kirim notifikasi WhatsApp</p>
              <p className="text-[11.5px] text-muted">Beri tahu warga bahwa surat siap diambil</p>
            </div>
            <Switch checked={form.notify} onChange={(v) => setForm({ ...form, notify: v })} />
          </div>
        )}
      </form>
    </Modal>
  );
}

/* ── Detail surat ───────────────────────────────────────── */

function LetterDetailDrawer({
  id,
  rows,
  onClose,
  onEdit,
}: {
  id: string | null;
  rows: LetterRow[];
  onClose: () => void;
  onEdit: (l: LetterRow) => void;
}) {
  const letter = rows.find((l) => l.id === id) ?? null;

  return (
    <Drawer open={Boolean(id)} onClose={onClose} title={letter ? letter.number : "Detail surat"}>
      {letter ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[letter.status]}>{STATUS_LABEL[letter.status]}</Badge>
            <Badge tone="primary">RT {letter.rt.number}</Badge>
            {letter.notifyReadyAt && <Badge tone="success">Notifikasi terkirim</Badge>}
          </div>
          <div className="rounded-xl border border-line p-4 text-[12.5px]">
            <Row label="Pemohon" value={letter.resident.name} />
            <Row label="NIK" value={<span className="font-mono">{letter.resident.nik}</span>} />
            <Row label="Jenis surat" value={TYPE_LABEL[letter.type]} />
            <Row label="Keperluan" value={letter.purpose} />
            <Row label="Diajukan" value={formatDateTime(letter.createdAt)} />
            <Row label="Diproses oleh" value={letter.processedBy?.name ?? "-"} />
            {letter.finishedAt && <Row label="Selesai" value={formatDateTime(letter.finishedAt)} />}
            {letter.notes && <Row label="Catatan" value={letter.notes} />}
          </div>
          <div className="flex gap-2">
            <a
              href={`/surat/${letter.id}/cetak`}
              target="_blank"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px] font-medium transition-colors hover:bg-surface-muted"
            >
              <Printer className="h-4 w-4" />
              Cetak surat
            </a>
            <Button className="flex-1" onClick={() => onEdit(letter)}>
              <Pencil className="h-4 w-4" />
              Ubah data
            </Button>
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2 last:border-0">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
