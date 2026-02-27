import { ReactNode, useState } from "react";
import { Sidebar } from "./sidebar";
import { UploadModal } from "../documents/upload-modal";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar onOpenUpload={() => setIsUploadOpen(true)} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
      />
    </div>
  );
}
