import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import DocumentsPage from "@/pages/documents-page";
import RecentFilesPage from "@/pages/recent-files-page";
import SharedLinksPage from "@/pages/shared-links-page";
import TrashPage from "@/pages/trash-page";
import DocumentPreviewPage from "@/pages/document-preview-page";
import SettingsPage from "@/pages/settings-page";
import VerificationPage from "@/pages/verification-page";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isRestoring } = useAuth();

  if (isLoading || isRestoring) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
        <p className="text-slate-500 font-medium tracking-wide animate-pulse">Verifying credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      {/* Public Credential Verification */}
      <Route path="/verify/:shareId" component={VerificationPage} />
      <Route path="/v/:shareId" component={VerificationPage} />

      {/* Protected Routes */}
      <Route path="/">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>
      <Route path="/documents">
        <ProtectedRoute>
          <DocumentsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/recent">
        <ProtectedRoute>
          <RecentFilesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/shared">
        <ProtectedRoute>
          <SharedLinksPage />
        </ProtectedRoute>
      </Route>
      <Route path="/shared-links">
        <ProtectedRoute>
          <SharedLinksPage />
        </ProtectedRoute>
      </Route>
      <Route path="/trash">
        <ProtectedRoute>
          <TrashPage />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/d/:id">
        <ProtectedRoute>
          <DocumentPreviewPage />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
