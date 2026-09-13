"use client";

import * as React from "react";
import { ShieldCheck, Plus, Pencil, Trash2, KeyRound, UserX, UserCheck } from "lucide-react";
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
  Avatar,
  Switch,
} from "@/components/ui/primitives";
import { DataTable, RowActions, ActionItem, type Column } from "@/components/ui/table";
import { EmptyState, Pagination } from "@/components/ui/states";
import { Modal, ConfirmDialog } from "@/components/ui/overlay";
import { useCollection, useResource } from "@/hooks/use-collection";
import { useDebounce } from "@/hooks/use-debounce";
import { post, patch } from "@/lib/client/api";
import { useSessionUser } from "@/components/session-provider";
import { formatDateTime, formatRelative } from "@/lib/utils";

type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  avatarColor: string;
  lastLoginAt: string | null;
  rtId: string | null;
  rt: { number: string; areaName: string } | null;
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  OPERATOR: "Perangkat RW",
  KETUA_RT: "Ketua RT",
  WARGA: "Warga",
};

const ROLE_TONE: Record<string, "danger" | "info" | "warning" | "neutral"> = {
  ADMIN: "danger",
  OPERATOR: "info",
  KETUA_RT: "warning",
  WARGA: "neutral",
};

export default function PenggunaPage() {
  const { user: currentUser } = useSessionUser();
  const [search, setSearch] = React.useState("");
  const q = useDebounce(search, 300);
  const [role, setRole] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UserRow | null>(null);
  const [deleting, setDeleting] = React.useState<UserRow | null>(null);

  const col = useCollection<UserRow>({
    path: "/api/users",
    query: { q, role, page, perPage: 15 },
  });

  React.useEffect(() => setPage(1), [q, role]);

  const columns: Column<UserRow>[] = [
    {
      key: "user",
      header: "Pengguna",
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} size="sm" color={u.avatarColor} />
          <div className="min-w-0">
            <p className="truncate font-medium">{u.name}</p>
            <p className="truncate text-[11.5px] text-muted">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Peran",
      cell: (u) => <Badge tone={ROLE_TONE[u.role] ?? "neutral"}>{ROLE_LABEL[u.role] ?? u.role}</Badge>,
    },
    {
      key: "rt",
      header: "Wilayah",
      className: "hidden md:table-cell",
      cell: (u) =>
        u.rt ? <Badge tone="primary">RT {u.rt.number}</Badge> : <span className="text-[12.5px] text-muted">Seluruh RW</span>,
    },
    {
      key: "login",
      header: "Login terakhir",
      className: "hidden lg:table-cell",
      cell: (u) => (
        <span className="text-[12.5px] text-muted">
          {u.lastLoginAt ? (
            <>
              {formatDateTime(u.lastLoginAt)}
              <span className="block text-[11px]">{formatRelative(u.lastLoginAt)}</span>
            </>
          ) : (
            "Belum pernah"
          )}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (u) => <Badge tone={u.active ? "success" : "neutral"}>{u.active ? "Aktif" : "Nonaktif"}</Badge>,
    },
  ];

  async function toggleActive(u: UserRow) {
    await col.update(
      u.id,
      { active: !u.active } as never,
      u.active ? `Akun ${u.name} dinonaktifkan` : `Akun ${u.name} diaktifkan`,
      (row) => ({ ...row, active: !row.active }),
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Pengguna"
        description="Kelola akun pengurus RW, ketua RT, dan warga yang dapat mengakses sistem."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Tambah pengguna
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari nama atau email pengguna…"
            className="sm:max-w-md"
          />
          <Select value={role} onChange={(e) => setRole(e.target.value)} className="sm:max-w-xs">
            <option value="">Semua peran</option>
            {Object.entries(ROLE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        <CardHeader title={`Daftar pengguna (${col.meta.total})`} description="Hanya administrator yang dapat mengelola akun" />
        <DataTable
          columns={columns}
          rows={col.rows}
          loading={col.isLoading}
          error={col.error}
          onRetry={col.refresh}
          skeletonRows={6}
          rowActions={(u) => (
            <RowActions>
              <ActionItem
                icon={<Pencil className="h-4 w-4" />}
                onClick={() => {
                  setEditing(u);
                  setFormOpen(true);
                }}
              >
                Ubah data
              </ActionItem>
              <ActionItem
                icon={<KeyRound className="h-4 w-4" />}
                onClick={() => {
                  setEditing(u);
                  setFormOpen(true);
                }}
              >
                Atur ulang sandi
              </ActionItem>
              <ActionItem
                icon={u.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                onClick={() => toggleActive(u)}
              >
                {u.active ? "Nonaktifkan" : "Aktifkan"}
              </ActionItem>
              {u.id !== currentUser.id && (
                <ActionItem icon={<Trash2 className="h-4 w-4" />} destructive onClick={() => setDeleting(u)}>
                  Hapus akun
                </ActionItem>
              )}
            </RowActions>
          )}
          renderCard={(u) => (
            <div className="pr-8">
              <p className="truncate text-[13.5px] font-medium">{u.name}</p>
              <p className="truncate text-[11.5px] text-muted">{u.email}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                {u.rt && <Badge tone="primary">RT {u.rt.number}</Badge>}
                <Badge tone={u.active ? "success" : "neutral"}>{u.active ? "Aktif" : "Nonaktif"}</Badge>
              </div>
            </div>
          )}
          empty={
            <EmptyState
              icon={<ShieldCheck className="h-6 w-6" />}
              title={search || role ? "Pengguna tidak ditemukan" : "Belum ada pengguna"}
              description="Tambahkan akun untuk pengurus RW atau ketua RT."
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

      <UserFormModal open={formOpen} onClose={() => setFormOpen(false)} user={editing} onSaved={col.refresh} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await col.remove(deleting.id, `Akun ${deleting.name} dihapus`);
          setDeleting(null);
        }}
        title="Hapus pengguna"
        message={
          <>
            Hapus akun <strong>{deleting?.name}</strong> ({deleting?.email})? Pengguna tidak dapat masuk kembali.
          </>
        }
        confirmLabel="Hapus akun"
      />
    </div>
  );
}

function UserFormModal({
  open,
  onClose,
  user,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  user: UserRow | null;
  onSaved: () => void;
}) {
  const { data: rtData } = useResource<{ data: { id: string; number: string; areaName: string }[] }>(
    open ? "/api/rt" : null,
  );
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    password: "",
    role: "OPERATOR",
    rtId: "",
    phone: "",
    active: true,
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      user
        ? {
            name: user.name,
            email: user.email,
            password: "",
            role: user.role,
            rtId: user.rtId ?? "",
            phone: user.phone ?? "",
            active: user.active,
          }
        : { name: "", email: "", password: "", role: "OPERATOR", rtId: "", phone: "", active: true },
    );
  }, [open, user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        rtId: form.role === "KETUA_RT" ? form.rtId : null,
        phone: form.phone || null,
        active: form.active,
        ...(form.password ? { password: form.password } : {}),
      };
      if (user) await patch(`/api/users/${user.id}`, payload);
      else await post("/api/users", { ...payload, password: form.password });
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
      title={user ? "Ubah pengguna" : "Tambah pengguna"}
      description={user ? "Kosongkan kata sandi bila tidak ingin mengubahnya" : "Akun baru dapat langsung masuk ke sistem"}
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
        <Field label="Nama lengkap" required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label="Email" required>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            disabled={Boolean(user)}
          />
        </Field>
        <Field
          label="Kata sandi"
          required={!user}
          hint={user ? "Minimal 6 karakter — kosongkan bila tidak diubah" : "Minimal 6 karakter"}
        >
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!user}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Peran" required>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Wilayah RT" hint={form.role === "KETUA_RT" ? "Wajib untuk ketua RT" : "Opsional"}>
            <Select
              value={form.rtId}
              onChange={(e) => setForm({ ...form, rtId: e.target.value })}
              disabled={form.role !== "KETUA_RT"}
            >
              <option value="">— Pilih RT —</option>
              {(rtData?.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  RT {r.number} — {r.areaName}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="No. HP">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0812…" />
        </Field>
        <div className="flex items-center justify-between rounded-xl border border-line bg-surface-muted/40 px-4 py-3">
          <div>
            <p className="text-[13px] font-medium">Akun aktif</p>
            <p className="text-[11.5px] text-muted">Akun nonaktif tidak dapat masuk</p>
          </div>
          <Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
        </div>
      </form>
    </Modal>
  );
}
