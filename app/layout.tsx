import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { getPublicEnv } from "@/lib/env";
import { WishlistSync } from "@/features/wishlist/components/wishlist-sync";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Display face for H1/section titles only — body copy stays on Geist.
// Single weight (600, matching the semibold titles) preloaded above the fold.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});

const DEFAULT_APP_URL = "http://localhost:3000";
const SITE_NAME = "tended.";
const SITE_TITLE = "tended. — Considered essentials";
// Shared by the page description and both social cards so they never drift.
const SITE_DESCRIPTION =
  "A calm, considered shop for everyday essentials — clear pricing, fast delivery, honest reviews, easy returns, and a checkout that gets out of your way.";
const SOCIAL_IMAGE = "/landing/craft.webp";

/**
 * Absolute base URL for canonical/OG links. Never hardcode a production
 * domain: the validated public env decides, with localhost as the dev fallback.
 */
function siteUrl(): string {
  return (getPublicEnv().NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL).replace(/\/$/, "");
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: SITE_TITLE,
    template: "%s | tended.",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [{ url: SOCIAL_IMAGE, alt: SITE_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5faf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1311" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} font-sans antialiased`}>
        <WishlistSync />
        {children}
      </body>
    </html>
  );
}
