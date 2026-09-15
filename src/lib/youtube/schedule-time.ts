export function normalizeScheduledAt(value: string, nowMs: number, minLeadMs = 60_000): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Select a valid date and time.");
  }
  if (parsed.getTime() <= nowMs + minLeadMs) {
    throw new Error("Scheduled time must be at least one minute in the future.");
  }
  return parsed.toISOString();
}
