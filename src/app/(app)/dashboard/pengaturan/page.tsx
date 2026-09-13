"use client";

import * as React from "react";
import { Save, KeyRound, Building2, Bell, Database, Terminal, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { Card, CardHeader, Button, Badge, Input, Field, Switch } from "@/components/ui/primitives";
import { useResource } from "@/hooks/use-collection";
import { patch, post } from "@/lib/client/api";
import { useSessionUser } from "@/components/session-provider";
import { toast } from "sonner";

type Profile = {
  rwNumber: string;
  village: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  address: string;
  ketuaName: string;
  ketuaPhone: string;
  sekretarisName: string;
  bendaharaName: string;
  waProvider: string;
  waEnabled: boolean;
  waAutoSend: boolean;
  reminderOffsets: string;
  reminderHour: number;
  trashFeeAmount: number;
  trashDueDay: number;
};

export default function PengaturanPage() {
  const { user } = useSessionUser();
  const { data, isLoading, refresh } = useResource<Profile>("/api/wa/settings");
  const [form, setForm] = React.useState<Partial<Profile>>({});
  const [saving, setSaving] = React.useState(false);

  const [pw, setPw] = React.useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingPw, setSavingPw] = React.useState(false);

  React.useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const isAdmin = user.role === "ADMIN";

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await patch("/api/wa/settings", {
        rwNumber: form.rwNumber,
        village: form.village,
        district: form.district,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode,
        address: form.address,
        ketuaName: form.ketuaName,
        ketuaPhone: form.ketuaPhone,
        sekretarisName: form.sekretarisName,
        bendaharaName: form.bendaharaName,
      });
      toast.success("Profil RW tersimpan");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  }

  async function saveReminder() {
    setSaving(true);
    try {
      await patch("/api/wa/settings", {
        reminderOffsets: form.reminderOffsets,
        reminderHour: Number(form.reminderHour),
        trashFeeAmount: Number(form.trashFeeAmount),
        trashDueDay: Number(form.trashDueDay),
        waAutoSend: form.waAutoSend,
      });
      toast.success("Aturan pengingat tersimpan");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.newPassword !== pw.confirmPassword) {
      toast.error("Konfirmasi kata sandi tidak cocok");
      return;
    }
    setSavingPw(true);
    try {
      await patch("/api/auth/password", pw);
      toast.success("Kata sandi berhasil diubah");
      setPw({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah kata sandi");
    } finally {
      setSavingPw(false);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="space-y-3 p-5">
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-10" />
            <div className="skeleton h-10" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Pengaturan"
        description="Profil RW, aturan pengingat, integrasi WhatsApp, dan keamanan akun."
        actions={
          <Badge tone={user.role === "ADMIN" ? "danger" : "neutral"}>
            {user.role === "ADMIN" ? "Administrator" : user.role === "OPERATOR" ? "Perangkat RW" : "Ketua RT"}
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Profil */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Profil wilayah"
            description="Identitas RW yang dipakai pada kop surat dan pesan WhatsApp"
            action={<Building2 className="h-4 w-4 text-muted" />}
          />
          <form onSubmit={saveProfile} className="grid gap-4 p-5 pt-4 sm:grid-cols-2">
            <Field label="Nomor RW" required>
              <Input value={form.rwNumber ?? ""} onChange={(e) => setForm({ ...form, rwNumber: e.target.value })} />
            </Field>
            <Field label="Kelurahan / Desa" required>
              <Input value={form.village ?? ""} onChange={(e) => setForm({ ...form, village: e.target.value })} />
            </Field>
            <Field label="Kecamatan">
              <Input value={form.district ?? ""} onChange={(e) => setForm({ ...form, district: e.target.value })} />
            </Field>
            <Field label="Kota / Kabupaten">
              <Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="Provinsi">
              <Input value={form.province ?? ""} onChange={(e) => setForm({ ...form, province: e.target.value })} />
            </Field>
            <Field label="Kode pos">
              <Input value={form.postalCode ?? ""} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
            </Field>
            <Field label="Alamat sekretariat" className="sm:col-span-2">
              <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="Nama ketua RW">
              <Input value={form.ketuaName ?? ""} onChange={(e) => setForm({ ...form, ketuaName: e.target.value })} />
            </Field>
            <Field label="Kontak ketua RW" hint="Format 62… agar bisa dihubungi lewat WhatsApp">
              <Input value={form.ketuaPhone ?? ""} onChange={(e) => setForm({ ...form, ketuaPhone: e.target.value })} />
            </Field>
            <Field label="Sekretaris">
              <Input
                value={form.sekretarisName ?? ""}
                onChange={(e) => setForm({ ...form, sekretarisName: e.target.value })}
              />
            </Field>
            <Field label="Bendahara">
              <Input
                value={form.bendaharaName ?? ""}
                onChange={(e) => setForm({ ...form, bendaharaName: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" loading={saving} disabled={!isAdmin}>
                {!saving && <Save className="h-4 w-4" />}
                Simpan profil
              </Button>
              {!isAdmin && (
                <p className="mt-2 text-[11.5px] text-muted">Hanya administrator yang dapat mengubah profil RW.</p>
              )}
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          {/* Keamanan */}
          <Card>
            <CardHeader title="Keamanan akun" description="Ganti kata sandi Anda" action={<KeyRound className="h-4 w-4 text-muted" />} />
            <form onSubmit={changePassword} className="space-y-3.5 p-5 pt-4">
              <Field label="Kata sandi saat ini" required>
                <Input
                  type="password"
                  value={pw.currentPassword}
                  onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                  required
                />
              </Field>
              <Field label="Kata sandi baru" required>
                <Input
                  type="password"
                  value={pw.newPassword}
                  onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                  required
                />
              </Field>
              <Field label="Konfirmasi" required>
                <Input
                  type="password"
                  value={pw.confirmPassword}
                  onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })}
                  required
                />
              </Field>
              <Button type="submit" variant="secondary" className="w-full" loading={savingPw}>
                Ubah kata sandi
              </Button>
            </form>
          </Card>

          {/* Info sistem */}
          <Card>
            <CardHeader title="Informasi sistem" action={<Database className="h-4 w-4 text-muted" />} />
            <div className="space-y-2.5 p-5 pt-4 text-[12.5px]">
              <Info label="Basis data" value="PostgreSQL" />
              <Info label="Gateway WA" value={form.waProvider ?? "fonnte"} />
              <Info
                label="Mode pengiriman"
                value={form.waEnabled ? "Live" : "Simulasi"}
              />
              <Info label="Penjadwal otomatis" value={form.waAutoSend ? "Aktif" : "Nonaktif"} />
            </div>
          </Card>
        </div>
      </div>

      {/* Aturan pengingat */}
      <Card>
        <CardHeader
          title="Aturan pengingat & iuran"
          description="Pengaturan siklus pengingat otomatis ke WhatsApp warga"
          action={<Bell className="h-4 w-4 text-muted" />}
        />
        <div className="grid gap-4 p-5 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Nominal iuran per KK">
            <Input
              type="number"
              value={String(form.trashFeeAmount ?? 0)}
              onChange={(e) => setForm({ ...form, trashFeeAmount: Number(e.target.value) })}
            />
          </Field>
          <Field label="Tanggal jatuh tempo">
            <Input
              type="number"
              min={1}
              max={28}
              value={String(form.trashDueDay ?? 10)}
              onChange={(e) => setForm({ ...form, trashDueDay: Number(e.target.value) })}
            />
          </Field>
          <Field label="Hari pengingat" hint="Relatif terhadap jatuh tempo">
            <Input
              value={form.reminderOffsets ?? ""}
              onChange={(e) => setForm({ ...form, reminderOffsets: e.target.value })}
              placeholder="-3,0,3,7"
            />
          </Field>
          <Field label="Jam pengiriman">
            <Input
              type="number"
              min={0}
              max={23}
              value={String(form.reminderHour ?? 8)}
              onChange={(e) => setForm({ ...form, reminderHour: Number(e.target.value) })}
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4">
          <Switch
            checked={Boolean(form.waAutoSend)}
            onChange={(v) => setForm({ ...form, waAutoSend: v })}
            label="Penjadwal otomatis"
            description="Kirim pengingat tanpa intervensi"
          />
          <div className="ml-auto flex gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                const res = await post<{ summary: { delivery: { sent: number } } }>("/api/wa/run");
                toast.success(`Penjadwal dijalankan — ${res.summary.delivery.sent} pesan diproses`);
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              Uji penjadwal
            </Button>
            <Button onClick={saveReminder} loading={saving}>
              <Save className="h-4 w-4" />
              Simpan aturan
            </Button>
          </div>
        </div>
      </Card>

      {/* Cron */}
      <Card>
        <CardHeader
          title="Penjadwal eksternal (opsional)"
          description="Panggil endpoint berikut dari cron server setiap jam agar pengingat berjalan otomatis"
          action={<Terminal className="h-4 w-4 text-muted" />}
        />
        <div className="space-y-3 p-5 pt-4">
          <pre className="overflow-x-auto rounded-xl border border-line bg-surface-muted p-3.5 font-mono text-[12px] leading-relaxed">
            {`curl -X POST "https://domain-anda/api/cron/reminders?secret=$CRON_SECRET"`}
          </pre>
          <p className="text-[12.5px] text-muted">
            Endpoint yang sama dapat dipanggil kapan saja tanpa login selama <code>secret</code> sesuai dengan nilai{" "}
            <code>CRON_SECRET</code> pada berkas <code>.env</code>.
          </p>
        </div>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
