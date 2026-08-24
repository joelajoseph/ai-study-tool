"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { AssessmentTypePicker } from "@/components/assessment-type-picker";
import { PlanDisplay, PlanEmptyState } from "@/components/plan-display";
import { SavedMaterials } from "@/components/saved-materials";
import { MAX_FILE_SIZE, MAX_IMAGE_UPLOADS } from "@/lib/constants";
import type { MaterialSummary, SavedStateResponse, StudyPlan } from "@/lib/study-plan";

export default function Home() {
  const [examDate, setExamDate] = useState("");
  const [assessmentType, setAssessmentType] = useState<"quiz" | "exam">("exam");
  const [topics, setTopics] = useState("");
  const [courseMaterials, setCourseMaterials] = useState("");
  const [background, setBackground] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [materials, setMaterials] = useState<MaterialSummary[]>([]);
  const [persistenceEnabled, setPersistenceEnabled] = useState(false);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // On first load, bring back the latest saved plan and materials so a
  // refresh (or coming back tomorrow) picks up where you left off.
  useEffect(() => {
    async function loadSavedState() {
      try {
        const response = await fetch("/api/study-plan");
        const result = (await response.json()) as SavedStateResponse;
        setPersistenceEnabled(result.persistenceEnabled);
        setMaterials(result.materials ?? []);
        if (result.plan) setPlan(result.plan);
      } catch {
        setPersistenceEnabled(false);
      }
    }
    void loadSavedState();
  }, []);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []));
  }

  // Fail fast on obvious file problems before uploading anything.
  function findFileProblem() {
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) return `${file.name} is larger than the ${Math.floor(MAX_FILE_SIZE / 1024 / 1024)} MB upload limit.`;
    }
    if (files.filter((file) => file.type.startsWith("image/")).length > MAX_IMAGE_UPLOADS) {
      return `Too many images. Upload at most ${MAX_IMAGE_UPLOADS}.`;
    }
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setWarning("");
    setPlan(null);
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
      const result = (await response.json()) as { plan?: StudyPlan; error?: string; warning?: string; materials?: MaterialSummary[] };
      if (!response.ok || !result.plan) throw new Error(result.error ?? "We couldn't generate a study plan.");
      setPlan(result.plan);
      if (result.warning) setWarning(result.warning);
      if (result.materials) setMaterials(result.materials);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We couldn't generate a study plan.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f3] text-slate-900">
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-16">
        <header className="mb-10 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Focused study, one plan at a time</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Turn your course material into a calm, clear plan.</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">Share your notes and what feels shaky. We’ll organize the work around your exam date.</p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-800">1</span><div><h2 className="text-lg font-semibold">Tell me what you’re studying</h2><p className="text-sm text-slate-500">{persistenceEnabled ? "Plans and materials are saved automatically." : "Nothing is saved yet — this is just your first draft."}</p></div></div>
            <AssessmentTypePicker value={assessmentType} onChange={setAssessmentType} />
            <label className="mt-6 block text-sm font-semibold" htmlFor="exam-date">{assessmentType === "quiz" ? "Quiz" : "Exam"} date</label>
            <input className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" id="exam-date" type="date" value={examDate} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setExamDate(event.target.value)} required />
            <label className="mt-6 block text-sm font-semibold" htmlFor="topics">Topics</label>
            <textarea className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 leading-6 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" id="topics" placeholder="List the chapters, learning objectives, or specific concepts to cover…" value={topics} onChange={(event) => setTopics(event.target.value)} />
            <label className="mt-6 block text-sm font-semibold" htmlFor="course-materials">Course study materials</label>
            <textarea className="mt-2 min-h-32 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 leading-6 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" id="course-materials" placeholder="Paste lecture notes, textbook references, past-paper questions, or practice problems…" value={courseMaterials} onChange={(event) => setCourseMaterials(event.target.value)} />
            <label className="mt-6 block text-sm font-semibold" htmlFor="files">Upload course study materials <span className="font-normal text-slate-500">(optional)</span></label>
            <input className="mt-2 block w-full cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:font-semibold file:text-emerald-800 hover:file:bg-emerald-200" id="files" type="file" accept=".pdf,.txt,image/*" multiple onChange={handleFiles} />
            {files.length > 0 && <p className="mt-2 text-sm text-slate-500">{files.map((file) => file.name).join(", ")}</p>}
            <label className="mt-6 block text-sm font-semibold" htmlFor="background">What do you already know or feel behind on?</label>
            <textarea className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 leading-6 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" id="background" placeholder="For example: I understand chapters 1–3, but I keep mixing up the formulas in chapter 5." value={background} onChange={(event) => setBackground(event.target.value)} />
            {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            <button disabled={isGenerating} className="mt-6 w-full rounded-xl bg-emerald-700 px-5 py-3.5 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-emerald-400" type="submit">{isGenerating ? "Building your plan…" : "Build my study plan"}</button>
          </form>

          <section aria-live="polite" className="rounded-3xl border border-dashed border-slate-300 bg-[#fcfcfa] p-6 sm:p-8">
            {warning && <p className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{warning}</p>}
            {plan ? <PlanDisplay plan={plan} assessmentType={assessmentType} /> : <PlanEmptyState />}
            <SavedMaterials materials={materials} />
          </section>
        </div>
      </section>
    </main>
  );
}
