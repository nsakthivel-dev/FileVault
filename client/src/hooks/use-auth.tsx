import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type InsertUser, type UserRecord } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { supabase, isSupabaseClientConfigured } from "@/lib/supabase";
import { getAuthHeaders, getStoredUserId, setStoredUserId, removeStoredUserId } from "@/lib/auth-headers";

interface AuthContextType {
  user: UserRecord | null;
  isLoading: boolean;
  isRestoring: boolean;
  login: UseMutationResult<UserRecord, Error, InsertUser>;
  register: UseMutationResult<UserRecord, Error, InsertUser>;
  logout: UseMutationResult<void, Error, void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Track whether we are in the initial session verification phase
  const [initialChecking, setInitialChecking] = useState<boolean>(true);

  const userQuery = useQuery<UserRecord | null>({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(api.auth.me.path, {
          credentials: "include",
          headers,
        });

        if (res.status === 401) {
          // Genuinely unauthenticated: clean up stale stored ID
          removeStoredUserId();
          return null;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch user");
        }

        const data = await res.json();
        const user = api.auth.me.responses[200].parse(data);
        if (user?.id) {
          setStoredUserId(user.id);
        }
        return user;
      } catch (err) {
        // If there's a temporary network hiccup and we have a stored ID, do not purge
        const storedId = getStoredUserId();
        if (storedId) {
          console.warn("[Auth] Network hiccup during session check, retaining verification status:", err);
        }
        return null;
      }
    },
    staleTime: Infinity, // Keep auth state stable during navigation; explicitly invalidated on login/logout
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on every component mount
    retry: 1,
  });

  useEffect(() => {
    // Complete initial check once userQuery settles
    if (!userQuery.isLoading) {
      setInitialChecking(false);
    }
  }, [userQuery.isLoading]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      // Sync with Supabase client if configured and username looks like an email
      if (isSupabaseClientConfigured && supabase && credentials.username.includes("@")) {
        try {
          await supabase.auth.signInWithPassword({
            email: credentials.username,
            password: credentials.password,
          });
        } catch {
          // Backend session remains the primary authority
        }
      }

      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid username or password");
        throw new Error("Login failed");
      }

      return api.auth.login.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      if (data?.id) {
        setStoredUserId(data.id);
      }
      queryClient.setQueryData([api.auth.me.path], data);
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.stats.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.auditLogs.list.path] });
      toast({ title: "Welcome back!", description: "Successfully logged in." });
    },
    onError: (error: Error) => {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await fetch(api.auth.register.path, {
        method: api.auth.register.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = api.auth.register.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Registration failed");
      }

      return api.auth.register.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      if (data?.id) {
        setStoredUserId(data.id);
      }
      queryClient.setQueryData([api.auth.me.path], data);
      toast({ title: "Account created", description: "Welcome to Vault!" });
    },
    onError: (error: Error) => {
      toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (isSupabaseClientConfigured && supabase) {
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignore
        }
      }

      removeStoredUserId();

      const headers = await getAuthHeaders();
      const res = await fetch(api.auth.logout.path, {
        method: api.auth.logout.method,
        headers,
        credentials: "include",
      });

      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      removeStoredUserId();
      queryClient.setQueryData([api.auth.me.path], null);
      queryClient.clear();
      toast({ title: "Logged out", description: "You have been securely logged out." });
    },
    onError: () => {
      // Even if server call failed, clear local session state
      removeStoredUserId();
      queryClient.setQueryData([api.auth.me.path], null);
      queryClient.clear();
    },
  });

  const storedId = getStoredUserId();
  const isRestoring = initialChecking && !!storedId;
  const isLoading = userQuery.isLoading || isRestoring;
  const user = userQuery.data ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isRestoring,
        login: loginMutation,
        register: registerMutation,
        logout: logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
