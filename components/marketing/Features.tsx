import React from "react";
import { Star, ShoppingBag, Headphones, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const features: Feature[] = [
  {
    title: "Premium quality",
    description:
      "Made with materials chosen to last, not to hit a price point.",
    icon: <Star className="size-7" aria-hidden="true" />,
  },
  {
    title: "Fast shipping",
    description:
      "Orders leave the same day and arrive while the excitement is still fresh.",
    icon: <ShoppingBag className="size-7" aria-hidden="true" />,
  },
  {
    title: "24/7 support",
    description:
      "A real person, around the clock, who can actually solve the problem.",
    icon: <Headphones className="size-7" aria-hidden="true" />,
  },
  {
    title: "30-day returns",
    description:
      "Change your mind within a month — no forms, no interrogation.",
    icon: <CheckCircle className="size-7" aria-hidden="true" />,
  },
];

export default function Features() {
  return (
    <section className="w-full px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-10 text-center md:mb-14">
          <h2 className="mb-3 text-3xl font-semibold tracking-tight text-gray-primary md:text-4xl">
            Why shop with us
          </h2>
          <p className="mx-auto max-w-2xl text-gray-secondary">
            The boring parts — quality, delivery, support — done properly.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="glass-component h-full">
              <CardHeader className="pt-6">
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent-500/30 text-accent-700">
                  {feature.icon}
                </div>
                <CardTitle className="text-lg font-semibold tracking-tight text-gray-primary">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <p className="text-sm leading-relaxed text-gray-tertiary">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
