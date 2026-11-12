import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping",
  description: "Processing times, delivery estimates, and tracking for venn. orders.",
};

export default function ShippingPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <header className="mb-8 md:mb-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-tertiary">
          Help
        </p>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-gray-primary md:text-5xl">
          Shipping
        </h1>
        <p className="font-medium text-gray-tertiary">
          Clear timelines, no surprises at checkout.
        </p>
      </header>

      <div className="glass-component space-y-7 rounded-[1.75rem] p-6 text-gray-secondary sm:p-8">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">Processing</h2>
          <p className="leading-relaxed">
            Orders placed before 2pm on a business day are packed the same day.
            Everything else leaves the warehouse the next business day.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">Delivery options</h2>
          <ul className="list-disc space-y-1.5 pl-5 leading-relaxed">
            <li>Standard — 3 to 5 business days, free over $75.</li>
            <li>Express — 1 to 2 business days.</li>
            <li>Pickup — ready at our Soundville studio within 24 hours.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">Tracking</h2>
          <p className="leading-relaxed">
            A tracking link is emailed as soon as your parcel is handed to the
            carrier. It can take a few hours to show the first scan.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">Delays</h2>
          <p className="leading-relaxed">
            Weather and carrier volumes can occasionally add a day. If your order
            is running late, contact us and we will chase it for you.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">Questions</h2>
          <p className="leading-relaxed">
            Visit the{" "}
            <a
              href="/contact"
              className="font-semibold text-accent-700 underline-offset-4 hover:underline"
            >
              contact page
            </a>{" "}
            or email{" "}
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
