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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const socialLinks = [
  {
    href: "#",
    "aria-label": "Facebook",
    icon: Facebook,
  },
  {
    href: "#",
    "aria-label": "Twitter",
    icon: Twitter,
  },
  {
    href: "#",
    "aria-label": "Instagram",
    icon: Instagram,
  },
  {
    href: "#",
    "aria-label": "YouTube",
    icon: Youtube,
  },
];

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
  { href: "/blog", label: "Blog" },
];

const contactInfo = [
  {
    icon: MapPin,
    text: "123 Audio Lane, Soundville, CA 94105, USA",
  },
  {
    icon: Phone,
    text: "+1 (555) 123-4567",
  },
  {
    icon: Mail,
    text: "support@nitec.com",
  },
];

const footerLinks = [
    { href: "/terms", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/faq", label: "FAQ" },
  ];

export default function Footer() {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e) => {
    e.preventDefault();
    // Handle subscription logic here
    console.log("Subscribed with:", email);
    setEmail("");
  };

  return (
    <footer className="min-h-screen/2 mt-16 px-4 py-8 relative flex items-center">
      <div className="glass-card p-4 sm:p-8 max-w-7xl mx-auto rounded-3xl bg-primary-50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="text-2xl font-bold flex items-center mb-4">
              <span className="text-primary-800">v</span>enn.
            </div>
            <p className="text-gray-600 mb-4">
              Premium audio equipment for music lovers and professionals.
              Experience crystal clear sound with our range of headphones,
              earbuds, and speakers.
            </p>
            <div className="flex space-x-3">
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className="p-2 rounded-full bg-surface-dark hover:bg-primary-100 hover:text-primary-700 transition-colors"
                  aria-label={link["aria-label"]}
                >
                  <link.icon size={18} />
                </a>
              ))}
            </div>
          </div>
          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-gray-600 hover:text-primary-700 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Contact Us</h3>
            <ul className="space-y-3">
              {contactInfo.map((item, index) => (
                <li key={index} className="flex items-start">
                  <item.icon
                    size={18}
                    className="mr-2 text-primary-600 mt-0.5 flex-shrink-0"
                  />
                  <span className="text-gray-600">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Newsletter */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Newsletter</h3>
            <p className="text-gray-600 mb-4">
              Subscribe to our newsletter for the latest products and exclusive
              offers.
            </p>
            <form onSubmit={handleSubscribe} className="flex">
              <Input
                type="email"
                placeholder="Your email"
                className="rounded-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button
                type="submit"
                className="ml-2 p-3 rounded-full bg-primary-600 text-white hover:bg-primary-700"
                aria-label="Subscribe"
              >
                <ArrowRight size={18} />
              </Button>
            </form>
          </div>
        </div>
        <div className="border-t border-gray-200 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 text-sm mb-4 md:mb-0 text-center md:text-left">
            &copy; {new Date().getFullYear()} nitec. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {footerLinks.map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className="text-sm text-gray-600 hover:text-primary-700 transition-colors"
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