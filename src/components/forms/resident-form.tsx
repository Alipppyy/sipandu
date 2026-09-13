"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Select, Switch } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/overlay";
import { post, patch } from "@/lib/client/api";
import { useResource } from "@/hooks/use-collection";
import { toISODateInput } from "@/lib/utils";

export type ResidentRow = {
  id: string;
  nik: string;
  name: string;
  gender: "LAKI_LAKI" | "PEREMPUAN";
  birthPlace: string;
  birthDate: string;
  religion: string;
  education: string;
  occupation: string;
  maritalStatus: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  familyId: string | null;
  familyRole: string;
  rtId: string;
  status: string;
  bloodType: string | null;
  isVoter: boolean;
  notes: string | null;
};

type RtOption = { id: string; number: string; areaName: string };
type FamilyOption = { id: string; kkNumber: string; headName: string; rtId: string };

const DEFAULTS = {
  nik: "",
  name: "",
  gender: "LAKI_LAKI",
  birthPlace: "Banjar",
  birthDate: "1990-01-01",
  religion: "ISLAM",
  education: "SMA",
  occupation: "Wiraswasta",
  maritalStatus: "KAWIN",
  phone: "",
  whatsapp: "",
  email: "",
  familyId: "",
  familyRole: "ANAK",
  rtId: "",
  status: "AKTIF",
  bloodType: "O",
  isVoter: true,
  notes: "",
} as const;

