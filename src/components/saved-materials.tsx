import type { MaterialSummary } from "@/lib/study-plan";

const typeLabels: Record<MaterialSummary["sourceType"], string> = { pdf: "PDF", image: "Image", text: "Text" };

export function SavedMaterials({ materials }: { materials: MaterialSummary[] }) {
  if (materials.length === 0) return null;
  return (
    <div className="mt-7 border-t border-slate-200 pt-5 dark:border-slate-800">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Saved materials</p>
      <ul className="mt-3 space-y-2">
        {materials.map((material) => (
          <li key={material.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-slate-700 dark:text-slate-300">{material.title}</span>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">{typeLabels[material.sourceType]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
