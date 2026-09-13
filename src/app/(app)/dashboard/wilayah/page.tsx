"use client";

import * as React from "react";
import { MapPinned, Plus, Pencil, Trash2, Users, UsersRound, Wallet, Crown } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { Card, Button, Avatar, Input, Field, Select, Progress } from "@/components/ui/primitives";
import { Modal, ConfirmDialog } from "@/components/ui/overlay";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useResource } from "@/hooks/use-collection";
import { post, patch, del } from "@/lib/client/api";
import { formatCurrency, formatNumber } from "@/lib/utils";

type RtRow = {
  id: string;
  number: string;
  areaName: string;
  rwNumber: string;
  notes: string | null;
  ketuaUser: { id: string; name: string; phone: string | null; avatarColor: string } | null;
  _count: { families: number; residents: number };
};

export default function WilayahPage() {
  const { data, isLoading, error, refresh } = useResource<{ data: RtRow[] }>("/api/rt");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<RtRow | null>(null);
  const [deleting, setDeleting] = React.useState<RtRow | null>(null);
  const [deleting2, setDeleting2] = React.useState(false);

  const rts = data?.data ?? [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Wilayah RT"
        description="Kelola wilayah RT, ketua RT, dan sebaran warga di RW 05."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Tambah RT
          </Button>
        }
      />

      {error ? (
        <Card>
          <ErrorState onRetry={refresh} />
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="space-y-3 p-5">
              <div className="skeleton h-5 w-24" />
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-12 w-full" />
            </Card>
          ))}
        </div>
      ) : !rts.length ? (
        <Card>
          <EmptyState
            icon={<MapPinned className="h-6 w-6" />}
            title="Belum ada wilayah RT"
            description="Tambahkan RT untuk mulai memetakan wilayah RW 05."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Tambah RT
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rts.map((rt) => (
            <RtCard
              key={rt.id}
              rt={rt}
              onEdit={() => {
                setEditing(rt);
                setFormOpen(true);
              }}
              onDelete={() => setDeleting(rt)}
            />
          ))}
        </div>
      )}

      <RtFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        rt={editing}
        onSaved={refresh}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        loading={deleting2}
        onConfirm={async () => {
          if (!deleting) return;
          setDeleting2(true);
          try {
            await del(`/api/rt/${deleting.id}`);
            refresh();
          } finally {
            setDeleting2(false);
            setDeleting(null);
          }
        }}
        title="Hapus wilayah RT"
        message={
          <>
            Hapus RT <strong>{deleting?.number}</strong> ({deleting?.areaName})? RT yang masih memiliki warga atau KK
            tidak dapat dihapus.
          </>
        }
        confirmLabel="Hapus RT"
      />
    </div>
  );
}

