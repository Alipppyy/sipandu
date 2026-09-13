"use client";

import * as React from "react";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Pin,
  PinOff,
  Send,
  Users,
  Radio,
} from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import {
  Card,

  Button,
  Badge,
  SearchInput,
  Select,
  Input,
  Field,
  Textarea,

  Avatar,
} from "@/components/ui/primitives";
import { Modal, ConfirmDialog, Drawer } from "@/components/ui/overlay";
import { EmptyState, Pagination } from "@/components/ui/states";
import { useCollection } from "@/hooks/use-collection";
import { useDebounce } from "@/hooks/use-debounce";
import { post, patch } from "@/lib/client/api";
import { toast } from "sonner";
import { formatDateTime, formatRelative } from "@/lib/utils";

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  category: string;
  pinned: boolean;
  published: boolean;
  publishedAt: string;
  broadcastAt: string | null;
  broadcastCount: number;
  author: { name: string; avatarColor: string } | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  PENTING: "Penting",
  KEGIATAN: "Kegiatan",
  KEUANGAN: "Keuangan",
  UMUM: "Umum",
};

const CATEGORY_TONE: Record<string, "danger" | "primary" | "warning" | "neutral"> = {
  PENTING: "danger",
  KEGIATAN: "primary",
  KEUANGAN: "warning",
  UMUM: "neutral",
};

export default function PengumumanPage() {
  const [search, setSearch] = React.useState("");
  const q = useDebounce(search, 300);
  const [category, setCategory] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AnnouncementRow | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<AnnouncementRow | null>(null);
  const [broadcasting, setBroadcasting] = React.useState<string | null>(null);

  const col = useCollection<AnnouncementRow>({
    path: "/api/announcements",
    query: { q, category, page, perPage: 12 },
  });

  React.useEffect(() => setPage(1), [q, category]);

  async function togglePin(a: AnnouncementRow) {
    await col.update(
      a.id,
      { pinned: !a.pinned } as never,
      a.pinned ? "Pengumuman dilepas dari pin" : "Pengumuman disematkan",
      (row) => ({ ...row, pinned: !row.pinned }),
    );
  }

  async function togglePublish(a: AnnouncementRow) {
    await col.update(
      a.id,
      { published: !a.published } as never,
      a.published ? "Pengumuman disembunyikan" : "Pengumuman dipublikasikan",
      (row) => ({ ...row, published: !row.published }),
    );
  }

  async function broadcast(a: AnnouncementRow) {
    setBroadcasting(a.id);
    try {
      const res = await post<{ queued: number }>(`/api/announcements/${a.id}/broadcast`, {
        target: "semua",
        role: "kepala",
      });
      toast.success(`Pengumuman disiarkan ke ${res.queued} warga melalui WhatsApp`);
      col.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyiarkan pengumuman");
    } finally {
      setBroadcasting(null);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Pengumuman"
        description="Siarkan informasi penting ke warga — sekali klik langsung terkirim ke WhatsApp."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Buat pengumuman
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari judul atau isi pengumuman…"
            className="sm:max-w-md"
          />
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:max-w-xs">
            <option value="">Semua kategori</option>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {col.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="space-y-3 p-5">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-3 w-2/3" />
              <div className="skeleton h-3 w-1/2" />
            </Card>
          ))}
        </div>
      ) : col.rows.length ? (
        <div className="space-y-4">
          {col.rows.map((a) => (
            <AnnouncementCard
              key={a.id}
              a={a}
              onOpen={() => setDetailId(a.id)}
              onEdit={() => {
                setEditing(a);
                setFormOpen(true);
              }}
              onDelete={() => setDeleting(a)}
              onPin={() => togglePin(a)}
              onPublish={() => togglePublish(a)}
              onBroadcast={() => broadcast(a)}
              broadcasting={broadcasting === a.id}
            />
          ))}
          <Card>
            <Pagination
              page={col.meta.page}
              totalPages={col.meta.totalPages}
              total={col.meta.total}
              perPage={col.meta.perPage}
              onPage={setPage}
              isLoading={col.isValidating}
            />
          </Card>
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Megaphone className="h-6 w-6" />}
            title={search || category ? "Pengumuman tidak ditemukan" : "Belum ada pengumuman"}
            description={
              search || category
                ? "Ubah kata kunci atau kategori."
                : "Buat pengumuman untuk memberi tahu warga tentang kegiatan, keuangan, atau informasi penting."
            }
            action={
              !search &&
              !category && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Buat pengumuman
                </Button>
              )
            }
          />
        </Card>
      )}

      <AnnouncementFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        announcement={editing}
        onSaved={col.refresh}
      />
      <AnnouncementDetail id={detailId} onClose={() => setDetailId(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await col.remove(deleting.id, `Pengumuman "${deleting.title}" dihapus`);
          setDeleting(null);
        }}
        title="Hapus pengumuman"
        message={
          <>
            Hapus pengumuman <strong>{deleting?.title}</strong>? Pengumuman akan hilang dari portal warga.
          </>
        }
        confirmLabel="Hapus pengumuman"
      />
    </div>
  );
}

