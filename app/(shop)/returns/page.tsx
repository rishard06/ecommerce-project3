import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Returns",
  description: "How to return an item to venn., and when your refund arrives.",
};

export default function ReturnsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <header className="mb-8 md:mb-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-tertiary">
          Help
        </p>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-gray-primary md:text-5xl">
          Returns
        </h1>
        <p className="font-medium text-gray-tertiary">
          Thirty days, no awkward questions.
        </p>
      </header>

      <div className="glass-component space-y-7 rounded-[1.75rem] p-6 text-gray-secondary sm:p-8">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">The window</h2>
          <p className="leading-relaxed">
            You have 30 days from delivery to return unused items in their
            original packaging. Opened items are accepted if they are undamaged
            and complete.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">How to start</h2>
          <ol className="list-decimal space-y-1.5 pl-5 leading-relaxed">
            <li>Email your order number to support@venn.shop.</li>
            <li>We reply with a prepaid label and simple packing steps.</li>
            <li>Drop the parcel off within 7 days of receiving the label.</li>
          </ol>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">Refunds</h2>
          <p className="leading-relaxed">
            Refunds are issued to the original payment method within 3 to 5
            business days of the item reaching us. Shipping is refunded when the
            return is due to a fault on our side.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">Exchanges</h2>
          <p className="leading-relaxed">
            Need a different colour or size? Start a return and place a new order
            so the item you want is reserved immediately.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">Faulty items</h2>
          <p className="leading-relaxed">
            If something arrives damaged, send a photo with your order number and
            we will replace it or refund you in full, including return shipping.
          </p>
        </section>
      </div>
    </main>
  );
}
