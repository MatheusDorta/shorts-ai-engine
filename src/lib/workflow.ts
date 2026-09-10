import { supabase } from "@/integrations/supabase/client";
import type { Platform } from "@/lib/domain";

export { isManualContentStatus } from "@/lib/workflow-rules";

export async function reviewContent(
  contentId: string,
  action: "approved" | "rejected",
  reason?: string,
) {
  const { data, error } = await supabase.rpc(
    "review_content",
    action === "rejected"
      ? {
          p_content_id: contentId,
          p_action: action,
          p_reason: (reason ?? "").trim(),
        }
      : {
          p_content_id: contentId,
          p_action: action,
        },
  );
  if (error) throw error;
  return data;
}

export async function scheduleContent(contentId: string, platform: Platform, scheduledAt: string) {
  const { data, error } = await supabase.rpc("schedule_content", {
    p_content_id: contentId,
    p_platform: platform,
    p_scheduled_at: scheduledAt,
  });
  if (error) throw error;
  return data;
}

export async function cancelPublishingJob(jobId: string) {
  const { data, error } = await supabase.rpc("cancel_publishing_job", { p_job_id: jobId });
  if (error) throw error;
  return data;
}

export async function retryPublishingJob(jobId: string) {
  const { data, error } = await supabase.rpc("retry_publishing_job", { p_job_id: jobId });
  if (error) throw error;
  return data;
}
