import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigMissing } from "@/components/ConfigMissing";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { getSupabasePublicConfig } from "@/lib/supabase-env";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — AI Stack Engine" },
      {
        name: "description",
        content: "Sign in to your AI Stack Engine short-form content dashboard.",
      },
      { property: "og:title", content: "Sign in — AI Stack Engine" },
      {
        property: "og:description",
        content: "Sign in to your AI Stack Engine short-form content dashboard.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const config = getSupabasePublicConfig();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(config.ok);

  useEffect(() => {
    if (!config.ok) return;
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          toast.error("Could not restore session", { description: authErrorMessage(error) });
          setCheckingSession(false);
          return;
        }
        if (data.session) {
          navigate({ to: "/dashboard", replace: true });
          return;
        }
        setCheckingSession(false);
      })
      .catch((error) => {
        if (!active) return;
        toast.error("Could not restore session", { description: authErrorMessage(error) });
        setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, [config.ok, navigate]);

  if (!config.ok) return <ConfigMissing config={config} />;

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("Sign in failed", { description: authErrorMessage(error) });
        return;
      }
      toast.success("Welcome back");
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error("Sign in failed", { description: authErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName },
        },
      });
      if (error) {
        toast.error("Sign up failed", { description: authErrorMessage(error) });
        return;
      }
      if (data.session) {
        toast.success("Account created");
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      toast.success("Check your email", {
        description: "Confirm your address to activate your account.",
      });
    } catch (error) {
      toast.error("Sign up failed", { description: authErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <div className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">AI Stack Engine</span>
        </Link>

        {checkingSession ? (
          <p className="text-center text-sm text-muted-foreground">Checking session…</p>
        ) : (
          <div className="surface-panel rounded-2xl p-6">
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form className="space-y-4 pt-5" onSubmit={signIn}>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Signing in…" : "Sign in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form className="space-y-4 pt-5" onSubmit={signUp}>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email2">Email</Label>
                    <Input
                      id="email2"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password2">Password</Label>
                    <Input
                      id="password2"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Creating account…" : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
