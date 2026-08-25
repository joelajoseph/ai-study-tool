"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { AssessmentTypePicker } from "@/components/assessment-type-picker";
import { ChatPanel } from "@/components/chat-panel";
import { PlanDisplay, PlanEmptyState } from "@/components/plan-display";
import { PlanTitlePanel } from "@/components/plan-title-panel";
import { PlansList } from "@/components/plans-list";
import { SavedMaterials } from "@/components/saved-materials";
import { MAX_IMAGE_UPLOADS } from "@/lib/constants";
import { defaultPlanTitle } from "@/lib/study-plan";
import type { LoadedPlan, MaterialSummary, PlanDraft, PlanSummary, StoredPlan, StudyPlan } from "@/lib/study-plan";

export default function Home() {
  const view = useAppView();

  return (
    <main className="min-h-screen bg-[#f7f7f3] text-slate-900">
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-16">
        <header className="mb-10 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Focused study, one plan at a time</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Turn your course material into a calm, clear plan.</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">Share your notes and what feels shaky. We’ll organize the work around your exam date.</p>
        </header>

        {view.current !== "generate" && view.current !== "draft" && view.error && (
          <p role="alert" className="mx-auto mb-6 max-w-3xl rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{view.error}</p>
        )}

        {view.current === "list" && (
          <PlansList
            plans={view.plans}
            persistenceEnabled={view.persistenceEnabled}
            isLoading={view.isLoadingPlan}
            onOpen={view.openPlan}
            onDelete={view.deletePlan}
            onNew={view.startNewPlan}
          />
        )}

        {(view.current === "generate" || view.current === "draft") && (
          <div>
            <button type="button" onClick={view.backToPlans} className="mb-5 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">← My plans</button>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <form onSubmit={view.submit} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-800">1</span><div><h2 className="text-lg font-semibold">Tell me what you’re studying</h2><p className="text-sm text-slate-500">{view.persistenceEnabled ? "Generating makes a draft — save it to keep it." : "Persistence isn’t configured, so drafts can’t be saved."}</p></div></div>
              <AssessmentTypePicker value={view.assessmentType} onChange={view.setAssessmentType} />
              <label className="mt-6 block text-sm font-semibold" htmlFor="exam-date">{view.assessmentType === "quiz" ? "Quiz" : "Exam"} date</label>
              <input className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" id="exam-date" type="date" value={view.examDate} min={new Date().toISOString().slice(0, 10)} onChange={(event) => view.setExamDate(event.target.value)} required />
              <label className="mt-6 block text-sm font-semibold" htmlFor="topics">Topics</label>
              <textarea className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 leading-6 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" id="topics" placeholder="List the chapters, learning objectives, or specific concepts to cover…" value={view.topics} onChange={(event) => view.setTopics(event.target.value)} />
              <label className="mt-6 block text-sm font-semibold" htmlFor="course-materials">Course study materials</label>
              <textarea className="mt-2 min-h-32 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 leading-6 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" id="course-materials" placeholder="Paste lecture notes, textbook references, past-paper questions, or practice problems…" value={view.courseMaterials} onChange={(event) => view.setCourseMaterials(event.target.value)} />
              <label className="mt-6 block text-sm font-semibold" htmlFor="files">Upload course study materials <span className="font-normal text-slate-500">(optional)</span></label>
              <input className="mt-2 block w-full cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:font-semibold file:text-emerald-800 hover:file:bg-emerald-200" id="files" type="file" accept=".pdf,.txt,image/*" multiple onChange={view.handleFiles} />
              {view.files.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {view.files.map((file) => (
                    <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <span className="truncate text-slate-700">{file.name}</span>
                      <button type="button" onClick={() => view.removeFile(file)} aria-label={`Remove ${file.name}`} className="shrink-0 rounded-full px-2 text-base leading-6 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="mt-6 block text-sm font-semibold" htmlFor="background">What do you already know or feel behind on?</label>
              <textarea className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 leading-6 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" id="background" placeholder="For example: I understand chapters 1–3, but I keep mixing up the formulas in chapter 5." value={view.background} onChange={(event) => view.setBackground(event.target.value)} />
              {view.error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{view.error}</p>}
              <button disabled={view.isGenerating} className="mt-6 w-full rounded-xl bg-emerald-700 px-5 py-3.5 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-emerald-400" type="submit">{view.isGenerating ? "Building your plan…" : "Generate a draft plan"}</button>
            </form>

            <section aria-live="polite" className="rounded-3xl border border-dashed border-slate-300 bg-[#fcfcfa] p-6 sm:p-8">
              {view.warning && <p className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{view.warning}</p>}
              {view.draftPlan && view.draftPayload ? (
                <>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-100">
                    <p className="text-sm font-medium text-amber-800">Draft — not saved yet</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={view.discardDraft} className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600">Discard</button>
                      <button type="button" onClick={view.openSavePanel} aria-expanded={view.savePanelOpen} disabled={!view.persistenceEnabled} title={view.persistenceEnabled ? undefined : "Configure Supabase to save plans"} className="rounded-xl bg-emerald-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300">{view.savePanelOpen ? "Save plan ↓" : "Save plan"}</button>
                    </div>
                  </div>
                  <PlanDisplay plan={view.draftPlan} assessmentType={view.assessmentType} />
                  {view.savePanelOpen && (
                    <PlanTitlePanel
                      className="mt-5"
                      id="plan-title"
                      label="Give this plan a title"
                      value={view.saveTitle}
                      onChange={view.setSaveTitle}
                      placeholder={defaultPlanTitle(view.draftPlan.assessmentType ?? view.assessmentType, view.draftPayload.examDate)}
                      hint={`Leave blank to use “${defaultPlanTitle(view.draftPlan.assessmentType ?? view.assessmentType, view.draftPayload.examDate)}”.`}
                      submitLabel="Save plan"
                      isBusy={view.isSaving}
                      onSubmit={view.savePlan}
                      onCancel={view.closeSavePanel}
                    />
                  )}
                </>
              ) : (
                <PlanEmptyState />
              )}
            </section>
            </div>
          </div>
        )}

        {view.current === "saved" && view.loaded && (
          <div className="mx-auto max-w-3xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <button type="button" onClick={view.backToList} className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">← My plans</button>
              <button type="button" onClick={view.openRenamePanel} aria-expanded={view.renamePanelOpen} className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-400 hover:text-emerald-800">{view.renamePanelOpen ? "Rename ↑" : "Rename"}</button>
            </div>
            {view.renamePanelOpen && (
              <PlanTitlePanel
                className="mb-5"
                id="rename-title"
                label="Plan title"
                value={view.renameTitle}
                onChange={view.setRenameTitle}
                placeholder={defaultPlanTitle(view.loaded.plan.assessmentType, view.loaded.plan.examDate)}
                hint={`Leave blank to use the generated label “${defaultPlanTitle(view.loaded.plan.assessmentType, view.loaded.plan.examDate)}”.`}
                submitLabel="Save title"
                isBusy={view.isRenaming}
                onSubmit={view.renamePlan}
                onCancel={view.closeRenamePanel}
              />
            )}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <PlanDisplay plan={view.loaded.plan} assessmentType={view.loaded.plan.assessmentType} />
              <SavedMaterials materials={view.loaded.materials} />
              {/* key forces a fresh mount per plan, so switching plans
                  reloads that plan's conversation instead of keeping the
                  previous one's messages. */}
              <ChatPanel key={view.loaded.plan.id} planId={view.loaded.plan.id} />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

// Groups all view state and actions in one hook-like function so the JSX
// above stays readable. It's a plain function — React Compiler handles the
// memoization.
function useAppView() {
  const [current, setCurrent] = useState<"list" | "generate" | "draft" | "saved">("list");
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [persistenceEnabled, setPersistenceEnabled] = useState(true);
  const [loaded, setLoaded] = useState<LoadedPlan | null>(null);
  const [draftPlan, setDraftPlan] = useState<StudyPlan | null>(null);
  const [draftPayload, setDraftPayload] = useState<PlanDraft | null>(null);
  const [savePanelOpen, setSavePanelOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [renamePanelOpen, setRenamePanelOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [examDate, setExamDate] = useState("");
  const [assessmentType, setAssessmentType] = useState<"quiz" | "exam">("exam");
  const [topics, setTopics] = useState("");
  const [courseMaterials, setCourseMaterials] = useState("");
  const [background, setBackground] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  async function refreshPlans() {
    try {
      const response = await fetch("/api/plans");
      const result = (await response.json()) as { plans?: PlanSummary[]; persistenceEnabled?: boolean };
      setPlans(result.plans ?? []);
      setPersistenceEnabled(result.persistenceEnabled ?? false);
    } catch {
      setPersistenceEnabled(false);
    }
  }

  useEffect(() => {
    // Declared inside the effect so the hooks lint rule can see that state
    // updates only happen after the awaited fetch, never synchronously.
    async function loadPlansOnMount() {
      try {
        const response = await fetch("/api/plans");
        const result = (await response.json()) as { plans?: PlanSummary[]; persistenceEnabled?: boolean };
        setPlans(result.plans ?? []);
        setPersistenceEnabled(result.persistenceEnabled ?? false);
      } catch {
        setPersistenceEnabled(false);
      }
    }
    void loadPlansOnMount();
  }, []);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []));
    // Clear the input so picking the same file again still fires onChange and
    // the browser's "N files selected" text never disagrees with our list.
    event.target.value = "";
  }

  function removeFile(target: File) {
    setFiles(files.filter((file) => file !== target));
  }

  function findFileProblem() {
    // Per-file size check temporarily removed for testing (see constants.ts).
    if (files.filter((file) => file.type.startsWith("image/")).length > MAX_IMAGE_UPLOADS) {
      return `Too many images. Upload at most ${MAX_IMAGE_UPLOADS}.`;
    }
    return null;
  }

  function startNewPlan() {
    setExamDate("");
    setAssessmentType("exam");
    setTopics("");
    setCourseMaterials("");
    setBackground("");
    setFiles([]);
    setDraftPlan(null);
    setDraftPayload(null);
    setSavePanelOpen(false);
    setWarning("");
    setError("");
    setCurrent("generate");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setWarning("");
    setDraftPlan(null);
    setDraftPayload(null);
    setSavePanelOpen(false);
    if (!examDate) return setError("Choose the date of your assessment.");
    if (!topics.trim() && !courseMaterials.trim() && files.length === 0) return setError("Add topics, course study materials, or at least one file.");
    const fileProblem = findFileProblem();
    if (fileProblem) return setError(fileProblem);

    const formData = new FormData();
    formData.append("examDate", examDate);
    formData.append("assessmentType", assessmentType);
    formData.append("topics", topics);
    formData.append("courseMaterials", courseMaterials);
    formData.append("background", background);
    files.forEach((file) => formData.append("files", file));

    setIsGenerating(true);
    try {
      const response = await fetch("/api/study-plan", { method: "POST", body: formData });
      const result = (await response.json()) as { plan?: StudyPlan; draft?: PlanDraft; error?: string; warning?: string };
      if (!response.ok || !result.plan || !result.draft) throw new Error(result.error ?? "We couldn't generate a study plan.");
      setDraftPlan(result.plan);
      setDraftPayload(result.draft);
      if (result.warning) setWarning(result.warning);
      setCurrent("draft");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We couldn't generate a study plan.");
    } finally {
      setIsGenerating(false);
    }
  }

  // Back-navigation from the form/draft view. A draft only lives in client
  // state, so leaving it is a pure client reset — just confirm first.
  function backToPlans() {
    if (draftPlan && !window.confirm("Go back to My plans? Your draft hasn't been saved.")) return;
    setDraftPlan(null);
    setDraftPayload(null);
    setWarning("");
    setSavePanelOpen(false);
    setCurrent("list");
    void refreshPlans();
  }

  function discardDraft() {
    if (!window.confirm("Discard this draft? It hasn't been saved.")) return;
    setDraftPlan(null);
    setDraftPayload(null);
    setWarning("");
    setSavePanelOpen(false);
    setCurrent("list");
    void refreshPlans();
  }

  function openSavePanel() {
    setSaveTitle("");
    setError("");
    setSavePanelOpen(true);
  }

  function closeSavePanel() {
    setSavePanelOpen(false);
    setSaveTitle("");
  }

  async function savePlan() {
    if (!draftPlan || !draftPayload) return;
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: saveTitle, plan: draftPlan, draft: draftPayload }),
      });
      const result = (await response.json()) as { plan?: StoredPlan; materials?: MaterialSummary[]; error?: string };
      if (!response.ok || !result.plan) throw new Error(result.error ?? "We couldn't save the plan.");
      setLoaded({ plan: result.plan, materials: result.materials ?? [] });
      setDraftPlan(null);
      setDraftPayload(null);
      setSavePanelOpen(false);
      setSaveTitle("");
      setWarning("");
      setCurrent("saved");
      window.scrollTo({ top: 0, behavior: "smooth" });
      void refreshPlans();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We couldn't save the plan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function openPlan(id: number) {
    setIsLoadingPlan(true);
    setError("");
    try {
      const response = await fetch(`/api/plans/${id}`);
      const result = (await response.json()) as { plan?: StoredPlan; materials?: MaterialSummary[]; error?: string };
      if (!response.ok || !result.plan) throw new Error(result.error ?? "We couldn't load that plan.");
      setLoaded({ plan: result.plan, materials: result.materials ?? [] });
      setCurrent("saved");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "We couldn't load that plan.");
    } finally {
      setIsLoadingPlan(false);
    }
  }

  async function deletePlan(id: number) {
    if (!window.confirm("Delete this saved plan? Its topics and materials are removed too. This can't be undone.")) return;
    try {
      const response = await fetch(`/api/plans/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(result.error ?? "We couldn't delete that plan.");
      }
      if (loaded?.plan.id === id) setLoaded(null);
      await refreshPlans();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "We couldn't delete that plan.");
    }
  }

  function openRenamePanel() {
    // Pre-fill with the current title so renaming an already-named plan is
    // an edit, not a retyping exercise.
    setRenameTitle(loaded?.plan.title ?? "");
    setError("");
    setRenamePanelOpen(true);
  }

  function closeRenamePanel() {
    setRenamePanelOpen(false);
    setRenameTitle("");
  }

  async function renamePlan() {
    if (!loaded) return;
    setIsRenaming(true);
    setError("");
    try {
      const response = await fetch(`/api/plans/${loaded.plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameTitle }),
      });
      const result = (await response.json()) as { plan?: StoredPlan; materials?: MaterialSummary[]; error?: string };
      if (!response.ok || !result.plan) throw new Error(result.error ?? "We couldn't rename the plan.");
      setLoaded({ plan: result.plan, materials: result.materials ?? loaded.materials });
      closeRenamePanel();
      void refreshPlans();
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "We couldn't rename the plan.");
    } finally {
      setIsRenaming(false);
    }
  }

  function backToList() {
    setCurrent("list");
    void refreshPlans();
  }

  return {
    current,
    plans,
    persistenceEnabled,
    loaded,
    draftPlan,
    draftPayload,
    savePanelOpen,
    saveTitle,
    setSaveTitle,
    isSaving,
    renamePanelOpen,
    renameTitle,
    setRenameTitle,
    isRenaming,
    isLoadingPlan,
    examDate,
    setExamDate,
    assessmentType,
    setAssessmentType,
    topics,
    setTopics,
    courseMaterials,
    setCourseMaterials,
    background,
    setBackground,
    files,
    handleFiles,
    removeFile,
    warning,
    error,
    isGenerating,
    startNewPlan,
    submit,
    backToPlans,
    discardDraft,
    openSavePanel,
    closeSavePanel,
    savePlan,
    openPlan,
    deletePlan,
    openRenamePanel,
    closeRenamePanel,
    renamePlan,
    backToList,
  };
}
