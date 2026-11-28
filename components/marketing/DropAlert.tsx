"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Catalog bento tile t6: the newsletter signup entry point.
 *
 * There is no subscription endpoint in the storefront yet, so the form never
 * claims a subscription. A submit confirms that drop alerts open with an
 * account and routes to the existing registration flow. The email stays in
 * component state, not in a URL.
 */
export default function DropAlert() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    setEmail("");
  }

  return (
    <article
      data-tile="t6"
      className="bento-card col-span-2 flex flex-col justify-between gap-4 overflow-clip rounded-[1.25rem] border border-line bg-panel-2 p-5 max-[540px]:col-span-1"
    >
      <div>
        <p className="text-[10.5px] font-semibold tracking-[0.22em] text-gray-tertiary uppercase">
          Newsletter
        </p>
        <h3 className="mt-1.5 font-display text-[22px] leading-tight font-semibold tracking-[-0.02em] text-gray-primary">
          Occasional notes on new arrivals and restocks. No noise.
        </h3>
      </div>

      {submitted ? (
        <div
          role="status"
          className="flex flex-col items-start gap-2 text-xs text-gray-secondary"
        >
          <p className="inline-flex items-center gap-2 font-semibold text-gray-primary">
            <Check className="size-4 text-accent-text" aria-hidden="true" />
            Newsletter signup is not connected yet.
          </p>
          <p>
            Create an account to hear about new arrivals and restocks — no
            noise.
          </p>
          <Link
            href="/register"
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-action bg-action px-4 text-[12.5px] font-bold text-action-foreground transition-colors duration-200 ease-out-quart hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Create account
            <ArrowRight
              data-icon="inline-end"
              className="size-4"
              aria-hidden="true"
            />
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 max-[540px]:flex-col"
        >
          <label htmlFor="homepage-newsletter-email" className="sr-only">
            Email address
          </label>
          <Input
            id="homepage-newsletter-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 rounded-full border-line-strong bg-surface-light text-sm text-foreground placeholder:text-gray-quaternary"
          />
          <Button
            type="submit"
            aria-label="Subscribe to newsletter"
            className="h-11 shrink-0 cursor-pointer rounded-full bg-action px-4 text-sm font-bold text-action-foreground hover:bg-action-hover"
          >
            Subscribe
          </Button>
        </form>
      )}
    </article>
  );
}
