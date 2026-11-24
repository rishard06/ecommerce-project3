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
    <footer className="mt-16 px-4 pb-10 sm:px-6 print:hidden">
      <div className="mx-auto w-full max-w-7xl rounded-[2rem] border border-white/50 bg-card p-6 backdrop-blur-xl sm:p-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {/* Brand */}
          <div>
            <div className="mb-3 text-2xl font-semibold tracking-tight text-gray-primary">
              <span className="text-accent-600">v</span>enn.
            </div>
            <p className="mb-4 text-sm leading-relaxed text-gray-tertiary">
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
                  className="flex size-9 items-center justify-center rounded-full bg-surface-dark text-gray-secondary transition-colors hover:bg-accent-500/25 hover:text-gray-primary"
                  aria-label={link["aria-label"]}
                >
                  <link.icon size={16} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <nav aria-label="Footer">
            <h2 className="mb-3 text-sm font-semibold text-gray-primary">Quick links</h2>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-tertiary transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-primary">Contact us</h2>
            <ul className="space-y-2.5">
              {contactInfo.map((item) => (
                <li key={item.text} className="flex items-start gap-2 text-sm text-gray-tertiary">
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
            <h2 className="mb-3 text-sm font-semibold text-gray-primary">Newsletter</h2>
            <p className="mb-3 text-sm leading-relaxed text-gray-tertiary">
              Occasional notes on new arrivals and restocks. No noise.
            </p>
            {status === "success" ? (
              <p
                role="status"
                className="flex items-center gap-2 text-sm font-medium text-accent-text"
              >
                <Check size={16} aria-hidden="true" />
                You&apos;re on the list. Thank you.
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex gap-2">
                  <label htmlFor="newsletter-email" className="sr-only">
                    Email address
                  </label>
                  <Input
                    id="newsletter-email"
                    type="email"
                    placeholder="Your email"
                    className="h-10 rounded-full border-transparent bg-white/60 text-sm placeholder:text-gray-quaternary focus-visible:bg-white/90"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    aria-invalid={status === "error"}
                    required
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="size-10 shrink-0 rounded-full bg-action text-action-foreground hover:bg-action-hover"
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
                      <ArrowRight size={16} aria-hidden="true" />
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

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-gray-primary/10 pt-6 md:flex-row">
          <p className="text-center text-sm text-gray-tertiary md:text-left">
            ©{" "}
            <Suspense fallback={null}>
              <CopyrightYear />
            </Suspense>{" "}
            tended. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-5">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-gray-tertiary transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
