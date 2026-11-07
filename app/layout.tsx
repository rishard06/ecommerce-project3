import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata, Viewport } from "next";
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

export const metadata: Metadata = {
  title: {
    default: "venn. — Considered essentials",
    template: "%s | venn.",
  },
  description:
    "A calm, considered shop for everyday essentials — clear pricing, fast delivery, and a checkout that gets out of your way.",
  applicationName: "venn.",
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
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
