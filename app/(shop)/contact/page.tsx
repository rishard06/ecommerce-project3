import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to the venn. team about orders, delivery, returns, or anything else.",
};

const details = [
  {
    icon: Mail,
    label: "Email",
    value: "support@venn.shop",
    href: "mailto:support@venn.shop",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+1 (555) 123-4567",
    href: "tel:+15551234567",
  },
  {
    icon: MapPin,
    label: "Studio",
    value: "123 Audio Lane, Soundville, CA 94105",
  },
];

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <header className="mb-8 md:mb-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-tertiary">
          Help
        </p>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-gray-primary md:text-5xl">
          Contact us
        </h1>
        <p className="font-medium text-gray-tertiary">
          A real person reads every message. We reply within one business day.
        </p>
      </header>

      <div className="glass-component rounded-[1.75rem] p-6 sm:p-8">
        <ul className="space-y-5">
          {details.map((item) => (
            <li key={item.label} className="flex items-start gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-500/20">
                <item.icon className="size-4 text-accent-700" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-tertiary">
                  {item.label}
                </p>
                {item.href ? (
                  <a
                    href={item.href}
                    className="font-medium text-gray-primary underline-offset-4 hover:text-accent-700 hover:underline"
                  >
                    {item.value}
                  </a>
                ) : (
                  <p className="font-medium text-gray-primary">{item.value}</p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 border-t border-gray-primary/10 pt-6">
          <h2 className="mb-2 text-lg font-semibold text-gray-primary">
            Support hours
          </h2>
          <p className="leading-relaxed text-gray-secondary">
            Monday to Friday, 9am to 5pm Pacific. Messages sent over the weekend
            are answered on the next business day.
          </p>
        </div>

        <div className="mt-6">
          <h2 className="mb-2 text-lg font-semibold text-gray-primary">
            Looking for a quick answer?
          </h2>
          <p className="leading-relaxed text-gray-secondary">
            Our{" "}
            <Link
              href="/faq"
              className="font-semibold text-accent-700 underline-offset-4 hover:underline"
            >
              FAQ
            </Link>
            ,{" "}
            <Link
              href="/shipping"
              className="font-semibold text-accent-700 underline-offset-4 hover:underline"
            >
              shipping
            </Link>{" "}
            and{" "}
            <Link
              href="/returns"
              className="font-semibold text-accent-700 underline-offset-4 hover:underline"
            >
              returns
            </Link>{" "}
            pages cover the most common questions.
          </p>
        </div>
      </div>
    </main>
  );
}
