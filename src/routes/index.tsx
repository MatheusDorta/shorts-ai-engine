import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckSquare, Send, Sparkles, Library } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Stack Engine — Short-form content pipeline" },
      {
        name: "description",
        content:
          "Turn long-form content into a short-form content machine. Manage sources, clips, approvals and publishing for YouTube Shorts and TikTok.",
      },
      { property: "og:title", content: "AI Stack Engine — Short-form content pipeline" },
      {
        property: "og:description",
        content:
          "Turn long-form content into a short-form content machine. Sources, clips, approvals, scheduling and analytics in one dashboard.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  { icon: Library, title: "Sources", text: "Track every long-form source and its permission status." },
  { icon: Sparkles, title: "Clips", text: "Build short-form pieces with hook, caption, hashtags and CTA." },
  { icon: CheckSquare, title: "Review", text: "Approve or reject each clip before it can be scheduled." },
  { icon: Send, title: "Publish", text: "Queue clips for YouTube Shorts and TikTok." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">AI Stack Engine</span>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-20 text-center">
        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Content operations
        </p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">
          Turn long-form content into a{" "}
          <span className="text-brand-gradient">short-form content machine.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
          One dashboard for sources, clips, approvals, scheduling and performance —
          built for YouTube Shorts and TikTok.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">
              Get started <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.title} className="surface-panel rounded-xl p-5">
            <s.icon className="size-5 text-primary" />
            <h2 className="mt-4 font-semibold">{s.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
