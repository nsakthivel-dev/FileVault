import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseAdminClient: SupabaseClient | null = null;
let isConfigured: boolean | null = null;

export function getSupabaseBucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || "documents";
}

export function isSupabaseActive(): boolean {
  if (isConfigured !== null) return isConfigured;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  isConfigured = Boolean(url && key && url.startsWith("http"));
  return isConfigured;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseActive()) return null;
  if (supabaseAdminClient) return supabaseAdminClient;

  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

  try {
    supabaseAdminClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log("[Supabase] Server client initialized with URL:", url);
    return supabaseAdminClient;
  } catch (err) {
    console.error("[Supabase] Error initializing client:", err);
    return null;
  }
}
