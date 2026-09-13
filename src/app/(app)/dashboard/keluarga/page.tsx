"use client";

import * as React from "react";
import { UsersRound, Plus, Pencil, Trash2, Eye, Home, MapPin, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardHeader, Button, Badge, SearchInput, Select, Input, Avatar, Field } from "@/components/ui/primitives";
import { DataTable, RowActions, ActionItem, type Column } from "@/components/ui/table";
import { EmptyState, Pagination } from "@/components/ui/states";
import { Modal, ConfirmDialog, Drawer } from "@/components/ui/overlay";
import { useCollection, useResource } from "@/hooks/use-collection";
import { useDebounce } from "@/hooks/use-debounce";
import { post, patch } from "@/lib/client/api";
import { formatCurrency, formatDate, formatPhoneDisplay } from "@/lib/utils";

type FamilyRow = {
  id: string;
  kkNumber: string;
  headName: string;
  address: string;
  block: string | null;
  houseNumber: string | null;
  rtId: string;
  economicStatus: string;
  head: { id: string; name: string; phone: string | null; whatsapp: string | null } | null;
  rt: { number: string; areaName: string };
  _count: { members: number; bills: number };
};

type FamilyDetail = FamilyRow & {
  members: {
    id: string;
    name: string;
    familyRole: string;
    gender: string;
    birthDate: string;
    occupation: string;
    phone: string | null;
  }[];
  bills: {
    id: string;
    billNumber: string;
    periodMonth: number;
    periodYear: number;
    amount: number;
    status: string;
    dueDate: string;
    paidAt: string | null;
  }[];
};

