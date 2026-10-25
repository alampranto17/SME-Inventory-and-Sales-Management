"use client";

// Small reusable UI pieces, styled with Tailwind CSS.
// Import what you need:  import { Button, Input, Card } from "@/components/ui";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

// ── Button ───────────────────────────────────
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
};

export function Button({
  variant = "primary",
  loading,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}

// ── Input with a label ───────────────────────
type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string };

export function Input({ label, className = "", ...rest }: InputProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      )}
      <input
        className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${className}`}
        {...rest}
      />
    </label>
  );
}

// ── Select (dropdown) with a label ───────────
type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  children: ReactNode;
};

export function Select({ label, className = "", children, ...rest }: SelectProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      )}
      <select
        className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 ${className}`}
        {...rest}
      >
        {children}
      </select>
    </label>
  );
}

// ── Card (white box) ─────────────────────────
export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── Page title + buttons on the right ────────
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// ── Red error box ────────────────────────────
export function ErrorBox({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  );
}

// ── Green success box ────────────────────────
export function SuccessBox({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
      {message}
    </div>
  );
}

export function Loading() {
  return <p className="py-8 text-center text-sm text-slate-500">Loading...</p>;
}

export function Empty({ text = "Nothing here yet." }: { text?: string }) {
  return <p className="py-8 text-center text-sm text-slate-500">{text}</p>;
}

// ── Coloured status label ────────────────────
const BADGE_COLORS: Record<string, string> = {
  confirmed: "bg-blue-50 text-blue-700",
  shipped: "bg-amber-50 text-amber-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-amber-50 text-amber-700",
  received: "bg-green-50 text-green-700",
  low: "bg-red-50 text-red-700",
  ok: "bg-green-50 text-green-700",
  IN: "bg-green-50 text-green-700",
  OUT: "bg-red-50 text-red-700",
  ADJUST: "bg-amber-50 text-amber-700",
  TRANSFER: "bg-blue-50 text-blue-700",
};

export function Badge({ value, label }: { value: string; label?: string }) {
  const color = BADGE_COLORS[value] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label ?? value}
    </span>
  );
}

// ── Popup window ─────────────────────────────
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      {/* stopPropagation -> clicking inside the box does NOT close it */}
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ── Previous / Next page buttons ─────────────
export function Pagination({
  page,
  limit,
  total,
  onChange,
}: {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
      <span>
        Page {page} of {totalPages} · {total} total
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

// table styles used on many pages
export const tableClass = "w-full text-left text-sm";
export const thClass = "border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500";
export const tdClass = "border-b border-slate-100 px-3 py-2 text-slate-700";
