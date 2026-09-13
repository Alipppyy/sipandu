"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./primitives";

/* ── Modal ──────────────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="animate-fade-in absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "animate-scale-in relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl",
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight">{title}</h3>
            {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            aria-label="Tutup"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-muted/40 px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ── Confirm dialog ─────────────────────────────────────── */

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Konfirmasi tindakan",
  message,
  confirmLabel = "Ya, lanjutkan",
  cancelLabel = "Batal",
  destructive = true,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            destructive ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary",
          )}
        >
          {destructive ? <Trash2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        </span>
        <p className="pt-1.5 text-sm leading-relaxed text-muted">{message}</p>
      </div>
    </Modal>
  );
}

/* ── Slide-over (detail panel) ──────────────────────────── */

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="animate-fade-in absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div className={cn("animate-slide-in-right relative flex h-full w-full flex-col bg-surface shadow-2xl", width)}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-tight">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="-mr-1 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            aria-label="Tutup"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center gap-2 border-t border-line bg-surface-muted/40 px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
