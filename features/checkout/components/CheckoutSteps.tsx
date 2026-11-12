import { Check } from "lucide-react";

const STEPS = [
  { number: 1, label: "Shipping" },
  { number: 2, label: "Payment" },
  { number: 3, label: "Review" },
  { number: 4, label: "Done" },
] as const;

interface CheckoutStepsProps {
  step: number;
}

export function CheckoutSteps({ step }: CheckoutStepsProps) {
  return (
    <ol aria-label="Checkout progress" className="grid grid-cols-4 gap-2 sm:gap-4">
      {STEPS.map((item) => {
        const isComplete = step > item.number;
        const isCurrent = step === item.number;

        return (
          <li
            key={item.number}
            aria-current={isCurrent ? "step" : undefined}
            className="space-y-2"
          >
            <div
              className={`h-1 rounded-full transition-colors ${
                isComplete || isCurrent ? "bg-accent-500" : "bg-gray-primary/10"
              }`}
            />
            <div className="flex items-center gap-2">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isComplete
                    ? "bg-accent-500 text-gray-primary"
                    : isCurrent
                      ? "bg-gray-primary text-white"
                      : "bg-gray-primary/10 text-gray-tertiary"
                }`}
                aria-hidden="true"
              >
                {isComplete ? <Check className="size-3.5" /> : item.number}
              </span>
              <span
                className={`truncate text-xs font-semibold sm:text-sm ${
                  isCurrent || isComplete ? "text-gray-primary" : "text-gray-tertiary"
                }`}
              >
                {item.label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
