import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  contentStatusLabel,
  permissionMeta,
  publishingStatusLabel,
  type ContentStatus,
  type PermissionStatus,
  type PublishingStatus,
} from "@/lib/domain";

const tone = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  info: "bg-accent text-accent-foreground border-transparent",
  good: "bg-success/15 text-success border-success/30",
  warn: "bg-warning/15 text-warning border-warning/30",
  bad: "bg-destructive/15 text-destructive border-destructive/30",
} as const;

type Tone = keyof typeof tone;

function Pill({ children, t }: { children: React.ReactNode; t: Tone }) {
  return (
    <Badge variant="outline" className={cn("font-medium", tone[t])}>
      {children}
    </Badge>
  );
}

const contentTone: Record<ContentStatus, Tone> = {
  draft: "neutral",
  processing: "info",
  ready_for_review: "warn",
  approved: "good",
  rejected: "bad",
  scheduled: "info",
  published: "good",
  failed: "bad",
};

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  return <Pill t={contentTone[status]}>{contentStatusLabel(status)}</Pill>;
}

const publishingTone: Record<PublishingStatus, Tone> = {
  waiting: "neutral",
  scheduled: "info",
  publishing: "warn",
  published: "good",
  failed: "bad",
  cancelled: "neutral",
};

export function PublishingStatusBadge({ status }: { status: PublishingStatus }) {
  return <Pill t={publishingTone[status]}>{publishingStatusLabel(status)}</Pill>;
}

export function PermissionBadge({ status }: { status: PermissionStatus }) {
  const meta = permissionMeta(status);
  return (
    <Pill t={status === "not_allowed" ? "bad" : meta.risky ? "warn" : "good"}>
      {meta.label}
    </Pill>
  );
}
