import { getPublicEnv } from "@/lib/env";

/** Development fallback; production always sets `NEXT_PUBLIC_APP_URL`. */
export const DEFAULT_APP_URL = "http://localhost:3000";

/**
 * Absolute base URL for canonical, Open Graph, JSON-LD, robots, and sitemap
 * links. Never hardcode a production domain: the validated public env decides,
 * with localhost as the dev fallback. One trailing slash is stripped so callers
 * can append paths without doubling it.
 */
export function siteUrl(): string {
  return (getPublicEnv().NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL).replace(
    /\/$/,
    "",
  );
}
