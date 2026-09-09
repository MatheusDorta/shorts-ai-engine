import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  deleteMedia,
  IMAGE_ACCEPT,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  signedMediaUrl,
  uploadMedia,
  VIDEO_ACCEPT,
  type MediaKind,
} from "@/lib/media-upload";

export function MediaUploader({
  label,
  kind,
  userId,
  contentId,
  path,
  onPathChange,
  onDuration,
}: {
  label: string;
  kind: MediaKind;
  userId: string | null;
  contentId: string | null;
  path: string | null;
  onPathChange: (path: string | null) => void;
  onDuration?: (seconds: number) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const accept = kind === "videos" ? VIDEO_ACCEPT : IMAGE_ACCEPT;
  const limitLabel = kind === "videos" ? "500 MB" : "10 MB";
  const maxBytes = kind === "videos" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

  useEffect(() => {
    let live = true;
    if (!path) {
      setUrl(null);
      return;
    }
    signedMediaUrl(path)
      .then((next) => {
        if (live) setUrl(next);
      })
      .catch(() => {
        if (live) setUrl(null);
      });
    return () => {
      live = false;
    };
  }, [path]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!userId || !contentId) {
      toast.error("Save the content item before uploading media.");
      return;
    }
    if (file.size > maxBytes) {
      toast.error(`File is larger than the ${limitLabel} limit.`);
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const nextPath = await uploadMedia(userId, contentId, kind, file, setProgress);
      if (path) {
        await deleteMedia(path).catch(() => undefined);
      }
      onPathChange(nextPath);
      toast.success(`${label} uploaded`);
    } catch (error) {
      toast.error(`Could not upload ${label.toLowerCase()}`, {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function onDelete() {
    if (!path) return;
    setBusy(true);
    try {
      await deleteMedia(path);
      onPathChange(null);
      setUrl(null);
      toast.success(`${label} removed`);
    } catch (error) {
      toast.error(`Could not delete ${label.toLowerCase()}`, {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">
        {kind === "videos" ? "MP4, MOV, or WebM" : "JPEG, PNG, or WebP"} up to {limitLabel}. Private
        storage with signed URLs.
      </p>
      <input
        type="file"
        accept={accept}
        disabled={busy || !userId || !contentId}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void onFile(file);
        }}
      />
      {progress !== null && <Progress value={progress} />}
      {url && kind === "videos" && (
        <video
          className="mt-2 max-h-56 w-full rounded-md bg-black"
          src={url}
          controls
          onLoadedMetadata={(e) => {
            const duration = e.currentTarget.duration;
            if (Number.isFinite(duration) && onDuration) onDuration(Math.round(duration));
          }}
        />
      )}
      {url && kind === "thumbnails" && (
        <img
          src={url}
          alt="Thumbnail preview"
          className="mt-2 max-h-56 rounded-md object-contain"
        />
      )}
      {path && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void onDelete()}
        >
          Delete {label.toLowerCase()}
        </Button>
      )}
    </div>
  );
}