export default function KeluargaPage() {
  const [search, setSearch] = React.useState("");
  const q = useDebounce(search, 300);
  const [rtId, setRtId] = React.useState("");
  const [page, setPage] = React.useState(1);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FamilyRow | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<FamilyRow | null>(null);

  const col = useCollection<FamilyRow>({
    path: "/api/families",
    query: { q, rtId, page, perPage: 12 },
  });
  const { data: rtData } = useResource<{ data: { id: string; number: string; areaName: string }[] }>("/api/rt");

  React.useEffect(() => setPage(1), [q, rtId]);

  const columns: Column<FamilyRow>[] = [
    {
      key: "kk",
      header: "Kartu Keluarga",
      cell: (f) => (
        <div className="flex items-center gap-3">
          <Avatar name={f.headName} size="sm" color="emerald" />
          <div className="min-w-0">
            <p className="truncate font-medium">{f.headName}</p>
            <p className="truncate font-mono text-[11px] text-muted">KK {f.kkNumber}</p>
          </div>
        </div>
      ),
    },
    {
      key: "alamat",
      header: "Alamat",
      className: "hidden lg:table-cell",
      cell: (f) => (
        <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{f.address}</span>
        </span>
      ),
    },
    { key: "rt", header: "RT", cell: (f) => <Badge tone="primary">RT {f.rt.number}</Badge> },
    {
      key: "anggota",
      header: "Anggota",
      className: "hidden md:table-cell",
      cell: (f) => (
        <span className="flex items-center gap-1.5 text-[12.5px]">
          <Home className="h-3 w-3 text-muted" />
          {f._count.members} orang
        </span>
      ),
    },
    {
      key: "ekonomi",
      header: "Status ekonomi",
      className: "hidden xl:table-cell",
      cell: (f) => (
        <Badge
          tone={
            f.economicStatus === "MAMPU" ? "success" : f.economicStatus === "MENENGAH" ? "info" : "warning"
          }
        >
          {f.economicStatus.replace("_", " ").toLowerCase()}
        </Badge>
      ),
    },
    {
      key: "kontak",
      header: "Kontak",
      className: "hidden xl:table-cell",
      cell: (f) => <span className="text-[12.5px] text-muted">{formatPhoneDisplay(f.head?.whatsapp ?? f.head?.phone)}</span>,
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Kartu Keluarga"
        description="Data KK menjadi dasar penagihan iuran kebersihan bulanan."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Tambah KK
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari nama kepala keluarga, no. KK, atau alamat…"
            className="sm:max-w-md"
          />
          <Select value={rtId} onChange={(e) => setRtId(e.target.value)} className="sm:max-w-xs">
            <option value="">Semua RT</option>
            {(rtData?.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                RT {r.number} — {r.areaName}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={`Daftar kartu keluarga (${col.meta.total})`}
          description="Klik baris untuk melihat anggota & riwayat iuran"
        />
        <DataTable
          columns={columns}
          rows={col.rows}
          loading={col.isLoading}
          error={col.error}
          onRetry={col.refresh}
          onRowClick={(f) => setDetailId(f.id)}
          skeletonRows={6}
          rowActions={(f) => (
            <RowActions>
              <ActionItem icon={<Eye className="h-4 w-4" />} onClick={() => setDetailId(f.id)}>
                Lihat anggota
              </ActionItem>
              <ActionItem
                icon={<Pencil className="h-4 w-4" />}
                onClick={() => {
                  setEditing(f);
                  setFormOpen(true);
                }}
              >
                Ubah data
              </ActionItem>
              <ActionItem icon={<Trash2 className="h-4 w-4" />} destructive onClick={() => setDeleting(f)}>
                Hapus
              </ActionItem>
            </RowActions>
          )}
          renderCard={(f) => (
            <div className="pr-8">
              <p className="truncate text-[13.5px] font-medium">{f.headName}</p>
              <p className="text-[11.5px] text-muted">KK {f.kkNumber}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge tone="primary">RT {f.rt.number}</Badge>
                <Badge tone="neutral">{f._count.members} anggota</Badge>
              </div>
            </div>
          )}
          empty={
            <EmptyState
              icon={<UsersRound className="h-6 w-6" />}
              title={search ? "KK tidak ditemukan" : "Belum ada kartu keluarga"}
              description={
                search ? "Coba kata kunci lain." : "Tambahkan kartu keluarga untuk mulai menata data warga."
              }
              action={
                !search && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Tambah KK
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

      <FamilyFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        family={editing}
        onSaved={col.refresh}
      />
      <FamilyDetailDrawer id={detailId} onClose={() => setDetailId(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await col.remove(deleting.id, `KK ${deleting.headName} dihapus`);
          setDeleting(null);
        }}
        title="Hapus kartu keluarga"
        message={
          <>
            Hapus KK <strong>{deleting?.headName}</strong>? Anggota keluarga tidak ikut terhapus, tetapi akan dilepas
            dari KK ini.
          </>
        }
        confirmLabel="Hapus KK"
      />
    </div>
  );
}

/* ── Form KK ────────────────────────────────────────────── */

function FamilyFormModal({
  open,
  onClose,
  family,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  family?: FamilyRow | null;
  onSaved: () => void;
}) {
  const { data: rtData } = useResource<{ data: { id: string; number: string; areaName: string }[] }>(
    open ? "/api/rt" : null,
  );
  const [form, setForm] = React.useState({
    kkNumber: "",
    headName: "",
    address: "",
    rtId: "",
    block: "",
    houseNumber: "",
    economicStatus: "MENENGAH",
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (family) {
      setForm({
        kkNumber: family.kkNumber,
        headName: family.headName,
        address: family.address,
        rtId: family.rtId,
        block: family.block ?? "",
        houseNumber: family.houseNumber ?? "",
        economicStatus: family.economicStatus,
      });
    } else {
      setForm({
        kkNumber: "",
        headName: "",
        address: "",
        rtId: rtData?.data?.[0]?.id ?? "",
        block: "",
        houseNumber: "",
        economicStatus: "MENENGAH",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, family]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (family) await patch(`/api/families/${family.id}`, form);
      else await post("/api/families", form);
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
      title={family ? "Ubah kartu keluarga" : "Tambah kartu keluarga"}
      description="Nomor KK harus unik dan terdiri dari 16 digit."
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="No. Kartu Keluarga" required>
            <Input
              value={form.kkNumber}
              onChange={(e) => setForm({ ...form, kkNumber: e.target.value.replace(/\D/g, "").slice(0, 16) })}
              placeholder="3276xxxxxxxxxxxx"
              maxLength={16}
              required
            />
          </Field>
          <Field label="Nama kepala keluarga" required>
            <Input value={form.headName} onChange={(e) => setForm({ ...form, headName: e.target.value })} required />
          </Field>
          <Field label="RT / wilayah" required>
            <Select value={form.rtId} onChange={(e) => setForm({ ...form, rtId: e.target.value })} required>
              <option value="">Pilih RT</option>
              {(rtData?.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  RT {r.number} — {r.areaName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status ekonomi">
            <Select
              value={form.economicStatus}
              onChange={(e) => setForm({ ...form, economicStatus: e.target.value })}
            >
              <option value="MAMPU">Mampu</option>
              <option value="MENENGAH">Menengah</option>
              <option value="KURANG_MAMPU">Kurang mampu</option>
            </Select>
          </Field>
        </div>
        <Field label="Alamat" required>
          <Input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Jl. Melati No. 12"
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Blok / gang">
            <Input value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value })} />
          </Field>
          <Field label="No. rumah">
            <Input value={form.houseNumber} onChange={(e) => setForm({ ...form, houseNumber: e.target.value })} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

/* ── Detail KK ──────────────────────────────────────────── */

function FamilyDetailDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isLoading } = useResource<FamilyDetail>(id ? `/api/families/${id}` : null);

  return (
    <Drawer
      open={Boolean(id)}
      onClose={onClose}
      title={data ? `KK ${data.headName}` : "Detail KK"}
      subtitle={data ? `No. ${data.kkNumber} · RT ${data.rt.number} — ${data.rt.areaName}` : undefined}
    >
      {isLoading || !data ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-4 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-line bg-surface-muted/40 p-4">
            <p className="text-[12.5px] text-muted">Alamat</p>
            <p className="text-[13.5px] font-medium">{data.address}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="primary">RT {data.rt.number}</Badge>
              <Badge tone="neutral">{data.members.length} anggota</Badge>
              <Badge tone={data.economicStatus === "KURANG_MAMPU" ? "warning" : "success"}>
                {data.economicStatus.replace("_", " ").toLowerCase()}
              </Badge>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-muted">Anggota keluarga</p>
            <div className="space-y-1">
              {data.members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
                  <Avatar name={m.name} size="sm" color={m.gender === "PEREMPUAN" ? "rose" : "sky"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{m.name}</p>
                    <p className="truncate text-[11.5px] text-muted">{m.occupation}</p>
                  </div>
                  <Badge tone={m.familyRole === "KEPALA" ? "primary" : "neutral"}>{m.familyRole}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted">
              <Wallet className="h-3.5 w-3.5" />
              Riwayat iuran
            </p>
            {data.bills.length ? (
              <div className="space-y-1">
                {data.bills.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
                    <div>
                      <p className="text-[12.5px] font-medium">
                        {new Date(b.periodYear, b.periodMonth - 1, 1).toLocaleString("id-ID", {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-[11px] text-muted">
                        {b.paidAt ? `Dibayar ${formatDate(b.paidAt)}` : `Jatuh tempo ${formatDate(b.dueDate)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12.5px] font-semibold tabular-nums">{formatCurrency(b.amount)}</p>
                      <Badge tone={b.status === "LUNAS" ? "success" : b.status === "DIBEBASKAN" ? "neutral" : "danger"}>
                        {b.status === "LUNAS" ? "Lunas" : b.status === "DIBEBASKAN" ? "Bebas" : "Belum bayar"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted">Belum ada tagihan untuk KK ini.</p>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
