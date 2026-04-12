import { useState } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Chatbot } from "@/components/Chatbot";
import { NeutralCoinMascot } from "@/components/NeutralCoinMascot";
import { useSidebar } from "@/components/ui/sidebar";

function AppLayoutContent() {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const { toggleSidebar, state } = useSidebar();

  const handleMascotClick = () => {
    // If sidebar is collapsed, open it first
    if (state === "collapsed") {
      toggleSidebar();
    }
    // Then open the chatbot
    setIsChatbotOpen(true);
  };

  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-12 flex items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl px-3">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          </div>
          <div
            onClick={handleMascotClick}
            className="cursor-pointer p-1 rounded-md hover:bg-primary/10 transition-colors"
            title="AI Assistant"
          >
            <NeutralCoinMascot className="scale-[0.9] origin-top-right -mb-28 -ml-38" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
    </div>
  );
}

export default function AppLayout() {
  return (
    <SidebarProvider>
      <AppLayoutContent />
    </SidebarProvider>
  );
}
