import type { AssessmentType } from "@/components/assessment-type-picker";
import { calculateProgress, type StudyPlan, type StudyTopic } from "@/lib/study-plan";

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

function TopicCard({
  topic,
  position,
  onToggle,
  isToggling,
}: {
  topic: StudyTopic;
  position: number;
  onToggle?: (completed: boolean) => void;
  isToggling?: boolean;
}) {
  const isDone = Boolean(topic.completed);

  return (
    <li
      className={`rounded-2xl p-5 shadow-sm ring-1 transition-all ${
        isDone
          ? "bg-slate-50/90 ring-slate-200/80 text-slate-600 dark:bg-slate-900/50 dark:ring-slate-800/70 dark:text-slate-400"
          : "bg-white ring-slate-200 text-slate-900 dark:bg-slate-900 dark:ring-slate-800 dark:text-slate-100"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          {onToggle ? (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isDone}
                disabled={isToggling}
                onChange={(e) => onToggle(e.target.checked)}
                className="h-5 w-5 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 transition cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:checked:bg-emerald-600"
                aria-label={`Mark "${topic.title}" as ${isDone ? "incomplete" : "complete"}`}
              />
            </label>
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
              {position}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-semibold text-base ${isDone ? "line-through text-slate-500 dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}>
                {topic.title}
              </h3>
              {isDone && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                  Done
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 shrink-0">
          Day {topic.suggestedDay} · {formatDuration(topic.estimatedMinutes)}
        </span>
      </div>
      <p className={`mt-3 text-sm leading-6 ${isDone ? "text-slate-500 dark:text-slate-500" : "text-slate-600 dark:text-slate-300"}`}>
        {topic.rationale}
      </p>
      {topic.materials.length > 0 && (
        <div className={`mt-4 rounded-xl p-4 ${isDone ? "bg-slate-100/70 dark:bg-slate-800/30" : "bg-emerald-50/60 dark:bg-slate-800/60"}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">Materials, in order</p>
          <ol className="mt-2 space-y-1">
            {topic.materials.map((material, index) => (
              <li key={material} className="flex gap-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                <span className="shrink-0 font-semibold text-emerald-700 dark:text-emerald-400">{index + 1}.</span>
                <span className={isDone ? "text-slate-500 dark:text-slate-500" : ""}>{material}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </li>
  );
}

export function PlanDisplay({
  plan,
  assessmentType,
  onToggleTopic,
  togglingTopicId,
}: {
  plan: StudyPlan;
  assessmentType: AssessmentType;
  onToggleTopic?: (topic: StudyTopic, index: number, completed: boolean) => void;
  togglingTopicId?: number | null;
}) {
  // A stored plan remembers its own assessment type; a freshly generated one
  // falls back to whatever the form has selected.
  const planType = plan.assessmentType ?? assessmentType;
  const progress = calculateProgress(plan.topics);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Your {planType} study plan</p>
          {plan.title ? (
            <>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{plan.title}</h2>
              <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">{plan.daysRemaining} {plan.daysRemaining === 1 ? "day" : "days"} to prepare</p>
            </>
          ) : (
            <h2 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{plan.daysRemaining} {plan.daysRemaining === 1 ? "day" : "days"} to prepare</h2>
          )}
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{plan.topics.length} focus areas</span>
      </div>

      {plan.topics.length > 0 && (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/80 dark:bg-slate-900/90 dark:ring-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {progress.completedTopics} of {progress.totalTopics} completed
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full dark:bg-emerald-950/70 dark:text-emerald-300">
                {progress.percent}%
              </span>
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {formatDuration(progress.completedMinutes)} done · {formatDuration(progress.remainingMinutes)} remaining
            </span>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-emerald-600 transition-all duration-500 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      <p className="mt-5 leading-7 text-slate-600 dark:text-slate-300">{plan.overview}</p>
      <ol className="mt-7 space-y-4">
        {plan.topics.map((topic, index) => (
          <TopicCard
            key={topic.id != null ? `topic-${topic.id}` : `${topic.suggestedDay}-${topic.priority}-${topic.title}`}
            topic={topic}
            position={index + 1}
            isToggling={topic.id != null && togglingTopicId === topic.id}
            onToggle={
              onToggleTopic
                ? (completed) => onToggleTopic(topic, index, completed)
                : undefined
            }
          />
        ))}
      </ol>
    </div>
  );
}

export function PlanEmptyState() {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">✦</span>
      <h2 className="mt-5 text-xl font-semibold text-slate-900 dark:text-slate-100">Your plan will appear here</h2>
      <p className="mt-2 max-w-sm leading-7 text-slate-500 dark:text-slate-400">Choose an assessment type, add topics or course materials, and you’ll get a focused sequence with realistic time estimates.</p>
    </div>
  );
}