function RtCard({ rt, onEdit, onDelete }: { rt: RtRow; onEdit: () => void; onDelete: () => void }) {
  const { data: billData } = useResource<{
    data: { id: string; status: string; amount: number }[];
    meta: { total: number };
  }>(`/api/bills?rtId=${rt.id}&perPage=100`);

  const bills = billData?.data ?? [];
  const paid = bills.filter((b) => b.status === "LUNAS").length;
  const outstanding = bills
    .filter((b) => b.status !== "LUNAS" && b.status !== "DIBEBASKAN")
    .reduce((a, b) => a + b.amount, 0);
  const rate = bills.length ? Math.round((paid / bills.length) * 100) : 0;

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3 border-b border-line bg-surface-muted/30 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-[15px] font-bold text-primary">
            {rt.number}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14.5px] font-semibold">{rt.areaName}</p>
            <p className="text-[11.5px] text-muted">RW {rt.rwNumber} · {rt._count.families} KK</p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Ubah">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Hapus" className="text-danger">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3.5 px-5 py-4">
        {rt.ketuaUser ? (
          <div className="flex items-center gap-2.5">
            <Avatar name={rt.ketuaUser.name} size="sm" color={rt.ketuaUser.avatarColor} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium">{rt.ketuaUser.name}</p>
              <p className="text-[11px] text-muted">Ketua RT</p>
            </div>
            <Crown className="h-3.5 w-3.5 text-warning" />
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-[12px] text-muted">
            <Crown className="h-3.5 w-3.5" />
            Ketua RT belum ditentukan
          </p>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-line px-3 py-2">
            <p className="flex items-center gap-1.5 text-[11px] text-muted">
              <Users className="h-3 w-3" /> Warga
            </p>
            <p className="text-[15px] font-bold tabular-nums">{formatNumber(rt._count.residents)}</p>
          </div>
          <div className="rounded-xl border border-line px-3 py-2">
            <p className="flex items-center gap-1.5 text-[11px] text-muted">
              <UsersRound className="h-3 w-3" /> KK
            </p>
            <p className="text-[15px] font-bold tabular-nums">{formatNumber(rt._count.families)}</p>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
            <span className="flex items-center gap-1.5 text-muted">
              <Wallet className="h-3 w-3" /> Iuran lunas
            </span>
            <span className="font-semibold tabular-nums">
              {paid}/{bills.length}
            </span>
          </div>
          <Progress value={rate} tone={rate >= 80 ? "success" : rate >= 50 ? "warning" : "danger"} />
        </div>

        {outstanding > 0 && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-[11.5px] text-danger">
            Tunggakan {formatCurrency(outstanding)}
          </p>
        )}

        {rt.notes && <p className="text-[11.5px] leading-relaxed text-muted">{rt.notes}</p>}
      </div>
    </Card>
  );
}

/* ── Form RT ────────────────────────────────────────────── */

function RtFormModal({
  open,
  onClose,
  rt,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  rt?: RtRow | null;
  onSaved: () => void;
}) {
  const { data: userData } = useResource<{
    data: { id: string; name: string; role: string; rtId: string | null }[];
  }>(open ? "/api/users?perPage=100" : null);

  const [form, setForm] = React.useState({
    number: "",
    areaName: "",
    rwNumber: "05",
    ketuaUserId: "",
    notes: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      rt
        ? {
            number: rt.number,
            areaName: rt.areaName,
            rwNumber: rt.rwNumber,
            ketuaUserId: rt.ketuaUser?.id ?? "",
            notes: rt.notes ?? "",
          }
        : { number: "", areaName: "", rwNumber: "05", ketuaUserId: "", notes: "" },
    );
  }, [open, rt]);

  const candidates = (userData?.data ?? []).filter(
    (u) => u.role === "KETUA_RT" && (!u.rtId || u.rtId === rt?.id),
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, ketuaUserId: form.ketuaUserId || null, notes: form.notes || null };
      if (rt) await patch(`/api/rt/${rt.id}`, payload);
      else await post("/api/rt", payload);
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
      title={rt ? "Ubah wilayah RT" : "Tambah wilayah RT"}
      description="Ketua RT dapat dipilih dari pengguna dengan peran Ketua RT."
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
          <Field label="Nomor RT" required hint="2–3 digit, mis. 01">
            <Input
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value.replace(/\D/g, "").slice(0, 3) })}
              placeholder="01"
              required
            />
          </Field>
          <Field label="Nomor RW" required>
            <Input
              value={form.rwNumber}
              onChange={(e) => setForm({ ...form, rwNumber: e.target.value })}
              placeholder="05"
              required
            />
          </Field>
        </div>
        <Field label="Nama wilayah" required hint="Mis. Blok Melati">
          <Input
            value={form.areaName}
            onChange={(e) => setForm({ ...form, areaName: e.target.value })}
            placeholder="Blok Melati"
            required
          />
        </Field>
        <Field label="Ketua RT">
          <Select value={form.ketuaUserId} onChange={(e) => setForm({ ...form, ketuaUserId: e.target.value })}>
            <option value="">— Belum ditentukan —</option>
            {candidates.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Catatan">
          <Input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="opsional"
          />
        </Field>
      </form>
    </Modal>
  );
}
