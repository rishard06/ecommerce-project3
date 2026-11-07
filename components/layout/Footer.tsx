"use client";

import React, { useState } from "react";
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

const socialLinks: SocialLink[] = [
  { href: "#", "aria-label": "Facebook", icon: Facebook },
  { href: "#", "aria-label": "Twitter", icon: Twitter },
  { href: "#", "aria-label": "Instagram", icon: Instagram },
  { href: "#", "aria-label": "YouTube", icon: Youtube },
];

const quickLinks: FooterLink[] = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact" },
  { href: "/blog", label: "Blog" },
];

const contactInfo: ContactInfo[] = [
  { icon: MapPin, text: "123 Audio Lane, Soundville, CA 94105" },
  { icon: Phone, text: "+1 (555) 123-4567" },
  { icon: Mail, text: "support@venn.shop" },
];

const footerLinks: FooterLink[] = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/faq", label: "FAQ" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="mt-16 px-4 pb-10 sm:px-6">
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
                    className="mt-0.5 shrink-0 text-accent-700"
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
            {subscribed ? (
              <p role="status" className="text-sm font-medium text-accent-700">
                You&apos;re on the list. Thank you.
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
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
                  required
                />
                <Button
                  type="submit"
                  size="icon"
                  className="size-10 shrink-0 rounded-full bg-accent-500 text-gray-primary hover:bg-accent-600"
                  aria-label="Subscribe to newsletter"
                >
                  <ArrowRight size={16} aria-hidden="true" />
                </Button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-gray-primary/10 pt-6 md:flex-row">
          <p className="text-center text-sm text-gray-tertiary md:text-left">
            © {new Date().getFullYear()} venn. All rights reserved.
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
