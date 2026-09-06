import { useEffect, useRef } from "react";

// The inline "name this plan" form, used for saving a draft and for renaming
// a saved plan. It only mounts when opened, so its mount effect is the
// "just opened" moment: scroll the panel into view (it sits below a possibly
// long plan) and focus the input so it's impossible to miss.
export function PlanTitlePanel({ className, id, label, value, onChange, placeholder, hint, submitLabel, isBusy, onSubmit, onCancel }: {
  className: string;
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint: string;
  submitLabel: string;
  isBusy: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const panelRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <form ref={panelRef} onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className={`rounded-2xl bg-white p-4 ring-2 ring-emerald-200 dark:bg-slate-900 dark:ring-emerald-900/60 ${className}`}>
      <label className="text-sm font-semibold text-slate-900 dark:text-slate-100" htmlFor={id}>{label}</label>
      <input ref={inputRef} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/40" id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">Cancel</button>
        <button type="submit" disabled={isBusy} className="rounded-xl bg-emerald-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-emerald-400 dark:bg-emerald-600 dark:hover:bg-emerald-500">{isBusy ? "Saving…" : submitLabel}</button>
      </div>
    </form>
  );
}
