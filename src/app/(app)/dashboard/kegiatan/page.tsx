"use client";

import * as React from "react";
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  Eye,
  MapPin,
  UserCheck,
  Users,
  Bell,


  X,
  UserPlus,
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
import { Modal, ConfirmDialog, Drawer } from "@/components/ui/overlay";
import { useCollection, useResource } from "@/hooks/use-collection";
import { useDebounce } from "@/hooks/use-debounce";
import { post, patch, del, api } from "@/lib/client/api";
import { formatDate, formatTime, formatDateTime, toISODateTimeLocal } from "@/lib/utils";
import { useSessionUser } from "@/components/session-provider";

type ActivityRow = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  location: string;
  startsAt: string;
  endsAt: string;
  picName: string;
  picPhone: string | null;
  status: string;
  reminderSentAt: string | null;
  notes: string | null;
  rtId: string | null;
  rt: { number: string; areaName: string } | null;
  _count: { assignments: number };
};

type ActivityDetail = ActivityRow & {
  assignments: {
    id: string;
    role: string;
    status: string;
    note: string | null;
    resident: { id: string; name: string; phone: string | null; whatsapp: string | null; familyRole: string };
  }[];
};

const TYPE_LABEL: Record<string, string> = {
  KERJA_BAKTI: "Kerja Bakti",
  RONDA: "Ronda",
  RAPAT: "Rapat",
  PENGAJIAN: "Pengajian",
  POSYANDU: "Posyandu",
  LAINNYA: "Lainnya",
};

const TYPE_TONE: Record<string, "primary" | "success" | "info" | "warning" | "neutral"> = {
  KERJA_BAKTI: "primary",
  RONDA: "info",
  RAPAT: "warning",
  PENGAJIAN: "success",
  POSYANDU: "success",
  LAINNYA: "neutral",
};