export function ResidentFormModal({
  open,
  onClose,
  resident,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  resident?: ResidentRow | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = React.useState<Record<string, unknown>>(DEFAULTS);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const { data: rtData } = useResource<{ data: RtOption[] }>(open ? "/api/rt" : null);
  const { data: famData } = useResource<{ data: FamilyOption[] }>(open ? "/api/families?perPage=200" : null);

  const rts = rtData?.data ?? [];
  const families = famData?.data ?? [];

  React.useEffect(() => {
    if (!open) return;
    if (resident) {
      setForm({
        ...resident,
        birthDate: toISODateInput(resident.birthDate),
        familyId: resident.familyId ?? "",
        phone: resident.phone ?? "",
        whatsapp: resident.whatsapp ?? "",
        email: resident.email ?? "",
        notes: resident.notes ?? "",
        bloodType: resident.bloodType ?? "O",
      });
    } else {
      setForm({ ...DEFAULTS, rtId: rts[0]?.id ?? "" });
    }
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resident]);

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        ...form,
        phone: (form.phone as string) || null,
        whatsapp: (form.whatsapp as string) || null,
        email: (form.email as string) || null,
        familyId: (form.familyId as string) || null,
        notes: (form.notes as string) || null,
      };
      if (resident) await patch(`/api/residents/${resident.id}`, payload);
      else await post("/api/residents", payload);
      onSaved?.();
      router.refresh();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan";
      if (/nik/i.test(msg)) setErrors({ nik: msg });
      else setErrors({ form: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={resident ? "Ubah data warga" : "Tambah warga baru"}
      description={
        resident
          ? `Perbarui data kependudukan ${resident.name}`
          : "Lengkapi data warga. Nomor WhatsApp dipakai untuk pengingat otomatis."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={submit} loading={saving}>
            {resident ? "Simpan perubahan" : "Tambah warga"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {errors.form && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
            {errors.form}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="NIK" required error={errors.nik} hint="16 digit angka">
            <Input
              value={form.nik as string}
              onChange={(e) => set("nik", e.target.value.replace(/\D/g, "").slice(0, 16))}
              placeholder="3276xxxxxxxxxxxx"
              inputMode="numeric"
              maxLength={16}
              required
            />
          </Field>
          <Field label="Nama lengkap" required>
            <Input value={form.name as string} onChange={(e) => set("name", e.target.value)} required />
          </Field>
          <Field label="Jenis kelamin" required>
            <Select value={form.gender as string} onChange={(e) => set("gender", e.target.value)}>
              <option value="LAKI_LAKI">Laki-laki</option>
              <option value="PEREMPUAN">Perempuan</option>
            </Select>
          </Field>
          <Field label="Golongan darah">
            <Select value={(form.bloodType as string) ?? "O"} onChange={(e) => set("bloodType", e.target.value)}>
              {["A", "B", "AB", "O"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tempat lahir" required>
            <Input value={form.birthPlace as string} onChange={(e) => set("birthPlace", e.target.value)} required />
          </Field>
          <Field label="Tanggal lahir" required>
            <Input
              type="date"
              value={form.birthDate as string}
              onChange={(e) => set("birthDate", e.target.value)}
              required
            />
          </Field>
          <Field label="Agama">
            <Select value={form.religion as string} onChange={(e) => set("religion", e.target.value)}>
              {["ISLAM", "KRISTEN", "KATOLIK", "HINDU", "BUDDHA", "KONGHUCU"].map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pendidikan">
            <Select value={form.education as string} onChange={(e) => set("education", e.target.value)}>
              {["SD", "SMP", "SMA", "DIPLOMA", "SARJANA", "PASCASARJANA"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pekerjaan">
            <Input value={form.occupation as string} onChange={(e) => set("occupation", e.target.value)} />
          </Field>
          <Field label="Status perkawinan">
            <Select value={form.maritalStatus as string} onChange={(e) => set("maritalStatus", e.target.value)}>
              <option value="BELUM_KAWIN">Belum kawin</option>
              <option value="KAWIN">Kawin</option>
              <option value="CERAI_HIDUP">Cerai hidup</option>
              <option value="CERAI_MATI">Cerai mati</option>
            </Select>
          </Field>
        </div>

        <div className="border-t border-line pt-4">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-muted">Alamat & kontak</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="RT / wilayah" required>
              <Select value={form.rtId as string} onChange={(e) => set("rtId", e.target.value)} required>
                <option value="">Pilih RT</option>
                {rts.map((r) => (
                  <option key={r.id} value={r.id}>
                    RT {r.number} — {r.areaName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Kartu Keluarga">
              <Select value={(form.familyId as string) ?? ""} onChange={(e) => set("familyId", e.target.value)}>
                <option value="">— Tanpa KK —</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.headName} · {f.kkNumber.slice(-6)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status dalam keluarga">
              <Select value={form.familyRole as string} onChange={(e) => set("familyRole", e.target.value)}>
                <option value="KEPALA">Kepala keluarga</option>
                <option value="ISTRI">Istri / suami</option>
                <option value="ANAK">Anak</option>
                <option value="ORANG_TUA">Orang tua</option>
                <option value="FAMILI_LAIN">Famili lain</option>
              </Select>
            </Field>
            <Field label="Status domisili">
              <Select value={form.status as string} onChange={(e) => set("status", e.target.value)}>
                <option value="AKTIF">Aktif</option>
                <option value="PINDAH">Pindah</option>
                <option value="MENINGGAL">Meninggal</option>
              </Select>
            </Field>
            <Field label="No. HP" hint="Contoh: 0812xxxx">
              <Input
                value={(form.phone as string) ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="0812…"
              />
            </Field>
            <Field label="No. WhatsApp" hint="Kosongkan bila sama dengan No. HP">
              <Input
                value={(form.whatsapp as string) ?? ""}
                onChange={(e) => set("whatsapp", e.target.value)}
                placeholder="62812… atau 0812…"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={(form.email as string) ?? ""}
                onChange={(e) => set("email", e.target.value)}
                placeholder="opsional"
              />
            </Field>
            <Field label="Catatan">
              <Input
                value={(form.notes as string) ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="opsional"
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-line bg-surface-muted/40 px-4 py-3">
          <div>
            <p className="text-[13px] font-medium">Terdaftar sebagai pemilih</p>
            <p className="text-[11.5px] text-muted">Untuk keperluan data pemilu / musyawarah</p>
          </div>
          <Switch checked={Boolean(form.isVoter)} onChange={(v) => set("isVoter", v)} />
        </div>
      </form>
    </Modal>
  );
}
