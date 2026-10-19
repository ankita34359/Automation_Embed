import { Loader2 } from "lucide-react";

export function Spinner({ className = "h-4 w-4" }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;
}

const BUTTON = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300",
  secondary: "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:text-slate-400",
  ghost: "text-slate-600 hover:bg-slate-100",
};

export function Button({ variant = "primary", loading = false, className = "", children, ...props }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:cursor-not-allowed ${BUTTON[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Card({ className = "", children, ...props }) {
  return <div {...props} className={`rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 ${className}`}>{children}</div>;
}

export const inputClass = (invalid) =>
  `block min-h-11 w-full rounded-xl border-0 bg-white px-3.5 text-base text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm ${invalid ? "ring-red-400" : "ring-slate-300"}`;

export function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800">{label}</label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      <p id={`${id}-error`} role="alert" aria-live="polite" className={error ? "mt-1.5 text-xs font-medium text-red-600" : "sr-only"}>{error || ""}</p>
    </div>
  );
}

const TONES = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
};

export function Badge({ tone = "slate", children, title }) {
  return <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}>{children}</span>;
}
