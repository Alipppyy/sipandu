"use client";

import * as React from "react";
import { EmptyState, ErrorState, TableSkeleton } from "./states";

export type Column<T> = {
  key: string;
  header: string;
  /** Kelas tambahan untuk <td>/<th>, gunakan util responsif Tailwind untuk menyembunyikan kolom. */
  className?: string;
  headerClassName?: string;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  error,
  onRetry,
  onRowClick,
  renderCard,
  empty,
  skeletonRows = 5,
  rowActions,
  dense = false,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  renderCard?: (row: T) => React.ReactNode;
  empty?: React.ReactNode;
  skeletonRows?: number;
  rowActions?: (row: T) => React.ReactNode;
  dense?: boolean;
}) {
  if (error) return <ErrorState onRetry={onRetry} />;
  if (loading) return <TableSkeleton rows={skeletonRows} cols={columns.length} />;
  if (!rows.length) return <>{empty ?? <EmptyState title="Belum ada data" compact />}</>;

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto scrollbar-thin md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface-muted/40">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted ${
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""
                  } ${c.headerClassName ?? c.className ?? ""}`}
                >
                  {c.header}
                </th>
              ))}
              {rowActions && <th className="w-12 px-4 py-2.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={`group transition-colors hover:bg-surface-hover ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 ${dense ? "py-2.5" : "py-3"} text-[13px] ${
                      c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""
                    } ${c.className ?? ""}`}
                  >
                    {c.cell(row)}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-2 text-right" onClick={(e) => e.stopPropagation()}>
                    {rowActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      {renderCard && (
        <div className="divide-y divide-line md:hidden">
          {rows.map((row) => (
            <div
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`relative px-4 py-3 transition-colors ${onRowClick ? "active:bg-surface-hover" : ""}`}
            >
              {renderCard(row)}
              {rowActions && (
                <div className="absolute right-2 top-2" onClick={(e) => e.stopPropagation()}>
                  {rowActions(row)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* Menu aksi baris (titik tiga) */
export function RowActions({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        aria-label="Aksi"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open && (
        <div className="animate-scale-in absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-xl">
          {React.Children.map(children, (child) =>
            React.isValidElement(child)
              ? React.cloneElement(child as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
                  onClick: (e: React.MouseEvent) => {
                    e.stopPropagation();
                    (child.props as { onClick?: (e: React.MouseEvent) => void }).onClick?.(e);
                    setOpen(false);
                  },
                })
              : child,
          )}
        </div>
      )}
    </div>
  );
}

export function ActionItem({
  onClick,
  icon,
  children,
  destructive,
}: {
  onClick: (e: React.MouseEvent) => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-surface-muted ${
        destructive ? "text-danger" : "text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
