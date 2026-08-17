import { PDFParse } from "pdf-parse";
import { generateStudyPlan, type ImagePart } from "@/lib/llm";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_TEXT_LENGTH = 80_000;

async function readFiles(files: File[]) {
  const textParts: string[] = [];
  const images: ImagePart[] = [];
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name} is larger than the 8 MB upload limit.`);
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
      try {
        const result = await parser.getText();
        textParts.push(`\n--- ${file.name} ---\n${result.text}`);
      } finally {
        await parser.destroy();
      }
    } else if (file.type.startsWith("image/")) {
      images.push({ name: file.name, mimeType: file.type, data: Buffer.from(await file.arrayBuffer()).toString("base64") });
    } else if (file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt")) {
      textParts.push(`\n--- ${file.name} ---\n${await file.text()}`);
    } else {
      throw new Error(`${file.name} is not supported. Upload a PDF, image, or TXT file.`);
    }
  }
  return { text: textParts.join("\n").slice(0, MAX_TEXT_LENGTH), images };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const examDate = String(formData.get("examDate") ?? "");
    const assessmentType = String(formData.get("assessmentType") ?? "");
    const topics = String(formData.get("topics") ?? "");
    const courseMaterials = String(formData.get("courseMaterials") ?? "");
    const priorKnowledge = String(formData.get("background") ?? "");
    const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
    const exam = new Date(`${examDate}T00:00:00`);
    if (!examDate || Number.isNaN(exam.valueOf())) return Response.json({ error: "Provide a valid exam date." }, { status: 400 });
    if (assessmentType !== "quiz" && assessmentType !== "exam") return Response.json({ error: "Choose Quiz or Exam as the assessment type." }, { status: 400 });
    const daysRemaining = Math.max(1, Math.ceil((exam.valueOf() - Date.now()) / 86_400_000));
    const uploaded = await readFiles(files);
    const uploadedText = uploaded.text.trim().slice(0, MAX_TEXT_LENGTH);
    if (!topics.trim() && !courseMaterials.trim() && !uploadedText && uploaded.images.length === 0) return Response.json({ error: "Add topics, course study materials, or a file before generating a plan." }, { status: 400 });

    const plan = await generateStudyPlan({
      examDate,
      assessmentType,
      daysRemaining,
      priorKnowledge,
      topics: topics.slice(0, MAX_TEXT_LENGTH),
      courseMaterials: `${courseMaterials}\n${uploadedText}`.trim().slice(0, MAX_TEXT_LENGTH) || "Course materials are contained in the attached images.",
      images: uploaded.images,
    });
    return Response.json({ plan });
  } catch (error) {
    console.error("Study plan generation failed:", error);
    const message = error instanceof Error ? error.message : "Unable to generate a study plan.";
    return Response.json({ error: message }, { status: 500 });
  }
}
