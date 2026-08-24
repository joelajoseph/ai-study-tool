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
      <legend className="text-sm font-semibold">Assessment type</legend>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {(["quiz", "exam"] as const).map((type) => (
          <label
            key={type}
            className={`cursor-pointer rounded-xl border px-4 py-3 transition focus-within:ring-4 focus-within:ring-emerald-100 ${
              value === type
                ? "border-emerald-700 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-100"
                : "border-slate-300 bg-white text-slate-600 hover:border-emerald-400"
            }`}
          >
            <input type="radio" name="assessmentType" value={type} checked={value === type} onChange={() => onChange(type)} className="sr-only" />
            <span className="block font-semibold capitalize">{type}</span>
            <span className="mt-1 block text-xs font-normal normal-case">{descriptions[type]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
