export type YoutubePrivacyStatus = "private" | "public";

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 5000;
const TAG_MAX = 30;
const TAGS_CHAR_MAX = 500;

export type YoutubeVideoMetadata = {
  snippet: {
    title: string;
    description: string;
    tags: string[];
    categoryId: string;
  };
  status: {
    privacyStatus: YoutubePrivacyStatus;
    selfDeclaredMadeForKids: false;
    publishAt?: string;
  };
};

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trim();
}

function buildTags(hashtags: string[] | null | undefined): string[] {
  const tags: string[] = [];
  let chars = 0;
  for (const raw of hashtags ?? []) {
    const tag = clip(raw.replace(/^#/, ""), 30);
    if (!tag) continue;
    const next = chars + tag.length + (tags.length ? 1 : 0);
    if (tags.length >= TAG_MAX || next > TAGS_CHAR_MAX) break;
    tags.push(tag);
    chars = next;
  }
  return tags;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function buildYoutubeVideoMetadata(input: {
  title: string;
  description?: string | null;
  hashtags?: string[] | null;
  privacyStatus: YoutubePrivacyStatus;
  publishAt?: string | null;
}): YoutubeVideoMetadata {
  const status: YoutubeVideoMetadata["status"] = {
    privacyStatus: input.privacyStatus,
    selfDeclaredMadeForKids: false,
  };
  if (input.privacyStatus === "private" && input.publishAt) {
    status.publishAt = input.publishAt;
  }
  return {
    snippet: {
      title: clip(input.title, TITLE_MAX) || "Untitled",
      description: clip(input.description ?? "", DESCRIPTION_MAX),
      tags: buildTags(input.hashtags),
      categoryId: "22",
    },
    status,
  };
}
