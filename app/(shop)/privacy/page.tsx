import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What venn. collects, why, and the choices you have.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <header className="mb-8 md:mb-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-tertiary">
          Legal
        </p>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-gray-primary md:text-5xl">
          Privacy Policy
        </h1>
        <p className="font-medium text-gray-tertiary">Last updated 10 November 2026</p>
      </header>

      <div className="glass-component space-y-7 rounded-[1.75rem] p-6 text-gray-secondary sm:p-8">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">What we collect</h2>
          <p className="leading-relaxed">
            We collect the details you give us — name, email, shipping address,
            and order history — plus basic technical information such as device
            type and pages visited.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">How we use it</h2>
          <p className="leading-relaxed">
            Your information is used to process orders, provide support, prevent
            fraud, and improve the store. With your consent, we also send
            occasional product notes. You can unsubscribe at any time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">Cookies</h2>
          <p className="leading-relaxed">
            We use essential cookies to keep your cart and session working, and a
            small amount of analytics to understand which pages are useful.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">Sharing</h2>
          <p className="leading-relaxed">
            We share only what is necessary with payment, hosting, and delivery
            partners. We do not sell personal information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">Your choices</h2>
          <p className="leading-relaxed">
            You can request a copy of your data, correct it, or ask us to delete
            your account. Email{" "}
            <a
              href="mailto:support@venn.shop"
              className="font-semibold text-accent-700 underline-offset-4 hover:underline"
            >
              support@venn.shop
            </a>{" "}
            and we will respond within 30 days.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-primary">Retention</h2>
          <p className="leading-relaxed">
            Order records are kept for as long as required for tax and accounting
            purposes. Marketing preferences are kept until you withdraw them.
          </p>
        </section>
      </div>
    </main>
  );
}
