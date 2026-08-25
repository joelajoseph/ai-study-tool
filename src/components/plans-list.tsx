import { planDisplayLabel } from "@/lib/study-plan";
import type { PlanSummary } from "@/lib/study-plan";

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function PlansList({ plans, persistenceEnabled, isLoading, onOpen, onDelete, onNew }: {
  plans: PlanSummary[];
  persistenceEnabled: boolean;
  isLoading: boolean;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  onNew: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">My plans</h2>
        <button type="button" onClick={onNew} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800">New plan</button>
      </div>

      {!persistenceEnabled && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Persistence isn’t configured (missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY), so plans can’t be saved. You can still generate drafts.
        </p>
      )}

      {plans.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-[#fcfcfa] p-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">✦</span>
          <h3 className="mt-4 text-lg font-semibold">No saved plans yet</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Generate a plan from your course materials, give it a title, and it will show up here.</p>
          <button type="button" onClick={onNew} className="mt-5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800">Generate a plan</button>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {plans.map((plan) => (
            <li key={plan.id} className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:ring-emerald-300">
              <div className="flex items-start justify-between gap-4">
                <button type="button" onClick={() => onOpen(plan.id)} disabled={isLoading} className="min-w-0 flex-1 text-left disabled:cursor-wait">
                  <h3 className="truncate font-semibold group-hover:text-emerald-800">{planDisplayLabel(plan)}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    <span className="capitalize">{plan.assessmentType}</span> · {formatDate(plan.examDate)} · {plan.topicCount} {plan.topicCount === 1 ? "topic" : "topics"} · saved {formatDate(plan.createdAt.slice(0, 10))}
                  </p>
                </button>
                <button type="button" onClick={() => onDelete(plan.id)} className="shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
