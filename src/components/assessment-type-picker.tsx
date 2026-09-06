export type AssessmentType = "quiz" | "exam";

const descriptions: Record<AssessmentType, string> = {
  quiz: "Targeted sessions and quick drills",
  exam: "Comprehensive review and mock tests",
};

// Real radio inputs (visually hidden) instead of styled buttons, so keyboard
// and screen-reader users get native semantics for free.
export function AssessmentTypePicker({ value, onChange }: { value: AssessmentType; onChange: (value: AssessmentType) => void }) {
  return (
    <fieldset className="mt-6">
      <legend className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assessment type</legend>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {(["quiz", "exam"] as const).map((type) => (
          <label
            key={type}
            className={`cursor-pointer rounded-xl border px-4 py-3 transition focus-within:ring-4 focus-within:ring-emerald-100 dark:focus-within:ring-emerald-900/40 ${
              value === type
                ? "border-emerald-700 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-100 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900/60"
                : "border-slate-300 bg-white text-slate-600 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-emerald-500"
            }`}
          >
            <input type="radio" name="assessmentType" value={type} checked={value === type} onChange={() => onChange(type)} className="sr-only" />
            <span className="block font-semibold capitalize">{type}</span>
            <span className="mt-1 block text-xs font-normal normal-case text-slate-500 dark:text-slate-400">{descriptions[type]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
