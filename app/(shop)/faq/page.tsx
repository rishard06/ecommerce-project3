import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Short answers about orders, delivery, returns, and payments.",
};

const faqs = [
  {
    question: "How long does delivery take?",
    answer:
      "Standard orders arrive in 3 to 5 business days. Express takes 1 to 2 business days, and studio pickup is usually ready within a day.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "This demo store accepts test card payments only. No real charge is made, and card details are never stored.",
  },
  {
    question: "Can I change or cancel an order?",
    answer:
      "Email us as soon as possible. If the order has not been packed, we can change the address or cancel it for a full refund.",
  },
  {
    question: "How do returns work?",
    answer:
      "You have 30 days from delivery. Request a prepaid label from our returns page, send the item back unused, and we will refund you within a few business days.",
  },
  {
    question: "Do you ship internationally?",
    answer:
      "Yes. International orders take 7 to 12 business days depending on the destination and are shown at checkout.",
  },
  {
    question: "How do I care for my purchase?",
    answer:
      "Care notes are included in each product description. If something wears unexpectedly, contact us and we will help.",
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <header className="mb-8 md:mb-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-tertiary">
          Help
        </p>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-gray-primary md:text-5xl">
          Frequently asked questions
        </h1>
        <p className="font-medium text-gray-tertiary">
          The things people ask most, answered briefly.
        </p>
      </header>

      <div className="space-y-3">
        {faqs.map((faq) => (
          <details
            key={faq.question}
            className="glass-component group rounded-[1.5rem] p-6 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-semibold text-gray-primary">
              {faq.question}
              <span
                aria-hidden="true"
                className="text-xl leading-none text-accent-700 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 leading-relaxed text-gray-secondary">{faq.answer}</p>
          </details>
        ))}
      </div>

      <p className="mt-8 text-sm text-gray-tertiary">
        Still stuck?{" "}
        <a
          href="/contact"
          className="font-semibold text-accent-700 underline-offset-4 hover:underline"
        >
          Contact us
        </a>{" "}
        and we will get back to you within one business day.
      </p>
    </main>
  );
}
