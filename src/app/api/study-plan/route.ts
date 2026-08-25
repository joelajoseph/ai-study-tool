import { PDFParse } from "pdf-parse";
import { ApiError, toErrorResponse } from "@/lib/api-error";
import { MAX_FILE_SIZE, MAX_IMAGE_UPLOADS, MAX_TEXT_LENGTH } from "@/lib/constants";
import { generateStudyPlan, type ImagePart } from "@/lib/llm";
import type { ParsedUpload, PlanDraft } from "@/lib/study-plan";

export const runtime = "nodejs";
// Gemini calls with large attachments can outlast the default function limit.
export const maxDuration = 60;

async function readFiles(files: File[]) {
  const uploads: ParsedUpload[] = [];
  const images: ImagePart[] = [];
  const textParts: string[] = [];
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      throw new ApiError(`${file.name} is larger than the ${Math.floor(MAX_FILE_SIZE / 1024 / 1024)} MB upload limit.`);
    }
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
      try {
        const result = await parser.getText();
        // A scanned PDF has no selectable text, so its content would silently
        // vanish and the plan would be built without it. Fail loudly instead.
        if (result.text.trim().length < 20) {
          throw new ApiError(`${file.name} appears to be a scanned PDF with no selectable text. Upload screenshots or photos of those pages instead.`);
        }
        uploads.push({ title: file.name, sourceType: "pdf", text: result.text });
        textParts.push(`\n--- ${file.name} ---\n${result.text}`);
      } finally {
        await parser.destroy();
      }
    } else if (file.type.startsWith("image/")) {
      // Too many inline images can exceed the model's request size limits.
      if (images.length >= MAX_IMAGE_UPLOADS) throw new ApiError(`Too many images. Upload at most ${MAX_IMAGE_UPLOADS}.`);
      images.push({ name: file.name, mimeType: file.type, data: Buffer.from(await file.arrayBuffer()).toString("base64") });
      // Image content is not stored in the draft (only metadata) until raw
      // files move to Supabase Storage.
      uploads.push({ title: file.name, sourceType: "image", text: null });
    } else if (file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt")) {
      const text = await file.text();
      uploads.push({ title: file.name, sourceType: "text", text });
      textParts.push(`\n--- ${file.name} ---\n${text}`);
    } else {
      throw new ApiError(`${file.name} is not supported. Upload a PDF, image, or TXT file.`);
    }
  }
  const text = textParts.join("\n");
  return { text: text.slice(0, MAX_TEXT_LENGTH), truncated: text.length > MAX_TEXT_LENGTH, images, uploads };
}

// Generation only ever produces a client-side draft — nothing is written to
// the database until the user explicitly saves it via POST /api/plans.
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const examDate = String(formData.get("examDate") ?? "");
    const assessmentType = String(formData.get("assessmentType") ?? "");
    const topics = String(formData.get("topics") ?? "");
    const pastedMaterials = String(formData.get("courseMaterials") ?? "");
    const priorKnowledge = String(formData.get("background") ?? "");
    const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);

    const exam = new Date(`${examDate}T00:00:00`);
    if (!examDate || Number.isNaN(exam.valueOf())) throw new ApiError("Provide a valid exam date.");
    if (assessmentType !== "quiz" && assessmentType !== "exam") throw new ApiError("Choose Quiz or Exam as the assessment type.");

    const daysRemaining = Math.max(1, Math.ceil((exam.valueOf() - Date.now()) / 86_400_000));
    const uploaded = await readFiles(files);
    const uploadedText = uploaded.text.trim();
    if (!topics.trim() && !pastedMaterials.trim() && !uploadedText && uploaded.images.length === 0) {
      throw new ApiError("Add topics, course study materials, or a file before generating a plan.");
    }

    const courseMaterials = `${pastedMaterials}\n${uploadedText}`.trim().slice(0, MAX_TEXT_LENGTH) || "Course materials are contained in the attached images.";
    const plan = await generateStudyPlan({
      examDate,
      assessmentType,
      daysRemaining,
      priorKnowledge,
      topics: topics.slice(0, MAX_TEXT_LENGTH),
      courseMaterials,
      images: uploaded.images,
    });

    // The draft carries everything the save endpoint will need later — the
    // plan plus the inputs and parsed uploads it came from.
    const draft: PlanDraft = {
      examDate,
      assessmentType,
      daysRemaining,
      priorKnowledge,
      topicsText: topics,
      pastedMaterials,
      uploads: uploaded.uploads,
    };
    return Response.json({
      plan,
      draft,
      ...(uploaded.truncated ? { warning: "Heads up: your uploads were longer than the size limit, so only part of that material was used." } : {}),
    });
  } catch (error) {
    console.error("Study plan generation failed:", error);
    return toErrorResponse(error, "Unable to generate a study plan.");
  }
}
