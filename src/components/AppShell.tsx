import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CheckSquare,
  FileVideo,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Send,
  Settings,
  Sparkles,
  Library,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sources", label: "Sources", icon: Library },
  { to: "/content", label: "Content", icon: FileVideo },
  { to: "/approval", label: "Approval Queue", icon: CheckSquare },
  { to: "/publishing", label: "Publishing Queue", icon: Send },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/affiliates", label: "Affiliate Links", icon: Link2 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Could not sign out", { description: error.message });
        return;
      }
    } catch (error) {
      toast.error("Could not sign out", {
        description: error instanceof Error ? error.message : undefined,
      });
      return;
    }
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">AI Stack Engine</p>
            <p className="text-[11px] text-muted-foreground">Short-form pipeline</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
              activeProps={{
                className:
                  "bg-sidebar-accent text-sidebar-accent-foreground font-medium ring-1 ring-inset ring-sidebar-border",
              }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <p className="truncate px-2 pb-2 text-xs text-muted-foreground">{user?.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={signOut}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)}>
            <Menu className="size-5" />
          </Button>
          <span className="text-sm font-semibold">AI Stack Engine</span>
        </header>
        <main className="flex-1 px-5 py-8 lg:px-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
