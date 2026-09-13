"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/primitives";

/** Mengunduh berkas dari endpoint (CSV) dengan menyertakan kuki sesi. */
export function ExportButton({
  path,
  query,
  filename,
  label = "Ekspor CSV",
  variant = "secondary",
}: {
  path: string;
  query?: Record<string, string | number | undefined>;
  filename: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const [loading, setLoading] = React.useState(false);

  async function download() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query ?? {})) {
        if (v !== undefined && v !== "") params.set(k, String(v));
      }
      const qs = params.toString();
      const res = await fetch(`${path}${qs ? `?${qs}` : ""}`, { credentials: "same-origin" });
      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.error ?? "Gagal mengekspor data");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Berkas CSV berhasil diunduh");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengekspor data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant={variant} onClick={download} loading={loading} title={`Unduh ${label}`}>
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
