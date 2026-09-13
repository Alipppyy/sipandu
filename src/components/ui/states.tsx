"use client";

import * as React from "react";
import { Inbox, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Card, Skeleton } from "./primitives";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "px-4 py-10" : "px-6 py-16",
        className,
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface-muted/60 text-muted">
        {icon ?? <Inbox className="h-6 w-6" />}
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  message = "Gagal memuat data",
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          Coba lagi
        </Button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
          {Array.from({ length: cols }).map((__, j) => (
            // lebar bertahap agar tampak natural seperti tabel sungguhan
            <Skeleton key={j} className="h-4" style={{ width: `${[28, 18, 14, 16, 10, 12][j % 6] ?? 14}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <Card className="space-y-3 p-5">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </Card>
  );
}

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="flex items-end gap-2 px-5 py-6" style={{ height }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="flex-1" style={{ height: `${35 + ((i * 37) % 60)}%` }} />
      ))}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  perPage,
  onPage,
  isLoading,
}: {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPage: (p: number) => void;
  isLoading?: boolean;
}) {
  if (!total) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-5 py-3.5 sm:flex-row">
      <p className="text-[13px] text-muted">
        Menampilkan <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> dari{" "}
        <span className="font-medium text-foreground">{total.toLocaleString("id-ID")}</span> data
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || isLoading}
          onClick={() => onPage(page - 1)}
        >
          Sebelumnya
        </Button>
        <span className="px-2 text-[13px] tabular-nums text-muted">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || isLoading}
          onClick={() => onPage(page + 1)}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  );
}
