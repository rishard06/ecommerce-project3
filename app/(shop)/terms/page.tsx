import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you shop with venn.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <header className="mb-8 md:mb-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-tertiary">
          Legal
        </p>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-gray-primary md:text-5xl">
          Terms of Service
        </h1>
        <p className="font-medium text-gray-tertiary">Last updated 10 November 2026</p>
      </header>

      <div className="glass-component space-y-7 rounded-[1.75rem] p-6 text-gray-secondary sm:p-8">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">Using this site</h2>
          <p className="leading-relaxed">
            By browsing or ordering from venn. you agree to these terms. Use the
            site lawfully, keep your account details accurate, and do not attempt
            to disrupt checkout, payments, or any part of the store.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">Orders and pricing</h2>
          <p className="leading-relaxed">
            Prices are shown in US dollars and include applicable taxes at
            checkout. We may correct obvious pricing errors before an order
            ships. An order is accepted once you receive a confirmation email.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">Payment</h2>
          <p className="leading-relaxed">
            This demo store runs on test payment methods and does not charge real
            cards. In a live store, payment would be captured when the order is
            placed.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">Returns</h2>
          <p className="leading-relaxed">
            Unused items can be returned within 30 days of delivery. See our{" "}
            <a
              href="/returns"
              className="font-semibold text-accent-700 underline-offset-4 hover:underline"
            >
              Returns policy
            </a>{" "}
            for the full process.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">Liability</h2>
          <p className="leading-relaxed">
            The store is provided as is for demonstration purposes. To the extent
            permitted by law, venn. is not liable for indirect or consequential
            losses arising from use of the site.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">Contact</h2>
          <p className="leading-relaxed">
            Questions about these terms? Email{" "}
            <a
              href="mailto:support@venn.shop"
              className="font-semibold text-accent-700 underline-offset-4 hover:underline"
            >
              support@venn.shop
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
