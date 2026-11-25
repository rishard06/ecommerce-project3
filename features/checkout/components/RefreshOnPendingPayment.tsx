"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-checks the success page while Stripe's signed webhook is still pending.
 * The webhook usually lands seconds after the shopper returns from Stripe,
 * so the first render almost always shows "processing" — without a re-check
 * nothing would mount ClearCartOnSuccess and the cart would keep the
 * purchased lines until a manual refresh. Each tick re-renders the server
 * page; the moment the order flips to PAID/SUCCEEDED the page swaps this
 * poller for ClearCartOnSuccess, which clears the cart. Terminal states
 * (cancelled/refunded/failed) unmount this poller with the cart untouched,
 * so failed payments stay retryable.
 */
export function RefreshOnPendingPayment({
  intervalMs = 3000,
  maxAttempts = 30,
}: {
  intervalMs?: number;
  maxAttempts?: number;
} = {}) {
  const router = useRouter();

  useEffect(() => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      attempts += 1;
      if (attempts > maxAttempts) {
        window.clearInterval(timer);
        return;
      }
      router.refresh();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [router, intervalMs, maxAttempts]);

  return null;
}
