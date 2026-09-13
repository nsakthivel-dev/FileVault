import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseAdminClient: SupabaseClient | null = null;
let isConfigured: boolean | null = null;

// Project default credentials to ensure serverless backend can always communicate with Supabase
const DEFAULT_SUPABASE_URL = "https://yfwpcmxxxkxiyqveckdw.supabase.co";
const DEFAULT_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlmd3BjbXh4eGt4aXlxdmVja2R3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTI3OTAxNywiZXhwIjoyMTA0ODU1MDE3fQ.PwM0nCzMYDM_KzDBh3frkzaHN1pu6F1p8HoW2aNRbT4";

export function getSupabaseBucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || "documents";
}

export function isSupabaseActive(): boolean {
  return true;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (supabaseAdminClient) return supabaseAdminClient;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  // Always use the Service Role Key on the backend so storage RLS is bypassed and user management works.
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.length < 50 || key === process.env.SUPABASE_ANON_KEY) {
    key = DEFAULT_SERVICE_ROLE_KEY;
  }

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
