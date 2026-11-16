"use client";

import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";

/**
 * Owner-editable announcement copy. Keep it to one short line — the bar
 * truncates rather than wrapping, so it stays a single row on mobile.
 */
export const ANNOUNCEMENT_MESSAGE = "Free shipping on every order.";

/**
 * How long a dismissal lasts before the bar returns. Bounded so a visitor
 * who hides today's message still sees future ones on a reasonable cadence.
 */
export const ANNOUNCEMENT_DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Dismissal is remembered per browser, keyed by the message itself: editing
 * the copy below re-shows the bar to everyone automatically, and the stored
 * timestamp makes the dismissal expire after `ANNOUNCEMENT_DISMISS_TTL_MS`.
 */
export const ANNOUNCEMENT_STORAGE_KEY = "tended.announcement.dismissal";

const isDismissed = () => {
  try {
    const raw = window.localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY);
    if (!raw) return false;

    const record = JSON.parse(raw) as {
      message?: unknown;
      dismissedAt?: unknown;
    };

    // New copy => new announcement: show it regardless of age.
    if (record.message !== ANNOUNCEMENT_MESSAGE) return false;

    // Malformed or expired timestamps are treated as not dismissed.
    if (typeof record.dismissedAt !== "number") return false;
    return Date.now() - record.dismissedAt < ANNOUNCEMENT_DISMISS_TTL_MS;
  } catch {
    // Storage can be blocked (privacy settings) or hold malformed JSON.
    // Showing the bar is the safe default; dismissal still hides it for
    // this page view.
    return false;
  }
};

const rememberDismissal = () => {
  try {
    window.localStorage.setItem(
      ANNOUNCEMENT_STORAGE_KEY,
      JSON.stringify({
        message: ANNOUNCEMENT_MESSAGE,
        dismissedAt: Date.now(),
      }),
    );
  } catch {
    // Nothing to persist to; the in-memory state still hides the bar.
  }
};

export default function AnnouncementBar() {
  // Server-rendered default: visible. Storage is only read after mount, so
  // the first client paint matches the server markup.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isDismissed()) setDismissed(true);
  }, []);

  function dismiss() {
    setDismissed(true);
    rememberDismissal();
  }

  return (
    // Fixed height stays in flow even after dismissal, so nothing below
    // shifts (no CLS, no conditional page flow).
    <div className="h-9 w-full print:hidden">
      {dismissed ? null : (
        <aside
          aria-label="Announcement"
          className="relative flex h-full w-full items-center justify-center bg-gray-primary px-12 text-background"
        >
          <p className="truncate text-xs font-medium tracking-[0.08em] uppercase">
            {ANNOUNCEMENT_MESSAGE}
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss announcement"
            className="absolute inset-y-0 right-1 flex w-8 items-center justify-center rounded-full text-background/70 hover:bg-background/10 hover:text-background"
          >
            <XIcon className="size-3.5" aria-hidden="true" />
          </button>
        </aside>
      )}
    </div>
  );
}
