"use client";

import * as React from "react";
import Image from "next/image";
import { CheckCircle2, LifeBuoy, Star } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Product } from "../types";

interface ProductTabsProps {
  product: Product;
}

const triggerClass =
  "shrink-0 rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-tertiary transition-colors hover:text-gray-secondary data-[state=active]:bg-accent-500 data-[state=active]:text-gray-primary data-[state=active]:shadow-soft";

export function ProductTabs({ product }: ProductTabsProps) {
  return (
    <div className="mt-24">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="no-scrollbar mb-10 flex h-auto w-full items-center justify-start gap-1 overflow-x-auto rounded-full border border-gray-primary/10 bg-gray-primary/[0.04] p-1">
          <TabsTrigger value="details" className={triggerClass}>
            Details
          </TabsTrigger>
          <TabsTrigger value="specifications" className={triggerClass}>
            Specifications
          </TabsTrigger>
          <TabsTrigger value="reviews" className={triggerClass}>
            Reviews ({product.reviewCount.toLocaleString()})
          </TabsTrigger>
          <TabsTrigger value="support" className={triggerClass}>
            Support
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-0 outline-none">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-7">
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold tracking-tight text-gray-primary md:text-4xl">
                  Made to be used, not admired.
                </h2>
                <p className="text-lg leading-relaxed text-gray-secondary">
                  The {product.name} is built from materials chosen for how they
                  age, not how they photograph on day one.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {product.features.map((feature, index) => (
                  <div
                    key={`${feature}-${index}`}
                    className="glass-component flex items-center gap-3 rounded-2xl p-4"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/30">
                      <CheckCircle2 className="size-4 text-accent-700" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-semibold text-gray-secondary">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-component group relative aspect-[4/3] overflow-hidden rounded-[1.75rem]">
              <Image
                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop"
                alt=""
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 ease-out-quart group-hover:scale-[1.03]"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="specifications" className="outline-none">
          <div className="glass-component rounded-[1.75rem] p-6 md:p-10">
            <h3 className="mb-6 text-xl font-semibold tracking-tight text-gray-primary">
              Technical specifications
            </h3>
            <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
              {[
                { label: "Category", value: product.category },
                { label: "Model", value: "2024 edition" },
                { label: "Warranty", value: "24 months limited" },
                { label: "In the box", value: "Standard accessories" },
              ].map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-center justify-between border-b border-gray-primary/10 py-4"
                >
                  <span className="text-sm font-medium text-gray-tertiary">{spec.label}</span>
                  <span className="text-sm font-semibold capitalize text-gray-secondary">
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="outline-none">
          <div className="glass-component flex flex-col items-start gap-5 rounded-[1.75rem] p-6 md:flex-row md:items-center md:justify-between md:p-10">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-4xl font-semibold tabular-nums tracking-tight text-gray-primary">
                  {product.rating}
                </span>
                <Star className="size-5 fill-yellow-500 text-yellow-500" aria-hidden="true" />
              </div>
              <p className="text-sm text-gray-tertiary">
                Based on {product.reviewCount.toLocaleString()} reviews. Full
                reviews are listed below.
              </p>
            </div>
            <Button
              variant="outline"
              className="h-11 rounded-full border-gray-primary/15 px-6 font-semibold hover:bg-accent-500/10"
              onClick={() => {
                const prefersReducedMotion = window.matchMedia(
                  "(prefers-reduced-motion: reduce)"
                ).matches;
                document
                  .getElementById("customer-reviews")
                  ?.scrollIntoView({
                    behavior: prefersReducedMotion ? "auto" : "smooth",
                    block: "start",
                  });
              }}
            >
              Jump to reviews
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="support" className="outline-none">
          <div className="glass-component flex flex-col gap-5 rounded-[1.75rem] p-6 md:flex-row md:items-center md:justify-between md:p-10">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-500/30">
                <LifeBuoy className="size-5 text-accent-700" aria-hidden="true" />
              </div>
              <div>
                <h3 className="mb-1 text-lg font-semibold text-gray-primary">
                  Need a hand?
                </h3>
                <p className="text-sm leading-relaxed text-gray-tertiary">
                  Free returns within 30 days, and a real person available
                  around the clock.
                </p>
              </div>
            </div>
            <Button
              asChild
              className="h-11 rounded-full bg-accent-500 px-6 font-semibold text-gray-primary hover:bg-accent-600"
            >
              <a href="mailto:support@venn.shop">Contact support</a>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
