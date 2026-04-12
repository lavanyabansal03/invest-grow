import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NeutralCoinMascot } from "@/components/NeutralCoinMascot";

function AppShell() {
  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <SidebarTrigger className="ml-3 text-muted-foreground hover:text-foreground" />
        </header>
        <main className="relative flex-1 overflow-y-auto">
          <Outlet />
          <div
            className="pointer-events-none fixed right-2 top-4 z-[60] flex justify-end sm:right-4"
            aria-hidden
          >
            <NeutralCoinMascot />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AppLayout() {
  return (
    <SidebarProvider>
      <AppShell />
    </SidebarProvider>
  );
}
