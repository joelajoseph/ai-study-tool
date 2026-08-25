import { ApiError, toErrorResponse } from "@/lib/api-error";
import { deletePlan, loadPlan, renamePlan } from "@/lib/persistence";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError("Invalid plan id.");
  return id;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseConfigured()) throw new ApiError("Saved plans require Supabase, which isn't configured.");
    const loaded = await loadPlan(parseId((await params).id));
    if (!loaded) return Response.json({ error: "That plan doesn't exist (it may have been deleted)." }, { status: 404 });
    return Response.json(loaded);
  } catch (error) {
    console.error("Loading plan failed:", error);
    return toErrorResponse(error, "Couldn't load that plan.");
  }
}

// Deleting the plan row cascades to its topics, materials, and (future) chat
// messages — all of them reference plans with on delete cascade.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseConfigured()) throw new ApiError("Saved plans require Supabase, which isn't configured.");
    await deletePlan(parseId((await params).id));
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Deleting plan failed:", error);
    return toErrorResponse(error, "Couldn't delete that plan.");
  }
}

// Rename (or set a first title on) a saved plan. A blank title is stored as
// null and displays as the generated label.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseConfigured()) throw new ApiError("Saved plans require Supabase, which isn't configured.");
    const body = (await request.json()) as { title?: unknown };
    if (typeof body.title !== "string") throw new ApiError("Provide a title (blank is allowed and uses the generated label).");
    return Response.json(await renamePlan(parseId((await params).id), body.title));
  } catch (error) {
    console.error("Renaming plan failed:", error);
    return toErrorResponse(error, "Couldn't rename that plan.");
  }
}
