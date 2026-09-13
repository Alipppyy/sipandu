"use client";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parse(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await parse(res);
  if (!res.ok) {
    throw new ApiError((data as { error?: string })?.error ?? "Terjadi kesalahan", res.status);
  }
  return data as T;
}

export const get = <T,>(url: string) => api<T>(url);
export const post = <T,>(url: string, body?: unknown) =>
  api<T>(url, { method: "POST", body: JSON.stringify(body ?? {}) });
export const patch = <T,>(url: string, body?: unknown) =>
  api<T>(url, { method: "PATCH", body: JSON.stringify(body ?? {}) });
export const del = <T,>(url: string) => api<T>(url, { method: "DELETE" });

export function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}
