const DEFAULT_NEXT_PATH = "/";

/**
 * Returns a same-origin path that is safe to hand to Better Auth's
 * `callbackURL` and to `router.push`.
 *
 * Only root-relative paths are accepted. Anything that browsers or Next.js
 * could interpret as an external destination — absolute URLs, protocol
 * relative URLs (`//evil.example`), scheme-like values (`javascript:`),
 * backslash variants (`/\evil.example`), and values containing whitespace or
 * control characters — falls back to `/`.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (typeof value !== "string" || value.length === 0) {
    return DEFAULT_NEXT_PATH;
  }

  // Browsers trim or normalize whitespace/control characters, which can turn
  // an apparently local path into something else. Reject them outright.
  if (/[\u0000-\u001f\u007f\s]/.test(value)) {
    return DEFAULT_NEXT_PATH;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_NEXT_PATH;
  }

  // WHATWG URL parsing treats `\` like `/` for special schemes, so
  // `/\evil.example` resolves to an external origin in browsers.
  if (value.includes("\\")) {
    return DEFAULT_NEXT_PATH;
  }

  // Defense in depth: reject anything with an explicit URI scheme.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) {
    return DEFAULT_NEXT_PATH;
  }

  try {
    const base = "https://local.invalid";
    if (new URL(value, base).origin !== base) {
      return DEFAULT_NEXT_PATH;
    }
  } catch {
    return DEFAULT_NEXT_PATH;
  }

  return value;
}
