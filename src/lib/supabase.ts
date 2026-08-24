import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Returns null when Supabase isn't configured so the app can run without
// persistence (Phase 1 behaviour) instead of crashing. The service role key
// bypasses row-level security — server-side only, never send it to the browser.
export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  client ??= createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export function requireSupabase(): SupabaseClient {
  const client = getSupabase();
  if (!client) throw new Error("Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.");
  return client;
}
