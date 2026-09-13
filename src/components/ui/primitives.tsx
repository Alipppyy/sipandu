"use client";

import * as React from "react";
import { Loader2, X, Search } from "lucide-react";
import { cn, avatarColorClass, initials } from "@/lib/utils";

/* ── Button ─────────────────────────────────────────────── */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline" | "soft";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const variants: Record<string, string> = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary-strong shadow-sm shadow-primary/20",
    secondary: "bg-surface-muted text-foreground hover:bg-surface-hover border border-line",
    outline: "border border-line bg-surface text-foreground hover:bg-surface-muted",
    ghost: "text-muted hover:bg-surface-muted hover:text-foreground",
    soft: "bg-primary-soft text-primary hover:brightness-95 dark:hover:brightness-110",
    danger: "bg-danger text-white hover:brightness-95 shadow-sm",
  };
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
    md: "h-9.5 px-4 text-sm gap-2 rounded-lg",
    lg: "h-11 px-5 text-sm gap-2 rounded-xl",
    icon: "h-9 w-9 rounded-lg",
  };
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all whitespace-nowrap",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        "disabled:opacity-55 disabled:cursor-not-allowed active:scale-[0.98]",
        sizes[size],
        variants[variant],
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

/* ── Card ───────────────────────────────────────────────── */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/* ── Inputs ─────────────────────────────────────────────── */

const fieldBase =
  "w-full rounded-lg border border-line bg-surface px-3 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(fieldBase, "h-9.5 py-2", invalid && "border-danger focus:ring-danger/25", className)}
      style={{ height: "2.375rem" }}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, "min-h-24 py-2 leading-relaxed", className)} {...props} />;
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        fieldBase,
        "h-9.5 cursor-pointer appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-9",
        className,
      )}
      style={{
        height: "2.375rem",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.2' stroke-linecap='round'><path d='m6 9 6 6 6-6'/></svg>\")",
      }}
      {...props}
    >
      {children}
    </select>
  );
});

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="flex items-center gap-1 text-[13px] font-medium text-foreground">
          {label}
          {required && <span className="text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Cari…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          aria-label="Bersihkan pencarian"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex items-start gap-3", disabled ? "opacity-60" : "cursor-pointer")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5.5 w-10 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-line-strong/60",
        )}
        style={{ height: "1.375rem", width: "2.5rem" }}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5.5" : "translate-x-0.5",
          )}
          style={{ height: "1.125rem", width: "1.125rem", transform: checked ? "translateX(1.25rem)" : "translateX(0.125rem)" }}
        />
      </button>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium">{label}</span>}
          {description && <span className="block text-xs text-muted">{description}</span>}
        </span>
      )}
    </label>
  );
}

/* ── Badge ──────────────────────────────────────────────── */

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-foreground border-line",
  primary: "bg-primary-soft text-primary border-transparent",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  info: "bg-info-soft text-info border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5 whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const dotTones: Record<BadgeTone, string> = {
  neutral: "bg-slate-400",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

export function BadgeDot({ tone = "neutral", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <Badge tone={tone}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dotTones[tone])} />
      {children}
    </Badge>
  );
}

/* ── Avatar ─────────────────────────────────────────────── */

export function Avatar({
  name,
  color,
  size = "md",
  className,
}: {
  name: string;
  color?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-[11px]",
    md: "h-9 w-9 text-xs",
    lg: "h-12 w-12 text-sm",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white/10",
        avatarColorClass(color),
        sizes[size],
        className,
      )}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

/* ── Loading ────────────────────────────────────────────── */

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("skeleton", className)} style={style} />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}

/* ── Segmented / Tabs ───────────────────────────────────── */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; count?: number }[];
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all",
            value === o.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted hover:bg-surface-muted hover:text-foreground",
          )}
        >
          {o.label}
          {typeof o.count === "number" && (
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px] font-semibold",
                value === o.value ? "bg-white/25" : "bg-surface-muted text-muted",
              )}
            >
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── Progress ───────────────────────────────────────────── */

export function Progress({
  value,
  className,
  tone = "primary",
}: {
  value: number;
  className?: string;
  tone?: BadgeTone;
}) {
  const barTone: Record<BadgeTone, string> = {
    neutral: "bg-slate-400",
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    info: "bg-info",
  };
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", barTone[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/* ── Tooltip-ish helper ─────────────────────────────────── */

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-muted">
      {children}
    </kbd>
  );
}
