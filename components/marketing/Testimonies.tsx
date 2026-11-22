import React from "react";
import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface Testimonial {
  name: string;
  role: string;
  avatarClassName: string;
  productName: string;
  productSlug: string;
  quote: string;
}

/**
 * Product slugs are the stable `dummy-<id>` catalog keys assigned by the seed
 * (`prisma/seed.mjs`). Update them if the seeded catalog changes.
 */
const testimonials: Testimonial[] = [
  {
    name: "Amara Okafor",
    role: "Watch collector",
    avatarClassName: "bg-primary-100 text-primary-800",
    productName: "Rolex Submariner Watch",
    productSlug: "dummy-98",
    quote:
      "The Rolex Submariner Watch keeps near-perfect time and the bracelet felt broken-in on day one. It is the only watch I reach for now.",
  },
  {
    name: "Daniel Kim",
    role: "Weekend tennis player",
    avatarClassName: "bg-accent-500/25 text-accent-text",
    productName: "Tennis Racket",
    productSlug: "dummy-152",
    quote:
      "The Tennis Racket has a forgiving sweet spot and a grip that stays put through a full match. My serve finally feels dependable.",
  },
  {
    name: "Priya Nair",
    role: "Small business owner",
    avatarClassName: "bg-primary-50 text-primary-700",
    productName: "iPhone 13 Pro",
    productSlug: "dummy-123",
    quote:
      "The iPhone 13 Pro replaced a three-year-old phone and the camera alone was worth it. Checkout was quick and it arrived two days early.",
  },
  {
    name: "Marcus Bell",
    role: "Rec league guard",
    avatarClassName: "bg-primary-200 text-primary-900",
    productName: "Basketball",
    productSlug: "dummy-140",
    quote:
      "The Basketball has held its shape through a full season indoors and the grip is still tacky. Easy recommendation for a weekly game.",
  },
];

function initialsFor(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function Testimonies() {
  return (
    <section className="w-full px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-10 text-center md:mb-14">
          <h2 className="mb-3 font-display text-3xl font-semibold tracking-tight text-gray-primary md:text-4xl">
            What customers say
          </h2>
          <p className="mx-auto max-w-2xl text-gray-secondary">
            Notes from customers who shop the tended. catalog for phones,
            watches, and sport.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="glass-component h-full text-center">
              <CardHeader className="pt-6">
                <div
                  role="img"
                  aria-label={`Portrait of ${testimonial.name}`}
                  className={`mx-auto mb-4 flex size-20 items-center justify-center rounded-full text-xl font-semibold tracking-wide ring-1 ring-white/60 ${testimonial.avatarClassName}`}
                >
                  <span aria-hidden="true">{initialsFor(testimonial.name)}</span>
                </div>
                <CardTitle className="text-base font-semibold tracking-tight text-gray-primary">
                  {testimonial.name}
                </CardTitle>
                <p className="text-sm text-gray-tertiary">{testimonial.role}</p>
              </CardHeader>
              <CardContent>
                <blockquote className="text-sm leading-relaxed text-gray-secondary">
                  “{testimonial.quote}”
                </blockquote>
              </CardContent>
              <CardFooter className="flex-col gap-3 pb-6">
                <div
                  className="flex items-center gap-0.5"
                  role="img"
                  aria-label="Rated 5 out of 5"
                >
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className="size-3.5 text-yellow-500"
                      fill="currentColor"
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <Link
                  href={`/products/${testimonial.productSlug}`}
                  className="group inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
                >
                  {testimonial.productName}
                  <ArrowUpRight
                    className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
