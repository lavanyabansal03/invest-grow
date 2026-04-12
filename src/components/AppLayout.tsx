import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { Chatbot } from "@/components/Chatbot";
import { CheerfulCoinMascot } from "@/components/CheerfulCoinMascot";
import { NeutralCoinMascot } from "@/components/NeutralCoinMascot";
import { useSidebar } from "@/components/ui/sidebar";

const PAPER_STOCK_BUY_EVENT = "paper-stock-buy";
const CHEERFUL_COIN_MS = 5000;

function AppLayoutContent() {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [cheerfulCoin, setCheerfulCoin] = useState(false);
  const { toggleSidebar, state } = useSidebar();

  useEffect(() => {
    let timeoutId: number | undefined;
    const onBuy = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      setCheerfulCoin(true);
      timeoutId = window.setTimeout(() => setCheerfulCoin(false), CHEERFUL_COIN_MS);
    };
    window.addEventListener(PAPER_STOCK_BUY_EVENT, onBuy);
    return () => {
      window.removeEventListener(PAPER_STOCK_BUY_EVENT, onBuy);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  const handleMascotClick = () => {
    // If sidebar is collapsed, open it first
    if (state === "collapsed") {
      toggleSidebar();
    }
    // Then open the chatbot
    setIsChatbotOpen(true);
  };

  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        navigate("/auth", { replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (cancelled) return;
      if (!profile?.onboarding_completed) {
        navigate("/onboarding", { replace: true });
        return;
      }

      setReady(true);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/auth", { replace: true });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
            className="cursor-pointer flex items-center gap-2 p-1 rounded-md hover:bg-primary/10 transition-colors max-w-[min(100vw-5rem,18rem)]"
            title="AI Assistant"
          >
            {cheerfulCoin && (
              <p className="text-xs font-medium text-primary text-right leading-snug shrink min-w-0">
                hooray! You bought a stock!
              </p>
            )}
            {cheerfulCoin ? (
              <CheerfulCoinMascot className="scale-[0.9] origin-top-right -mb-28 -ml-38 shrink-0" />
            ) : (
              <NeutralCoinMascot className="scale-[0.9] origin-top-right -mb-28 -ml-38 shrink-0" />
            )}
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
