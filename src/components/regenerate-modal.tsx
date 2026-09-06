"use client";

import { useState, type FormEvent } from "react";
import type { LoadedPlan, StoredPlan, StudyPlan } from "@/lib/study-plan";

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

export function RegenerateModal({
  plan,
  isOpen,
  onClose,
  onPlanUpdated,
}: {
  plan: StoredPlan;
  isOpen: boolean;
  onClose: () => void;
  onPlanUpdated: (loaded: LoadedPlan) => void;
}) {
  const completedTopics = plan.topics.filter((t) => t.completed);
  const remainingTopics = plan.topics.filter((t) => !t.completed);

  const [examDate, setExamDate] = useState(plan.examDate);
  const [progressNotes, setProgressNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ plan: StudyPlan; daysRemaining: number } | null>(null);

  if (!isOpen) return null;

  const exam = new Date(`${examDate}T00:00:00`);
  const calculatedDays = Math.max(1, Math.ceil((exam.valueOf() - Date.now()) / 86_400_000));

  async function handleGeneratePreview(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/plans/${plan.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examDate,
          daysRemaining: calculatedDays,
          progressNotes,
          apply: false,
        }),
      });
      const result = (await response.json()) as { previewPlan?: StudyPlan; daysRemaining?: number; error?: string };
      if (!response.ok || !result.previewPlan) {
        throw new Error(result.error ?? "Failed to regenerate schedule.");
      }
      setPreview({ plan: result.previewPlan, daysRemaining: result.daysRemaining ?? calculatedDays });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate schedule.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleApply() {
    if (!preview) return;
    setError("");
    setIsApplying(true);
    try {
      const response = await fetch(`/api/plans/${plan.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examDate,
          daysRemaining: preview.daysRemaining,
          progressNotes,
          apply: true,
        }),
      });
      const result = (await response.json()) as { plan?: StoredPlan; materials?: LoadedPlan["materials"]; error?: string };
      if (!response.ok || !result.plan) {
        throw new Error(result.error ?? "Failed to apply updated plan.");
      }
      onPlanUpdated({
        plan: result.plan,
        materials: result.materials ?? [],
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply updated plan.");
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs dark:bg-black/70">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200 sm:p-8 dark:bg-slate-900 dark:ring-slate-800"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
              Mid-way Adjustment
            </span>
            <h2 id="modal-title" className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
              Recalibrate study schedule
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Update remaining days and priorities. Completed topics are saved and kept marked as done.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-1 dark:ring-rose-900/50">
            {error}
          </p>
        )}

        {preview ? (
          <div className="mt-5 space-y-5">
            <div className="rounded-2xl bg-emerald-50/70 p-4 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:ring-emerald-900/60">
              <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Proposed Schedule Preview</h3>
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">{preview.plan.overview}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <span>{preview.daysRemaining} {preview.daysRemaining === 1 ? "day" : "days"} remaining</span>
                <span>•</span>
                <span>{preview.plan.topics.length} remaining focus areas</span>
                {completedTopics.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="font-semibold">{completedTopics.length} previously completed topics kept</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                New remaining focus areas
              </h4>
              <ol className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {preview.plan.topics.map((topic, i) => (
                  <li key={i} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm dark:border-slate-800 dark:bg-slate-800/60">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                          {i + 1}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{topic.title}</span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Day {topic.suggestedDay} · {formatDuration(topic.estimatedMinutes)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">{topic.rationale}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPreview(null)}
                disabled={isApplying}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Back to edit
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={isApplying}
                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                {isApplying ? "Applying changes…" : "Apply to my plan"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGeneratePreview} className="mt-5 space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/80 dark:bg-slate-950/60 dark:ring-slate-800">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-900 dark:text-slate-100">Current progress</span>
                <span className="text-emerald-700 font-medium dark:text-emerald-400">
                  {completedTopics.length} of {plan.topics.length} completed
                </span>
              </div>
              {completedTopics.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {completedTopics.map((topic) => (
                    <span
                      key={topic.id}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
                    >
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span> {topic.title}
                    </span>
                  ))}
                </div>
              )}
              {remainingTopics.length > 0 && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {remainingTopics.length} incomplete {remainingTopics.length === 1 ? "topic" : "topics"} will be re-budgeted across the remaining days.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="regen-exam-date" className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                Assessment date
              </label>
              <div className="mt-1.5 flex items-center gap-3">
                <input
                  id="regen-exam-date"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/40"
                  required
                />
                <span className="shrink-0 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-2 rounded-xl dark:bg-slate-800 dark:text-slate-400">
                  {calculatedDays} {calculatedDays === 1 ? "day" : "days"} left
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="regen-notes" className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                What feels shaky or has changed? <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
              </label>
              <textarea
                id="regen-notes"
                rows={3}
                value={progressNotes}
                onChange={(e) => setProgressNotes(e.target.value)}
                placeholder="e.g. I breezed through the definitions, but I keep making calculation errors on integrals. Spend more time on practice questions."
                className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/40"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating}
                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                {isGenerating ? "Recalibrating schedule…" : "Generate updated schedule"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
