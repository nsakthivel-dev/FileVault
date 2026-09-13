import { createClient, SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://yfwpcmxxxkxiyqveckdw.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlmd3BjbXh4eGt4aXlxdmVja2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyNzkwMTcsImV4cCI6MjEwNDg1NTAxN30.VrQ0zUHzV2g3TX0tzqrnzy5JB1_MBTQf8YSVEuo7N5U";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseClientConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http")
);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
