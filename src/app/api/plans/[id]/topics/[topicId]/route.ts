import { ApiError, toErrorResponse } from "@/lib/api-error";
import { toggleTopicCompleted } from "@/lib/persistence";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

function parseId(raw: string, label: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(`Invalid ${label}.`);
  return id;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; topicId: string }> }) {
  try {
    if (!isSupabaseConfigured()) throw new ApiError("Updating topic status requires Supabase, which isn't configured.");
    const resolvedParams = await params;
    const planId = parseId(resolvedParams.id, "plan id");
    const topicId = parseId(resolvedParams.topicId, "topic id");

    const body = (await request.json().catch(() => null)) as { completed?: unknown } | null;
    if (typeof body?.completed !== "boolean") {
      throw new ApiError("Provide a boolean 'completed' field.");
    }

    const updated = await toggleTopicCompleted(planId, topicId, body.completed);
    return Response.json({ topic: updated });
  } catch (error) {
    console.error("Updating topic completion failed:", error);
    return toErrorResponse(error, "Couldn't update topic completion.");
  }
}
