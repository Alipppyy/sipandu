/** Helper membuat berkas CSV yang aman dibuka di Excel (BOM + escaping). */
export function toCsv(rows: Record<string, unknown>[], columns?: { key: string; label: string }[]): string {
  if (!rows.length) return "";
  const cols = columns ?? Object.keys(rows[0]).map((k) => ({ key: k, label: k }));

  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    // Awali dengan apostrof bila diawali =,+,-,@ agar tidak dieksekusi Excel
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    s = s.replace(/"/g, '""');
    return /[",\n\r;]/.test(s) ? `"${s}"` : s;
  };

  const lines = [cols.map((c) => esc(c.label)).join(";")];
  for (const row of rows) {
    lines.push(cols.map((c) => esc(row[c.key])).join(";"));
  }
  // BOM agar Excel mengenali UTF-8
  return "﻿" + lines.join("\r\n");
}

import { NextResponse } from "next/server";

export function csvResponse(csv: string, filename: string) {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