const STATUS_TONE: Record<string, "primary" | "success" | "info" | "warning" | "danger" | "neutral"> = {
  TERENCANA: "primary",
  BERLANGSUNG: "info",
  SELESAI: "success",
  DIBATALKAN: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  TERENCANA: "Terencana",
  BERLANGSUNG: "Berlangsung",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

export default function KegiatanPage() {
  const { user } = useSessionUser();
  const [search, setSearch] = React.useState("");
  const q = useDebounce(search, 300);
  const [type, setType] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [range, setRange] = React.useState<"semua" | "mendatang" | "lalu">("semua");
  const [page, setPage] = React.useState(1);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ActivityRow | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<ActivityRow | null>(null);

  const col = useCollection<ActivityRow>({
    path: "/api/activities",
    query: { q, type, status, range: range === "semua" ? "" : range, page, perPage: 12 },
  });

  React.useEffect(() => setPage(1), [q, type, status, range]);

  const canEdit = user.role === "ADMIN" || user.role === "OPERATOR" || user.role === "KETUA_RT";

  const columns: Column<ActivityRow>[] = [
    {
      key: "waktu",
      header: "Waktu",
      cell: (a) => {
        const d = new Date(a.startsAt);
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-surface-muted">
              <span className="text-[14px] font-bold leading-none tabular-nums">{d.getDate()}</span>
              <span className="mt-0.5 text-[10px] uppercase text-muted">
                {d.toLocaleString("id-ID", { month: "short" })}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium">{formatTime(a.startsAt)} WIB</p>
              <p className="truncate text-[11px] text-muted">s/d {formatTime(a.endsAt)}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "kegiatan",
      header: "Kegiatan",
      cell: (a) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{a.title}</p>
            <Badge tone={TYPE_TONE[a.type] ?? "neutral"}>{TYPE_LABEL[a.type] ?? a.type}</Badge>
          </div>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] text-muted">
            <MapPin className="h-3 w-3" />
            {a.location}
          </p>
        </div>
      ),
    },
    {
      key: "rt",
      header: "Wilayah",
      className: "hidden lg:table-cell",
      cell: (a) => <Badge tone="primary">{a.rt ? `RT ${a.rt.number}` : "RW"}</Badge>,
    },
    {
      key: "petugas",
      header: "Petugas",
      className: "hidden md:table-cell",
      cell: (a) => (
        <span className="flex items-center gap-1.5 text-[12.5px]">
          <Users className="h-3 w-3 text-muted" />
          {a._count.assignments}
        </span>
      ),
    },
    {
      key: "pengingat",
      header: "Pengingat",
      className: "hidden xl:table-cell",
      cell: (a) =>
        a.reminderSentAt ? (
          <span className="flex items-center gap-1.5 text-[11.5px] text-success">
            <Bell className="h-3 w-3" />
            {formatDate(a.reminderSentAt)}
          </span>
        ) : (
          <span className="text-[11.5px] text-muted">Belum dikirim</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (a) => <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>{STATUS_LABEL[a.status] ?? a.status}</Badge>,
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Kegiatan & Jadwal"
        description="Kerja bakti, ronda, rapat, dan pengajian — warga diingatkan otomatis melalui WhatsApp."
        actions={
          canEdit && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Buat kegiatan
            </Button>
          )
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Cari kegiatan, lokasi, atau penanggung jawab…"
              className="sm:max-w-sm"
            />
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Semua jenis</option>
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Semua status</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: "semua", label: "Semua" },
              { value: "mendatang", label: "Akan datang" },
              { value: "lalu", label: "Sudah lewat" },
            ]}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title={`Daftar kegiatan (${col.meta.total})`} description="Klik baris untuk mengelola petugas" />
        <DataTable
          columns={columns}
          rows={col.rows}
          loading={col.isLoading}
          error={col.error}
          onRetry={col.refresh}
          onRowClick={(a) => setDetailId(a.id)}
          skeletonRows={5}
          rowActions={(a) => (
            <RowActions>
              <ActionItem icon={<Eye className="h-4 w-4" />} onClick={() => setDetailId(a.id)}>
                Kelola petugas
              </ActionItem>
              {canEdit && (
                <>
                  <ActionItem
                    icon={<Pencil className="h-4 w-4" />}
                    onClick={() => {
                      setEditing(a);
                      setFormOpen(true);
                    }}
                  >
                    Ubah jadwal
                  </ActionItem>
                  <ActionItem
                    icon={<Bell className="h-4 w-4" />}
                    onClick={() =>
                      col.action(
                        `/api/activities/${a.id}/reminder`,
                        undefined,
                        {
                          successMessage:
                            "Pengingat dijadwalkan ulang — akan dikirim pada siklus penjadwal berikutnya",
                          optimistic: (cur) => ({
                            ...cur,
                            data: cur.data.map((x) =>
                              x.id === a.id ? { ...x, reminderSentAt: null } : x,
                            ),
                          }),
                        },
                      )
                    }
                  >
                    Kirim ulang pengingat
                  </ActionItem>
                  <ActionItem icon={<Trash2 className="h-4 w-4" />} destructive onClick={() => setDeleting(a)}>
                    Hapus
                  </ActionItem>
                </>
              )}
            </RowActions>
          )}
          renderCard={(a) => (
            <div className="pr-8">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13.5px] font-medium">{a.title}</p>
                <Badge tone={TYPE_TONE[a.type] ?? "neutral"}>{TYPE_LABEL[a.type]}</Badge>
              </div>
              <p className="mt-0.5 text-[11.5px] text-muted">
                {formatDate(a.startsAt, true)} · {formatTime(a.startsAt)} WIB
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                <Badge tone="primary">{a.rt ? `RT ${a.rt.number}` : "RW"}</Badge>
                <span className="text-[11px] text-muted">{a._count.assignments} petugas</span>
              </div>
            </div>
          )}
          empty={
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title={search || type || status ? "Kegiatan tidak ditemukan" : "Belum ada kegiatan"}
              description={
                search || type || status
                  ? "Ubah filter untuk melihat jadwal lain."
                  : "Buat jadwal kerja bakti atau ronda, lalu tugaskan petugas dan kirim pengingat ke WhatsApp warga."
              }
              action={
                !search &&
                !type &&
                !status &&
                canEdit && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Buat kegiatan
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

      <ActivityFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        activity={editing}
        onSaved={col.refresh}
      />
      <ActivityDrawer id={detailId} onClose={() => setDetailId(null)} onChanged={col.refresh} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await col.remove(deleting.id, `Kegiatan "${deleting.title}" dihapus`);
          setDeleting(null);
        }}
        title="Hapus kegiatan"
        message={
          <>
            Hapus kegiatan <strong>{deleting?.title}</strong>? Daftar kehadiran petugas juga akan ikut terhapus.
          </>
        }
        confirmLabel="Hapus kegiatan"
      />
    </div>
  );
}

/* ── Form kegiatan ──────────────────────────────────────── */

