import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { CheckoutForm } from "@/features/checkout/components/CheckoutForm";
import { CheckoutSteps } from "@/features/checkout/components/CheckoutSteps";
import { CheckoutSummary } from "@/features/checkout/components/CheckoutSummary";
import type { CheckoutStep } from "@/features/checkout/types";

const STEP_NUMBERS: Record<CheckoutStep, number> = {
  shipping: 1,
  review: 2,
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string | string[] }>;
}) {
  const params = await searchParams;
  const step: CheckoutStep = params.step === "review" ? "review" : "shipping";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <div className="mb-10 flex flex-col justify-between gap-5 md:mb-12 md:flex-row md:items-end">
        <div className="space-y-2">
          <nav
            aria-label="Breadcrumb"
            className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-tertiary"
          >
            <Link
              href="/cart"
              className="rounded transition-colors hover:text-gray-primary"
            >
              Cart
            </Link>
            <ChevronRight
              className="size-4 text-gray-quaternary"
              aria-hidden="true"
            />
            <span aria-current="page" className="text-gray-primary">
              Checkout
            </span>
          </nav>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-primary md:text-4xl">
            Checkout
          </h1>
        </div>

        <div className="flex items-center gap-2.5 rounded-full border border-white/50 bg-white/50 px-4 py-2 shadow-soft backdrop-blur-xl">
          <div className="rounded-full bg-green-600 p-1">
            <ShieldCheck className="size-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-gray-primary">
            Encrypted &amp; secure
          </span>
        </div>
      </div>

      <div className="mb-8 max-w-3xl">
        <CheckoutSteps step={STEP_NUMBERS[step]} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-8">
          <CheckoutForm step={step} />
        </div>
        <div className="lg:col-span-4">
          <CheckoutSummary />
        </div>
      </div>
    </div>
  );
}
