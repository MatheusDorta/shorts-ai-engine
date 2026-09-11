import { createFileRoute } from "@tanstack/react-router";

function redirectToSettings(params: Record<string, string>): Response {
  const url = new URL("/settings", "http://local.invalid");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Response(null, {
    status: 302,
    headers: { Location: `${url.pathname}${url.search}` },
  });
}

export const Route = createFileRoute("/api/youtube/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const incoming = new URL(request.url);
        const { completeYoutubeOAuth } = await import("@/lib/youtube/oauth.server");
        const result = await completeYoutubeOAuth({
          code: incoming.searchParams.get("code"),
          state: incoming.searchParams.get("state"),
          error: incoming.searchParams.get("error"),
        });
        if (!result.ok) {
          return redirectToSettings({ youtube: "error", reason: result.message });
        }
        return redirectToSettings({ youtube: "connected" });
      },
    },
  },
});