function AnnouncementCard({
  a,
  onOpen,
  onEdit,
  onDelete,
  onPin,
  onPublish,
  onBroadcast,
  broadcasting,
}: {
  a: AnnouncementRow;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onPublish: () => void;
  onBroadcast: () => void;
  broadcasting: boolean;
}) {
  return (
    <Card className={`overflow-hidden transition-shadow hover:shadow-md ${a.pinned ? "ring-1 ring-primary/30" : ""}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Badge tone={CATEGORY_TONE[a.category] ?? "neutral"}>{CATEGORY_LABEL[a.category]}</Badge>
              {a.pinned && (
                <Badge tone="primary">
                  <Pin className="h-3 w-3" /> Disematkan
                </Badge>
              )}
              {!a.published && <Badge tone="neutral">Draft</Badge>}
            </div>
            <button onClick={onOpen} className="text-left">
              <h3 className="text-[15px] font-semibold leading-snug tracking-tight hover:text-primary">
                {a.title}
              </h3>
            </button>
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">{a.body}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted">
              {a.author && (
                <span className="flex items-center gap-1.5">
                  <Avatar name={a.author.name} size="xs" color={a.author.avatarColor} />
                  {a.author.name}
                </span>
              )}
              <span>{formatRelative(a.publishedAt)}</span>
              {a.broadcastAt && (
                <span className="flex items-center gap-1 text-success">
                  <Radio className="h-3 w-3" />
                  Disiarkan ke {a.broadcastCount} warga
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
          <Button size="sm" onClick={onBroadcast} loading={broadcasting}>
            {!broadcasting && <Send className="h-3.5 w-3.5" />}
            Siarkan ke WhatsApp
          </Button>
          <Button size="sm" variant="secondary" onClick={onOpen}>
            <Eye className="h-3.5 w-3.5" />
            Baca
          </Button>
          <Button size="sm" variant="ghost" onClick={onPin} title={a.pinned ? "Lepas pin" : "Sematkan"}>
            {a.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={onPublish} title={a.published ? "Sembunyikan" : "Publikasikan"}>
            <Users className="h-3.5 w-3.5" />
            {a.published ? "Sembunyikan" : "Publikasikan"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="text-danger" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ── Form pengumuman ────────────────────────────────────── */

function AnnouncementFormModal({
  open,
  onClose,
  announcement,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  announcement: AnnouncementRow | null;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState({
    title: "",
    body: "",
    category: "UMUM",
    pinned: false,
    published: true,
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      announcement
        ? {
            title: announcement.title,
            body: announcement.body,
            category: announcement.category,
            pinned: announcement.pinned,
            published: announcement.published,
          }
        : { title: "", body: "", category: "UMUM", pinned: false, published: true },
    );
  }, [open, announcement]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (announcement) await patch(`/api/announcements/${announcement.id}`, form);
      else await post("/api/announcements", form);
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
      title={announcement ? "Ubah pengumuman" : "Buat pengumuman"}
      description="Pengumuman tampil di portal warga dan dapat disiarkan ke WhatsApp."
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
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
            {error}
          </div>
        )}
        <Field label="Judul pengumuman" required>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kategori">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-4 pb-1">
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                className="h-4 w-4 rounded border-line-strong accent-[var(--primary)]"
              />
              Sematkan
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
                className="h-4 w-4 rounded border-line-strong accent-[var(--primary)]"
              />
              Publikasikan
            </label>
          </div>
        </div>
        <Field label="Isi pengumuman" required hint="Gunakan baris baru untuk memisahkan paragraf.">
          <Textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={9}
            required
            className="leading-relaxed"
          />
        </Field>
        <div className="rounded-xl border border-line bg-surface-muted/40 p-3.5">
          <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted">Pratinjau WhatsApp</p>
          <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap text-muted">
            📢 <strong>{form.title || "Judul pengumuman"}</strong>
            {"\n\n"}
            {form.body.slice(0, 240) || "Isi pengumuman akan tampil di sini…"}
            {form.body.length > 240 && "…"}
          </p>
        </div>
      </form>
    </Modal>
  );
}

/* ── Detail ─────────────────────────────────────────────── */

function AnnouncementDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  // ambil dari koleksi agar konsisten dengan daftar yang tampil
  const list = useCollection<AnnouncementRow>({
    path: "/api/announcements",
    query: { perPage: 100 },
    silent: true,
  });
  const item = list.rows.find((x) => x.id === id) ?? null;

  return (
    <Drawer
      open={Boolean(id)}
      onClose={onClose}
      title={item?.title ?? "Pengumuman"}
      subtitle={item ? `${CATEGORY_LABEL[item.category]} · ${formatDateTime(item.publishedAt)}` : undefined}
    >
      {item ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={CATEGORY_TONE[item.category]}>{CATEGORY_LABEL[item.category]}</Badge>
            {item.pinned && <Badge tone="primary">Disematkan</Badge>}
            {item.broadcastAt && (
              <Badge tone="success">
                Disiarkan ke {item.broadcastCount} warga · {formatRelative(item.broadcastAt)}
              </Badge>
            )}
          </div>
          <div className="rounded-xl border border-line bg-surface-muted/40 p-4">
            <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{item.body}</p>
          </div>
          {item.author && (
            <div className="flex items-center gap-2.5">
              <Avatar name={item.author.name} size="sm" color={item.author.avatarColor} />
              <div>
                <p className="text-[12.5px] font-medium">{item.author.name}</p>
                <p className="text-[11px] text-muted">Penulis</p>
              </div>
            </div>
          )}
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
