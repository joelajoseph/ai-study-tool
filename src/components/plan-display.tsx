import type { AssessmentType } from "@/components/assessment-type-picker";
import type { StudyPlan, StudyTopic } from "@/lib/study-plan";

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

function TopicCard({ topic, position }: { topic: StudyTopic; position: number }) {
  return (
    <li className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {/* The badge is the topic's position in the schedule, not the model's
              internal priority — the list itself is already in study order. */}
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">{position}</span>
          <h3 className="font-semibold">{topic.title}</h3>
        </div>
        <span className="text-sm font-medium text-slate-500">Day {topic.suggestedDay} · {formatDuration(topic.estimatedMinutes)}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{topic.rationale}</p>
      {topic.materials.length > 0 && (
        <div className="mt-4 rounded-xl bg-emerald-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Materials, in order</p>
          <ol className="mt-2 space-y-1">
            {topic.materials.map((material, index) => (
              <li key={material} className="flex gap-2 text-sm leading-6 text-slate-700">
                <span className="shrink-0 font-semibold text-emerald-700">{index + 1}.</span>
                <span>{material}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </li>
  );
}

export function PlanDisplay({ plan, assessmentType }: { plan: StudyPlan; assessmentType: AssessmentType }) {
  // A stored plan remembers its own assessment type; a freshly generated one
  // falls back to whatever the form has selected.
  const planType = plan.assessmentType ?? assessmentType;
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Your {planType} study plan</p>
          {plan.title ? (
            <>
              <h2 className="mt-1 text-2xl font-semibold">{plan.title}</h2>
              <p className="mt-0.5 text-sm font-medium text-slate-500">{plan.daysRemaining} {plan.daysRemaining === 1 ? "day" : "days"} to prepare</p>
            </>
          ) : (
            <h2 className="mt-1 text-2xl font-semibold">{plan.daysRemaining} {plan.daysRemaining === 1 ? "day" : "days"} to prepare</h2>
          )}
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">{plan.topics.length} focus areas</span>
      </div>
      <p className="mt-5 leading-7 text-slate-600">{plan.overview}</p>
      <ol className="mt-7 space-y-4">
        {plan.topics.map((topic, index) => (
          <TopicCard key={`${topic.suggestedDay}-${topic.priority}-${topic.title}`} topic={topic} position={index + 1} />
        ))}
      </ol>
    </div>
  );
}

export function PlanEmptyState() {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">✦</span>
      <h2 className="mt-5 text-xl font-semibold">Your plan will appear here</h2>
      <p className="mt-2 max-w-sm leading-7 text-slate-500">Choose an assessment type, add topics or course materials, and you’ll get a focused sequence with realistic time estimates.</p>
    </div>
  );
}
