import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export const BULAN_LIST = BULAN;
export const BULAN_PENDEK_LIST = BULAN_PENDEK;

export function formatCurrency(value: number | null | undefined) {
  const n = Number(value ?? 0);
  return "Rp " + new Intl.NumberFormat("id-ID").format(n);
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID").format(Number(value ?? 0));
}

export function formatDate(date: Date | string | null | undefined, withDay = false) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  const base = `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  return withDay ? `${HARI[d.getDay()]}, ${base}` : base;
}

export function formatDateShort(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  return `${formatDate(date, false)}, ${formatTime(date)}`;
}

export function formatRelative(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const suffix = diff >= 0 ? "lalu" : "lagi";
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit ${suffix}`;
  if (hours < 24) return `${hours} jam ${suffix}`;
  if (days < 30) return `${days} hari ${suffix}`;
  if (days < 365) return `${Math.round(days / 30)} bulan ${suffix}`;
  return `${Math.round(days / 365)} tahun ${suffix}`;
}

/** Ambil inisial untuk avatar. */
export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Normalisasi nomor HP Indonesia ke format 62xxxxxxxxxxx */
export function normalizePhone(phone?: string | null) {
  if (!phone) return null;
  let p = phone.replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "62" + p.slice(1);
  if (p.startsWith("8")) p = "62" + p;
  if (!/^62\d{8,15}$/.test(p)) return null;
  return p;
}

export function formatPhoneDisplay(phone?: string | null) {
  if (!phone) return "—";
  const p = normalizePhone(phone) ?? phone;
  if (p.startsWith("62")) return "0" + p.slice(2);
  return p;
}

export function maskPhone(phone?: string | null) {
  const p = normalizePhone(phone);
  if (!p) return "—";
  return p.slice(0, 4) + "••••" + p.slice(-3);
}

export function calculateAge(birthDate: Date | string) {
  const d = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const AVATAR_COLORS: Record<string, string> = {
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  teal: "bg-teal-500",
  indigo: "bg-indigo-500",
  orange: "bg-orange-500",
};

export function avatarColorClass(color?: string | null) {
  return AVATAR_COLORS[color ?? "emerald"] ?? AVATAR_COLORS.emerald;
}

export function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export function toISODateInput(date: Date | string | null | undefined) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function toISODateTimeLocal(date: Date | string | null | undefined) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

/* ── Terbilang (angka → kata, Bahasa Indonesia) ──────────── */

const ANGKA = [
  "nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan",
  "sepuluh", "sebelas",
];

function bilangan(n: number): string {
  if (n <= 0) return "";
  if (n < 12) return ANGKA[n];
  if (n < 20) return `${bilangan(n - 10)} belas`;
  if (n < 100) {
    const puluh = Math.floor(n / 10);
    const sisa = n % 10;
    return [`${bilangan(puluh)} puluh`, bilangan(sisa)].filter(Boolean).join(" ");
  }
  if (n < 200) return ["seratus", bilangan(n - 100)].filter(Boolean).join(" ");
  if (n < 1000) {
    const ratus = Math.floor(n / 100);
    const sisa = n % 100;
    return [`${bilangan(ratus)} ratus`, bilangan(sisa)].filter(Boolean).join(" ");
  }
  if (n < 2000) return ["seribu", bilangan(n - 1000)].filter(Boolean).join(" ");
  if (n < 1_000_000) {
    const ribu = Math.floor(n / 1000);
    const sisa = n % 1000;
    return [`${bilangan(ribu)} ribu`, bilangan(sisa)].filter(Boolean).join(" ");
  }
  if (n < 1_000_000_000) {
    const juta = Math.floor(n / 1_000_000);
    const sisa = n % 1_000_000;
    return [`${bilangan(juta)} juta`, bilangan(sisa)].filter(Boolean).join(" ");
  }
  if (n < 1_000_000_000_000) {
    const miliar = Math.floor(n / 1_000_000_000);
    const sisa = n % 1_000_000_000;
    return [`${bilangan(miliar)} miliar`, bilangan(sisa)].filter(Boolean).join(" ");
  }
  return String(n);
}

export function terbilang(value: number): string {
  const n = Math.abs(Math.round(Number(value ?? 0)));
  if (n === 0) return "nol rupiah";
  return `${bilangan(n)} rupiah`.replace(/\s+/g, " ").trim();
}
