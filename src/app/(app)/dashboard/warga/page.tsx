"use client";

import * as React from "react";
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  MessageCircle,
  Eye,

  Phone,

} from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardHeader, Button, Badge, Avatar, SearchInput, Select } from "@/components/ui/primitives";
import { DataTable, RowActions, ActionItem, type Column } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { ConfirmDialog, Drawer } from "@/components/ui/overlay";
import { useCollection, useResource } from "@/hooks/use-collection";
import { useDebounce } from "@/hooks/use-debounce";
import { ResidentFormModal, type ResidentRow } from "@/components/forms/resident-form";
import { WaComposeModal } from "@/components/forms/wa-compose";
import { Pagination } from "@/components/ui/states";
import { ExportButton } from "@/components/ui/export-button";
import {
  formatDate,
  formatPhoneDisplay,
  calculateAge,
  formatCurrency,


} from "@/lib/utils";

/** Baris dari GET /api/residents — menyertakan relasi rt & family. */
type ResidentListRow = ResidentRow & {
  rt?: { number: string; areaName: string } | null;
  family?: { kkNumber: string; headName: string; address: string } | null;
};

export default function WargaPage() {
  const [search, setSearch] = React.useState("");
  const q = useDebounce(search, 300);
  const [rtId, setRtId] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [familyRole, setFamilyRole] = React.useState("");
  const [page, setPage] = React.useState(1);

  const [editing, setEditing] = React.useState<ResidentRow | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<ResidentRow | null>(null);
  const [waTarget, setWaTarget] = React.useState<{ ids: string[]; name: string } | null>(null);

  const col = useCollection<ResidentListRow>({
    path: "/api/residents",
    query: { q, rtId, status, familyRole, page, perPage: 12 },
  });

  const { data: rtData } = useResource<{ data: { id: string; number: string; areaName: string }[] }>("/api/rt");

  React.useEffect(() => {
    setPage(1);
  }, [q, rtId, status, familyRole]);

  const columns: Column<ResidentListRow>[] = [
    {
      key: "name",
      header: "Warga",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.name} size="sm" color={r.gender === "PEREMPUAN" ? "rose" : "sky"} />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{r.name}</p>
            <p className="truncate text-[11.5px] text-muted">NIK {r.nik}</p>
          </div>
        </div>
      ),
    },
    {
      key: "rt",
      header: "RT",
      className: "hidden lg:table-cell",
      cell: (r) => <Badge tone="primary">RT {r.rt?.number ?? "-"}</Badge>,
    },
    {
      key: "kk",
      header: "Kartu Keluarga",
      className: "hidden xl:table-cell",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px]">
            {r.family?.headName ?? "—"}
          </p>
          <p className="truncate text-[11px] text-muted">
            {r.family?.kkNumber ?? "Tanpa KK"}
          </p>
        </div>
      ),
    },
    {
      key: "demografi",
      header: "Usia / JK",
      className: "hidden md:table-cell",
      cell: (r) => (
        <span className="text-[12.5px]">
          {calculateAge(r.birthDate)} th · {r.gender === "LAKI_LAKI" ? "L" : "P"}
        </span>
      ),
    },
    {
      key: "kontak",
      header: "Kontak",
      className: "hidden lg:table-cell",
      cell: (r) => (
        <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
          <Phone className="h-3 w-3" />
          {formatPhoneDisplay(r.whatsapp ?? r.phone)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge tone={r.status === "AKTIF" ? "success" : r.status === "PINDAH" ? "warning" : "neutral"}>
          {r.status === "AKTIF" ? "Aktif" : r.status === "PINDAH" ? "Pindah" : "Meninggal"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Data Warga"
        description="Kelola data kependudukan RW 05 — nomor WhatsApp dipakai untuk pengingat otomatis."
        actions={
          <>
            <ExportButton
              path="/api/residents/export"
              query={{ q, rtId, status, familyRole }}
              filename="data-warga"
            />
            <Button
              variant="secondary"
              onClick={() => {
                setWaTarget({ ids: [], name: "seluruh warga" });
              }}
            >
              <MessageCircle className="h-4 w-4" />
              Kirim pengumuman
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <UserPlus className="h-4 w-4" />
              Tambah warga
            </Button>
          </>
        }
      />

      {/* Filter */}
      <Card className="mb-4">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari nama, NIK, pekerjaan, atau no. HP…"
            className="lg:max-w-sm"
          />
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            <Select value={rtId} onChange={(e) => setRtId(e.target.value)}>
              <option value="">Semua RT</option>
              {(rtData?.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  RT {r.number} — {r.areaName}
                </option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Semua status</option>
              <option value="AKTIF">Aktif</option>
              <option value="PINDAH">Pindah</option>
              <option value="MENINGGAL">Meninggal</option>
            </Select>
            <Select value={familyRole} onChange={(e) => setFamilyRole(e.target.value)}>
              <option value="">Semua peran</option>
              <option value="KEPALA">Kepala keluarga</option>
              <option value="ISTRI">Istri / suami</option>
              <option value="ANAK">Anak</option>
              <option value="ORANG_TUA">Orang tua</option>
              <option value="FAMILI_LAIN">Famili lain</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={`Daftar warga (${col.meta.total})`}
          description={`Halaman ${col.meta.page} dari ${col.meta.totalPages}`}
        />
        <DataTable
          columns={columns}
          rows={col.rows}
          loading={col.isLoading}
          error={col.error}
          onRetry={col.refresh}
          onRowClick={(r) => setDetailId(r.id)}
          skeletonRows={6}
          rowActions={(r) => (
            <RowActions>
              <ActionItem icon={<Eye className="h-4 w-4" />} onClick={() => setDetailId(r.id)}>
                Lihat detail
              </ActionItem>
              <ActionItem
                icon={<Pencil className="h-4 w-4" />}
                onClick={() => {
                  setEditing(r);
                  setFormOpen(true);
                }}
              >
                Ubah data
              </ActionItem>
              <ActionItem
                icon={<MessageCircle className="h-4 w-4" />}
                onClick={() => setWaTarget({ ids: [r.id], name: r.name })}
              >
                Kirim WhatsApp
              </ActionItem>
              <ActionItem icon={<Trash2 className="h-4 w-4" />} destructive onClick={() => setDeleting(r)}>
                Hapus
              </ActionItem>
            </RowActions>
          )}
          renderCard={(r) => (
            <div className="flex items-start gap-3">
              <Avatar name={r.name} size="md" color={r.gender === "PEREMPUAN" ? "rose" : "sky"} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium">{r.name}</p>
                <p className="text-[11.5px] text-muted">
                  NIK {r.nik} · {calculateAge(r.birthDate)} th · {r.gender === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge tone="primary">RT {r.rt?.number ?? "-"}</Badge>
                  <Badge tone={r.status === "AKTIF" ? "success" : "warning"}>{r.status}</Badge>
                </div>
              </div>
            </div>
          )}
          empty={
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title={search || rtId || status ? "Warga tidak ditemukan" : "Belum ada data warga"}
              description={
                search || rtId || status
                  ? "Coba ubah kata kunci atau filter pencarian."
                  : "Mulai dengan menambahkan data warga beserta nomor WhatsApp agar bisa menerima pengingat."
              }
              action={
                search || rtId || status ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setRtId("");
                      setStatus("");
                      setFamilyRole("");
                    }}
                  >
                    Reset filter
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                    Tambah warga
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

      <ResidentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        resident={editing}
        onSaved={col.refresh}
      />

      <ResidentDetailDrawer
        id={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(r) => {
          setDetailId(null);
          setEditing(r);
          setFormOpen(true);
        }}
        onWa={(r) => setWaTarget({ ids: [r.id], name: r.name })}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await col.remove(deleting.id, `Data ${deleting.name} dihapus`);
          setDeleting(null);
        }}
        title="Hapus data warga"
        message={
          <>
            Yakin ingin menghapus data <strong>{deleting?.name}</strong>? Tindakan ini tidak dapat dibatalkan dan
            akan melepaskan warga ini dari kartu keluarganya.
          </>
        }
        confirmLabel="Hapus warga"
      />

      {waTarget && (
        <WaComposeModal
          open
          onClose={() => setWaTarget(null)}
          defaultResidentIds={waTarget.ids}
          title={waTarget.ids.length ? `Kirim pesan ke ${waTarget.name}` : "Kirim pesan ke warga"}
          fixedAudience={waTarget.ids.length ? "pilihan" : undefined}
        />
      )}
    </div>
  );
}

/* ── Detail warga ───────────────────────────────────────── */

type ResidentDetail = ResidentRow & {
  rt: { number: string; areaName: string };
  family: {
    id: string;
    kkNumber: string;
    headName: string;
    address: string;
    members: { id: string; name: string; familyRole: string; occupation: string }[];
  } | null;
  bills: {
    id: string;
    billNumber: string;
    periodMonth: number;
    periodYear: number;
    amount: number;
    status: string;
    dueDate: string;
  }[];
  letters: { id: string; number: string; type: string; status: string; createdAt: string }[];
  assignments: {
    id: string;
    status: string;
    activity: { id: string; title: string; startsAt: string; type: string; status: string };
  }[];
};

function ResidentDetailDrawer({
  id,
  onClose,
  onEdit,
  onWa,
}: {
  id: string | null;
  onClose: () => void;
  onEdit: (r: ResidentRow) => void;
  onWa: (r: ResidentRow) => void;
}) {
  const { data, isLoading } = useResource<ResidentDetail>(id ? `/api/residents/${id}` : null);

  return (
    <Drawer
      open={Boolean(id)}
      onClose={onClose}
      title={data?.name ?? "Detail warga"}
      subtitle={data ? `NIK ${data.nik} · RT ${data.rt.number}` : undefined}
      footer={
        data && (
          <>
            <Button variant="secondary" onClick={() => onWa(data)} className="flex-1">
              <MessageCircle className="h-4 w-4" />
              Kirim pesan
            </Button>
            <Button onClick={() => onEdit(data)} className="flex-1">
              <Pencil className="h-4 w-4" />
              Ubah data
            </Button>
          </>
        )
      }
    >
      {isLoading || !data ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-4 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-4 rounded-xl border border-line bg-surface-muted/40 p-4">
            <Avatar name={data.name} size="lg" color="emerald" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{data.name}</p>
              <p className="text-[12.5px] text-muted">
                {calculateAge(data.birthDate)} tahun · {data.gender === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"} ·{" "}
                {data.occupation}
              </p>
              <p className="mt-0.5 text-[12.5px] text-muted">
                {formatPhoneDisplay(data.whatsapp ?? data.phone)}
              </p>
            </div>
          </div>

          <Section title="Biodata">
            <InfoRow label="Tempat, tgl lahir" value={`${data.birthPlace}, ${formatDate(data.birthDate)}`} />
            <InfoRow label="Agama" value={data.religion} />
            <InfoRow label="Pendidikan" value={data.education} />
            <InfoRow label="Status" value={data.maritalStatus.replace("_", " ")} />
            <InfoRow label="Gol. darah" value={data.bloodType ?? "-"} />
            <InfoRow label="Email" value={data.email ?? "-"} />
          </Section>

          <Section title="Kartu Keluarga">
            {data.family ? (
              <>
                <InfoRow label="No. KK" value={data.family.kkNumber} />
                <InfoRow label="Kepala keluarga" value={data.family.headName} />
                <InfoRow label="Alamat" value={data.family.address} />
                <div className="mt-3 space-y-1.5">
                  <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">Anggota</p>
                  {data.family.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface-muted">
                      <Avatar name={m.name} size="xs" color="teal" />
                      <span className="flex-1 truncate text-[12.5px]">{m.name}</span>
                      <Badge tone="neutral">{m.familyRole}</Badge>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[13px] text-muted">Belum terhubung dengan kartu keluarga.</p>
            )}
          </Section>

          <Section title={`Riwayat iuran (${data.bills.length})`}>
            {data.bills.length ? (
              <div className="space-y-1.5">
                {data.bills.slice(0, 6).map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg px-2 py-1.5">
                    <div>
                      <p className="text-[12.5px] font-medium">
                        {new Date(b.periodYear, b.periodMonth - 1, 1).toLocaleString("id-ID", {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-[11px] text-muted">Jatuh tempo {formatDate(b.dueDate)}</p>
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
              <p className="text-[13px] text-muted">Belum ada tagihan.</p>
            )}
          </Section>

          <Section title="Partisipasi kegiatan">
            {data.assignments.length ? (
              <div className="space-y-1.5">
                {data.assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg px-2 py-1.5">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium">{a.activity.title}</p>
                      <p className="text-[11px] text-muted">{formatDate(a.activity.startsAt, true)}</p>
                    </div>
                    <Badge
                      tone={
                        a.status === "HADIR"
                          ? "success"
                          : a.status === "IZIN"
                            ? "info"
                            : a.status === "ALPHA"
                              ? "danger"
                              : "neutral"
                      }
                    >
                      {a.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted">Belum pernah ditugaskan pada kegiatan.</p>
            )}
          </Section>
        </div>
      )}
    </Drawer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      <div className="space-y-1.5 rounded-xl border border-line p-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-2 py-1">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className="text-right text-[12.5px] font-medium capitalize">{String(value).toLowerCase()}</span>
    </div>
  );
}
