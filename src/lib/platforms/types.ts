import type { Platform } from "@/lib/domain";

/**
 * Contract every publishing platform integration must implement.
 *
 * Nothing here talks to an external API yet. Real implementations will live in
 * server-side code (TanStack server functions / routes) so OAuth tokens and
 * API secrets never reach the browser. The UI only ever sees these results.
 */

export type IntegrationResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; code: "integration_not_configured" | "error"; message: string };

export const notConfigured = (platformName: string): IntegrationResult<never> => ({
  ok: false,
  code: "integration_not_configured",
  message: `${platformName} integration is not configured. Connect an account with OAuth credentials to enable publishing.`,
});

export interface PublishVideoInput {
  contentId: string;
  title: string;
  description?: string | null;
  videoPath?: string | null;
  hashtags?: string[];
}

export interface ScheduleVideoInput extends PublishVideoInput {
  scheduledAt: string;
}

export interface PlatformService {
  readonly platform: Platform;
  readonly name: string;
  /** Human-readable docs reference for the API we will integrate with later. */
  readonly apiName: string;
  /** True only when server-side OAuth credentials exist for this platform. */
  isConfigured(): boolean;
  connect(): Promise<IntegrationResult<{ authorizationUrl: string }>>;
  disconnect(): Promise<IntegrationResult<null>>;
  publishVideo(input: PublishVideoInput): Promise<IntegrationResult<{ remoteId: string }>>;
  scheduleVideo(
    input: ScheduleVideoInput,
  ): Promise<IntegrationResult<{ remoteId: string }>>;
  getAnalytics(
    contentId: string,
  ): Promise<IntegrationResult<{ views: number; likes: number }>>;
}
