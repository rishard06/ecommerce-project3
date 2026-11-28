"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  Check,
  LoaderCircle,
  type LucideProps,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SocialLink {
  href: string;
  "aria-label": string;
  icon: React.ComponentType<LucideProps>;
}

interface ContactInfo {
  icon: React.ComponentType<LucideProps>;
  text: string;
}

interface FooterLink {
  href: string;
  label: string;
}

// TODO(owner): replace these platform homepages with the brand's profile URLs.
const socialLinks: SocialLink[] = [
  { href: "https://facebook.com", "aria-label": "Facebook", icon: Facebook },
  { href: "https://twitter.com", "aria-label": "Twitter", icon: Twitter },
  { href: "https://instagram.com", "aria-label": "Instagram", icon: Instagram },
  { href: "https://youtube.com", "aria-label": "YouTube", icon: Youtube },
];

const quickLinks: FooterLink[] = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/contact", label: "Contact" },
];

const contactInfo: ContactInfo[] = [
  { icon: MapPin, text: "123 Audio Lane, Soundville, CA 94105" },
  { icon: Phone, text: "+1 (555) 123-4567" },
  { icon: Mail, text: "support@tended.shop" },
];

const footerLinks: FooterLink[] = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/shipping", label: "Shipping" },
  { href: "/returns", label: "Returns" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

type SubscribeStatus = "idle" | "submitting" | "success" | "error";

interface FooterProps {
  onSubscribe?: (email: string) => Promise<void>;
}

const defaultSubscribe = async () => {};

/**
 * Copyright year, isolated behind its own boundary. Reading the clock during
 * prerender is request-time work under Cache Components: without this
 * boundary the whole static shell postpones and the production build fails
 * ("client rendering was requested outside a Suspense boundary"). The static
 * shell (everything else in the footer) still commits instantly; the year
 * streams in with the dynamic hole.
 */
function CopyrightYear() {
  return <>{new Date().getFullYear()}</>;
}

export default function Footer({ onSubscribe = defaultSubscribe }: FooterProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubscribeStatus>("idle");
  const isSubmitting = status === "submitting";

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setStatus("submitting");
    try {
      await onSubscribe(email);
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <footer className="mt-16 pb-10 print:hidden">
      <div className="shell border-t border-line pt-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {/* Brand */}
          <div>
            <div className="mb-3 font-display text-2xl font-semibold tracking-tight text-foreground">
              tended<span className="text-accent-text">.</span>
            </div>
            <p className="mb-4 max-w-[34ch] text-sm leading-relaxed text-ink-2">
              Considered everyday objects, chosen for how they wear in — not how
              they look on day one.
            </p>
            <div className="flex gap-2">
              {socialLinks.map((link) => (
                <a
                  key={link["aria-label"]}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-line text-ink-2 transition-colors hover:border-line-strong hover:text-accent-text"
                  aria-label={link["aria-label"]}
                >
                  <link.icon size={16} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <nav aria-label="Footer">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Quick links</h2>
            <ul className="flex flex-col gap-1">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-11 cursor-pointer items-center text-sm text-ink-2 transition-colors hover:text-accent-text"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Contact us</h2>
            <ul className="flex flex-col gap-2.5">
              {contactInfo.map((item) => (
                <li key={item.text} className="flex items-start gap-2 text-sm text-ink-2">
                  <item.icon
                    size={16}
                    className="mt-0.5 shrink-0 text-accent-text"
                    aria-hidden="true"
                  />
                  <span className="leading-snug">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Newsletter</h2>
            <p className="mb-3 text-sm leading-relaxed text-ink-2">
              Occasional notes on new arrivals and restocks. No noise.
            </p>
            {status === "success" ? (
              <p
                role="status"
                className="flex items-center gap-2 text-sm font-medium text-accent-text"
              >
                <Check size={16} data-icon="inline-start" aria-hidden="true" />
                You&apos;re on the list. Thank you.
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <label htmlFor="newsletter-email" className="sr-only">
                    Email address
                  </label>
                  <Input
                    id="newsletter-email"
                    type="email"
                    placeholder="Your email"
                    className="h-11 rounded-full border-line-strong bg-panel-2 text-sm text-foreground placeholder:text-muted-foreground"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    aria-invalid={status === "error"}
                    required
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="size-11 shrink-0 rounded-full bg-action text-action-foreground hover:bg-action-hover"
                    aria-label="Subscribe to newsletter"
                    aria-busy={isSubmitting}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <LoaderCircle
                        size={16}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <ArrowRight
                        size={16}
                        data-icon="inline-end"
                        aria-hidden="true"
                      />
                    )}
                  </Button>
                </div>
                {status === "error" && (
                  <p role="alert" className="text-sm text-destructive">
                    Could not subscribe. Please try again.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-line pt-4 md:flex-row">
          <p className="text-center text-sm text-ink-2 md:text-left">
            ©{" "}
            <Suspense fallback={null}>
              <CopyrightYear />
            </Suspense>{" "}
            tended. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-x-4 md:gap-x-5">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="inline-flex min-h-11 cursor-pointer items-center text-sm text-ink-2 transition-colors hover:text-accent-text"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Decorative outline wordmark, matching the mockup footer. */}
        <div className="wordmark mt-8" aria-hidden="true">
          tended<span>.</span>
        </div>
      </div>
    </footer>
  );
}
