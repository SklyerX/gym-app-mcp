export function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function metaMuscle(meta: unknown) {
  const value = (meta as Record<string, unknown> | null)?.muscle;

  return typeof value === "string" ? value.toLowerCase() : undefined;
}

export function parseDate(value: string | undefined) {
  if (value === undefined) return undefined;

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
