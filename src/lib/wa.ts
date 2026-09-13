import "server-only";
import { prisma } from "./prisma";
import type { MessageCategory, MessageStatus } from "@prisma/client";
import { normalizePhone } from "./utils";

export type SendResult =
  | { ok: true; providerId?: string; simulated: boolean }
  | { ok: false; error: string };

/** Ambil (atau buat) profil RW — aplikasi ini single-tenant untuk satu RW. */
export async function getProfile() {
  let profile = await prisma.rwProfile.findFirst();
  if (!profile) {
    profile = await prisma.rwProfile.create({ data: {} });
  }
  return profile;
}

/* ────────────────────────────────────────────────────────────
 * Template rendering
 * ──────────────────────────────────────────────────────────── */

export type RenderVars = Record<string, string | number | undefined | null>;

export function renderTemplate(body: string, vars: RenderVars, profile?: Awaited<ReturnType<typeof getProfile>>) {
  const all: RenderVars = {
    nama_rw: profile ? `RW ${profile.rwNumber}` : "RW",
    ketua_rw: profile?.ketuaName ?? "",
    kontak_rw: profile?.ketuaPhone ?? "",
    alamat_rw: profile?.address ?? "",
    kelurahan: profile?.village ?? "",
    kecamatan: profile?.district ?? "",
    kota: profile?.city ?? "",
    ...vars,
  };
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const value = all[key];
    return value === undefined || value === null || value === "" ? "-" : String(value);
  });
}

export async function renderByKey(key: string, vars: RenderVars) {
  const [profile, tpl] = await Promise.all([
    getProfile(),
    prisma.messageTemplate.findUnique({ where: { key } }),
  ]);
  if (!tpl) return null;
  return renderTemplate(tpl.body, vars, profile);
}

/* ────────────────────────────────────────────────────────────
 * Provider
 * ──────────────────────────────────────────────────────────── */

async function sendFonnte(phone: string, message: string, token: string, sender?: string | null): Promise<SendResult> {
  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: phone,
      message,
      countryCode: "62",
      ...(sender ? { device: sender } : {}),
    }),
  }).catch(() => null as unknown as Response);

  if (!res || !res.ok) {
    return { ok: false, error: `Gateway HTTP ${res?.status ?? "tidak terhubung"}` };
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (json.status === true || json.status === "true") {
    return { ok: true, providerId: String(json.id ?? json.detail ?? "") || undefined, simulated: false };
  }
  const reason =
    (json.reason as string) ||
    (json.message as string) ||
    (Array.isArray(json.detail) ? String(json.detail[0]) : "") ||
    "Gateway menolak pesan";
  return { ok: false, error: String(reason) };
}

async function sendWablas(phone: string, message: string, token: string): Promise<SendResult> {
  const res = await fetch("https://phone.wablas.com/api/v2/send-message", {
    method: "POST",
    headers: {
      Authorization: `${token}.wablas`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: [{ phone, message }] }),
  }).catch(() => null as unknown as Response);
  if (!res || !res.ok) return { ok: false, error: `Gateway HTTP ${res?.status ?? "tidak terhubung"}` };
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (json.status === true) return { ok: true, providerId: String(json.data ?? "") || undefined, simulated: false };
  return { ok: false, error: String(json.message ?? "Gateway menolak pesan") };
}

async function sendMeta(phone: string, message: string, token: string): Promise<SendResult> {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  if (!phoneNumberId) return { ok: false, error: "META_PHONE_NUMBER_ID belum diatur" };
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { preview_url: false, body: message },
    }),
  }).catch(() => null as unknown as Response);
  if (!res || !res.ok) return { ok: false, error: `Gateway HTTP ${res?.status ?? "tidak terhubung"}` };
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const id = (json.messages as { id?: string }[] | undefined)?.[0]?.id;
  if (id) return { ok: true, providerId: id, simulated: false };
  return { ok: false, error: String((json.error as { message?: string })?.message ?? "Gateway menolak pesan") };
}

export async function deliver(phone: string, message: string): Promise<SendResult> {
  const profile = await getProfile();
  const normalized = normalizePhone(phone);
  if (!normalized) return { ok: false, error: "Nomor WhatsApp tidak valid" };

  if (!profile.waEnabled) {
    return { ok: true, simulated: true };
  }
  const token = profile.waToken || process.env.FONNTE_TOKEN || "";
  if (!token) return { ok: true, simulated: true };

  switch (profile.waProvider) {
    case "wablas":
      return sendWablas(normalized, message, token);
    case "meta":
      return sendMeta(normalized, message, token);
    case "fonnte":
    default:
      return sendFonnte(normalized, message, token, profile.waSender);
  }
}

/* ────────────────────────────────────────────────────────────
 * Outbox
 * ──────────────────────────────────────────────────────────── */

export type EnqueueInput = {
  toPhone: string;
  toName: string;
  body: string;
  category: MessageCategory;
  templateKey?: string | null;
  relatedType?: string;
  relatedId?: string;
  sendImmediately?: boolean;
};

export async function enqueue(input: EnqueueInput) {
  const normalized = normalizePhone(input.toPhone);
  const message = await prisma.waMessage.create({
    data: {
      toPhone: normalized ?? input.toPhone,
      toName: input.toName,
      body: input.body,
      category: input.category,
      templateKey: input.templateKey,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
      status: normalized ? "ANTRIAN" : "GAGAL",
      error: normalized ? null : "Nomor WhatsApp tidak valid",
      scheduledAt: new Date(),
      provider: (await getProfile()).waProvider,
    },
  });

  if (input.sendImmediately === false) return message;
  if (message.status === "ANTRIAN") {
    return processMessage(message.id);
  }
  return message;
}

export async function processMessage(id: string) {
  const message = await prisma.waMessage.findUnique({ where: { id } });
  if (!message || (message.status !== "ANTRIAN" && message.status !== "DRAFT")) return message;

  const result = await deliver(message.toPhone, message.body);
  const nextStatus: MessageStatus = result.ok
    ? result.simulated
      ? "TERKIRIM_SIMULASI"
      : "TERKIRIM"
    : "GAGAL";

  return prisma.waMessage.update({
    where: { id: message.id },
    data: {
      status: nextStatus,
      attempts: { increment: 1 },
      sentAt: result.ok ? new Date() : null,
      providerId: result.ok ? result.providerId ?? null : null,
      error: result.ok ? null : result.error,
    },
  });
}

/** Kirim ulang pesan yang gagal / masih draft. */
export async function retryMessage(id: string) {
  await prisma.waMessage.update({
    where: { id },
    data: { status: "ANTRIAN", error: null },
  });
  return processMessage(id);
}

export async function processOutbox(limit = 50) {
  const queue = await prisma.waMessage.findMany({
    where: { status: "ANTRIAN" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  let sent = 0;
  let failed = 0;
  for (const m of queue) {
    const res = await processMessage(m.id);
    if (res?.status === "GAGAL") failed++;
    else sent++;
  }
  return { processed: queue.length, sent, failed };
}

export async function waStats() {
  const [total, sent, failed, queued, today] = await Promise.all([
    prisma.waMessage.count(),
    prisma.waMessage.count({ where: { status: { in: ["TERKIRIM", "TERKIRIM_SIMULASI"] } } }),
    prisma.waMessage.count({ where: { status: "GAGAL" } }),
    prisma.waMessage.count({ where: { status: "ANTRIAN" } }),
    prisma.waMessage.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
  ]);
  return { total, sent, failed, queued, today };
}