function ActivityFormModal({
  open,
  onClose,
  activity,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  activity?: ActivityRow | null;
  onSaved: () => void;
}) {
  const { data: rtData } = useResource<{ data: { id: string; number: string; areaName: string }[] }>(
    open ? "/api/rt" : null,
  );
  const empty = {
    title: "",
    type: "KERJA_BAKTI",
    description: "",
    location: "Balai RW 05",
    startsAt: "",
    endsAt: "",
    rtId: "",
    picName: "Ketua RW",
    picPhone: "",
    status: "TERENCANA",
    notes: "",
    notify: true,
  };
  const [form, setForm] = React.useState<Record<string, unknown>>(empty);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (activity) {
      setForm({
        title: activity.title,
        type: activity.type,
        description: activity.description ?? "",
        location: activity.location,
        startsAt: toISODateTimeLocal(activity.startsAt),
        endsAt: toISODateTimeLocal(activity.endsAt),
        rtId: activity.rtId ?? "",
        picName: activity.picName,
        picPhone: activity.picPhone ?? "",
        status: activity.status,
        notes: activity.notes ?? "",
        notify: false,
      });
    } else {
      const start = new Date();
      start.setDate(start.getDate() + 3);
      start.setHours(6, 0, 0, 0);
      const end = new Date(start);
      end.setHours(9, 0, 0, 0);
      setForm({ ...empty, startsAt: toISODateTimeLocal(start), endsAt: toISODateTimeLocal(end) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activity]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        rtId: (form.rtId as string) || null,
        picPhone: (form.picPhone as string) || null,
        description: (form.description as string) || null,
        notes: (form.notes as string) || null,
      };
      if (activity) await patch(`/api/activities/${activity.id}`, payload);
      else await post("/api/activities", payload);
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
      size="lg"
      title={activity ? "Ubah kegiatan" : "Buat kegiatan baru"}
      description="Pengingat otomatis dikirim menjelang waktu pelaksanaan."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={submit} loading={saving}>
            {activity ? "Simpan perubahan" : "Buat kegiatan"}
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
        <Field label="Nama kegiatan" required>
          <Input
            value={form.title as string}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Kerja Bakti Akbar Bulanan"
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jenis kegiatan" required>
            <Select value={form.type as string} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Wilayah" hint="Kosongkan untuk kegiatan tingkat RW">
            <Select value={form.rtId as string} onChange={(e) => setForm({ ...form, rtId: e.target.value })}>
              <option value="">Seluruh RW (umum)</option>
              {(rtData?.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  RT {r.number} — {r.areaName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mulai" required>
            <Input
              type="datetime-local"
              value={form.startsAt as string}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              required
            />
          </Field>
          <Field label="Selesai" required>
            <Input
              type="datetime-local"
              value={form.endsAt as string}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              required
            />
          </Field>
          <Field label="Lokasi" required>
            <Input
              value={form.location as string}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              required
            />
          </Field>
          <Field label="Status">
            <Select value={form.status as string} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Penanggung jawab">
            <Input
              value={form.picName as string}
              onChange={(e) => setForm({ ...form, picName: e.target.value })}
            />
          </Field>
          <Field label="Kontak penanggung jawab">
            <Input
              value={form.picPhone as string}
              onChange={(e) => setForm({ ...form, picPhone: e.target.value })}
              placeholder="0812…"
            />
          </Field>
        </div>
        <Field label="Keterangan">
          <Textarea
            value={(form.description as string) ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Rincian kegiatan, perlengkapan yang dibawa, dsb."
          />
        </Field>

        {!activity && (
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface-muted/40 px-4 py-3">
            <div>
              <p className="text-[13px] font-medium">Kirim pengingat WhatsApp</p>
              <p className="text-[11.5px] text-muted">
                Penjadwal akan mengirim pengingat ke warga menjelang kegiatan
              </p>
            </div>
            <Switch checked={Boolean(form.notify)} onChange={(v) => setForm({ ...form, notify: v })} />
          </div>
        )}
      </form>
    </Modal>
  );
}

/* ── Drawer detail & kehadiran ──────────────────────────── */

const ATTENDANCE: { value: string; label: string; tone: "success" | "info" | "danger" | "neutral" }[] = [
  { value: "HADIR", label: "Hadir", tone: "success" },
  { value: "IZIN", label: "Izin", tone: "info" },
  { value: "ALPHA", label: "Alpha", tone: "danger" },
  { value: "BELUM_KONFIRM", label: "Belum", tone: "neutral" },
];

function ActivityDrawer({
  id,
  onClose,
  onChanged,
}: {
  id: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data, isLoading, refresh } = useResource<ActivityDetail>(id ? `/api/activities/${id}` : null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [role, setRole] = React.useState("Petugas");
  const [filter, setFilter] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const { data: residentData } = useResource<{
    data: { id: string; name: string; rtId: string; familyRole: string }[];
  }>(addOpen ? `/api/residents?perPage=200&status=AKTIF&q=${encodeURIComponent(filter)}` : null);

  const hadir = data?.assignments.filter((a) => a.status === "HADIR").length ?? 0;
  const total = data?.assignments.length ?? 0;

  async function setAttendance(residentId: string, status: string) {
    if (!data) return;
    // optimistic: perbarui cache lokal dulu
    await api("/api/activities/" + data.id + "/attendance", {
      method: "PATCH",
      body: JSON.stringify({ residentId, status }),
    }).catch(() => null);
    refresh();
    onChanged();
  }

  async function addAssignees() {
    if (!data || !selected.length) return;
    setSaving(true);
    try {
      await post(`/api/activities/${data.id}/attendance`, { residentIds: selected, role });
      setSelected([]);
      setAddOpen(false);
      refresh();
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function removeAssignee(residentId: string) {
    if (!data) return;
    await del(`/api/activities/${data.id}/attendance?residentId=${residentId}`).catch(() => null);
    refresh();
    onChanged();
  }

  return (
    <Drawer
      open={Boolean(id)}
      onClose={onClose}
      title={data?.title ?? "Detail kegiatan"}
      subtitle={
        data
          ? `${formatDateTime(data.startsAt)} → ${formatTime(data.endsAt)} WIB${
              data.rt ? ` · RT ${data.rt.number}` : " · Seluruh RW"
            }`
          : undefined
      }
      width="max-w-2xl"
    >
      {isLoading || !data ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-4 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={TYPE_TONE[data.type] ?? "neutral"}>{TYPE_LABEL[data.type] ?? data.type}</Badge>
            <Badge tone={STATUS_TONE[data.status]}>{STATUS_LABEL[data.status]}</Badge>
            {data.rt && <Badge tone="primary">RT {data.rt.number}</Badge>}
            {data.reminderSentAt ? (
              <Badge tone="success">
                <Bell className="h-3 w-3" /> Pengingat {formatDate(data.reminderSentAt)}
              </Badge>
            ) : (
              <Badge tone="warning">Pengingat belum dikirim</Badge>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line p-3">
              <p className="text-[11.5px] text-muted">Lokasi</p>
              <p className="text-[13px] font-medium">{data.location}</p>
            </div>
            <div className="rounded-xl border border-line p-3">
              <p className="text-[11.5px] text-muted">Penanggung jawab</p>
              <p className="text-[13px] font-medium">{data.picName}</p>
            </div>
          </div>

          {data.description && (
            <div className="rounded-xl border border-line bg-surface-muted/40 p-3.5">
              <p className="text-[12.5px] leading-relaxed text-muted">{data.description}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold">
              <UserCheck className="h-4 w-4" />
              Daftar petugas ({hadir}/{total} hadir)
            </p>
            <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              Tugaskan warga
            </Button>
          </div>

          {addOpen && (
            <div className="animate-fade-in space-y-2.5 rounded-xl border border-line bg-surface-muted/40 p-3.5">
              <div className="grid gap-2.5 sm:grid-cols-[1fr_auto_auto]">
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Cari nama warga…"
                />
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Peran" className="sm:w-36" />
                <Button size="sm" onClick={addAssignees} loading={saving} disabled={!selected.length}>
                  Tambahkan
                </Button>
              </div>
              <div className="max-h-52 space-y-1 overflow-y-auto scrollbar-thin">
                {(residentData?.data ?? [])
                  .filter((r) => !data.assignments.some((a) => a.resident.id === r.id))
                  .slice(0, 40)
                  .map((r) => (
                    <label
                      key={r.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-surface"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(r.id)}
                        onChange={(e) =>
                          setSelected((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))
                        }
                        className="h-4 w-4 rounded border-line-strong accent-[var(--primary)]"
                      />
                      <Avatar name={r.name} size="xs" color="teal" />
                      <span className="flex-1 truncate text-[12.5px]">{r.name}</span>
                    </label>
                  ))}
              </div>
            </div>
          )}

          {data.assignments.length ? (
            <div className="space-y-1.5">
              {data.assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5"
                >
                  <Avatar name={a.resident.name} size="sm" color="teal" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{a.resident.name}</p>
                    <p className="text-[11px] text-muted">{a.role}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {ATTENDANCE.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setAttendance(a.resident.id, s.value)}
                        className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-all ${
                          a.status === s.value
                            ? s.value === "HADIR"
                              ? "border-success bg-success-soft text-success"
                              : s.value === "IZIN"
                                ? "border-info bg-info-soft text-info"
                                : s.value === "ALPHA"
                                  ? "border-danger bg-danger-soft text-danger"
                                  : "border-line bg-surface-muted text-foreground"
                            : "border-line text-muted hover:bg-surface-muted"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                    <button
                      onClick={() => removeAssignee(a.resident.id)}
                      className="rounded-lg p-1 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                      aria-label="Hapus petugas"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="Belum ada petugas"
              description="Tugaskan warga agar mereka menerima pengingat kegiatan melalui WhatsApp."
              compact
            />
          )}
        </div>
      )}
    </Drawer>
  );
}
