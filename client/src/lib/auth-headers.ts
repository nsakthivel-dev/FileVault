import { supabase, isSupabaseClientConfigured } from "./supabase";

/**
 * Returns authorization headers including Bearer token from Supabase session
 * or local storage fallback (filevault_user_id) for offline/standalone execution.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  if (isSupabaseClientConfigured && supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        headers["Authorization"] = `Bearer ${data.session.access_token}`;
        return headers;
      }
    } catch {
      // Fallback to local storage
    }
  }

  const storedUserId =
    typeof window !== "undefined"
      ? localStorage.getItem("filevault_user_id")
      : null;

  if (storedUserId) {
    headers["Authorization"] = `Bearer ${storedUserId}`;
  }

  return headers;
}

export function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("filevault_user_id");
}

export function setStoredUserId(id: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("filevault_user_id", id);
  }
}

export function removeStoredUserId(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("filevault_user_id");
  }
}
