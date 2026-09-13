"use client";

import * as React from "react";
import { MessageCircle, Send } from "lucide-react";
import { Button, Field, Textarea, Select } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/overlay";
import { post } from "@/lib/client/api";
import { toast } from "sonner";
import { useResource } from "@/hooks/use-collection";

type RtOption = { id: string; number: string; areaName: string };

export function WaComposeModal({
  open,
  onClose,
  defaultResidentIds = [],
  defaultMessage = "",
  fixedAudience,
  title = "Kirim pesan WhatsApp",
}: {
  open: boolean;
  onClose: () => void;
  defaultResidentIds?: string[];
  defaultMessage?: string;
  fixedAudience?: "pilihan";
  title?: string;
}) {
  const { data: rtData } = useResource<{ data: RtOption[] }>(open ? "/api/rt" : null);
  const [audience, setAudience] = React.useState<"semua" | "rt" | "tunggakan" | "petugas" | "pilihan">(
    fixedAudience ?? "semua",
  );
  const [rtId, setRtId] = React.useState("");
  const [message, setMessage] = React.useState(defaultMessage);
  const [onlyHeads, setOnlyHeads] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<{ queued: number; skipped: number } | null>(null);

  React.useEffect(() => {
    if (open) {
      setMessage(defaultMessage);
      setAudience(fixedAudience ?? "semua");
      setResult(null);
    }
  }, [open, defaultMessage, fixedAudience]);

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await post<{ queued: number; skipped: number }>("/api/wa/send", {
        message,
        audience,
        rtId: rtId || null,
        residentIds: defaultResidentIds,
        onlyHeads,
      });
      setResult(res);
      toast.success(`${res.queued} pesan masuk antrean pengiriman`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim pesan");
    } finally {
      setSending(false);
    }
  }

  const preview = message
    .replace(/\{\{nama\}\}/g, "Bapak/Ibu")
    .replace(/\{\{nama_rw\}\}/g, "RW 05");

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={title}
      description="Pesan dikirim melalui gateway WhatsApp yang dikonfigurasi di Pengaturan."
      footer={
        result ? (
          <Button onClick={onClose}>Selesai</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={sending}>
              Batal
            </Button>
            <Button onClick={send} loading={sending} disabled={message.trim().length < 5}>
              <Send className="h-4 w-4" />
              Kirim sekarang
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        {result && (
          <div className="animate-fade-in rounded-xl border border-success/30 bg-success-soft p-4">
            <p className="text-[13px] font-semibold text-success">
              {result.queued} pesan berhasil dikirim
              {result.skipped > 0 && `, ${result.skipped} warga dilewati (tidak punya nomor WhatsApp)`}.
            </p>
            <p className="mt-1 text-[12px] text-success/80">
              Pantau status pengiriman pada menu WhatsApp → Log Pesan.
            </p>
          </div>
        )}

        <Field label="Tujuan pengiriman">
          <Select
            value={audience}
            onChange={(e) => setAudience(e.target.value as typeof audience)}
            disabled={Boolean(fixedAudience)}
          >
            <option value="semua">Seluruh warga</option>
            <option value="rt">Warga RT tertentu</option>
            <option value="tunggakan">Warga dengan tunggakan iuran</option>
            <option value="petugas">Petugas kegiatan mendatang</option>
            {fixedAudience === "pilihan" && <option value="pilihan">Warga terpilih</option>}
          </Select>
        </Field>

        {audience === "rt" && (
          <Field label="Pilih RT">
            <Select value={rtId} onChange={(e) => setRtId(e.target.value)}>
              <option value="">— Semua RT —</option>
              {(rtData?.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  RT {r.number} — {r.areaName}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {audience === "semua" && (
          <label className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-muted/40 px-4 py-3">
            <input
              type="checkbox"
              checked={onlyHeads}
              onChange={(e) => setOnlyHeads(e.target.checked)}
              className="h-4 w-4 rounded border-line-strong accent-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <span className="text-[13px]">Hanya kirim ke kepala keluarga</span>
          </label>
        )}

        <Field
          label="Isi pesan"
          hint="Gunakan {{nama}} untuk menyisipkan nama warga."
          required
        >
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={7}
            placeholder="Tulis pesan untuk warga…"
            className="font-mono text-[12.5px]"
          />
        </Field>

        <div className="flex items-center justify-between text-[11.5px] text-muted">
          <span>{message.length} karakter</span>
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() =>
              setMessage(
                "Halo Bapak/Ibu {{nama}} 👋\n\nMengingatkan iuran kebersihan RW {{nama_rw}} bulan ini. Mohon dibayarkan melalui ketua RT masing-masing.\n\nTerima kasih 🙏",
              )
            }
          >
            Pakai contoh pesan
          </button>
        </div>

        {/* Preview */}
        <div className="rounded-2xl border border-line bg-[#efeae2] p-3 dark:bg-[#0f1a17]">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#128c7e]">
            <MessageCircle className="h-3.5 w-3.5" />
            Pratinjau pesan
          </p>
          <div className="ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap text-slate-800 shadow-sm dark:bg-[#005c4b] dark:text-slate-100">
            {preview || "Pesan akan tampil di sini…"}
            <span className="mt-1 block text-right text-[10px] text-slate-500 dark:text-slate-300">
              08.00 ✓✓
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
