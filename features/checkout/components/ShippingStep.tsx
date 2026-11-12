"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Truck, Zap, Store } from "lucide-react";
import { SHIPPING_RATES, type ShippingMethod } from "@/lib/pricing";
import type { ShippingAddress } from "../types";

const SHIPPING_OPTIONS = [
  { id: "standard", label: "Standard", hint: "3-5 business days", icon: Truck },
  { id: "express", label: "Express", hint: "1-2 business days", icon: Zap },
  { id: "pickup", label: "Pickup", hint: "Ready today", icon: Store },
] as const satisfies ReadonlyArray<{
  id: ShippingMethod;
  label: string;
  hint: string;
  icon: typeof Truck;
}>;

interface ShippingStepProps {
  value: ShippingAddress;
  method: ShippingMethod;
  onChange: (field: keyof ShippingAddress, value: string) => void;
  onMethodChange: (method: ShippingMethod) => void;
  onNext: () => void;
}

export function ShippingStep({
  value,
  method,
  onChange,
  onMethodChange,
  onNext,
}: ShippingStepProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
      className="glass-component space-y-8 p-6 shadow-sm md:p-8"
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-3 text-xl font-bold text-gray-primary">
          <span className="flex size-8 items-center justify-center rounded-full bg-gray-primary text-sm font-bold text-white">
            1
          </span>
          Shipping Information
        </h2>
        <ShieldCheck className="size-6 text-accent-500" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="firstName" className="block text-sm font-bold text-gray-secondary">
            First Name
          </label>
          <Input
            id="firstName"
            name="firstName"
            value={value.firstName}
            onChange={(event) => onChange("firstName", event.target.value)}
            className="h-12 rounded-xl border-transparent bg-white/60 px-4 focus-visible:ring-2 focus-visible:ring-accent-500/40"
            placeholder="Ryman"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="lastName" className="block text-sm font-bold text-gray-secondary">
            Last Name
          </label>
          <Input
            id="lastName"
            name="lastName"
            value={value.lastName}
            onChange={(event) => onChange("lastName", event.target.value)}
            className="h-12 rounded-xl border-transparent bg-white/60 px-4 focus-visible:ring-2 focus-visible:ring-accent-500/40"
            placeholder="Alex"
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="address" className="block text-sm font-bold text-gray-secondary">
            Address
          </label>
          <Input
            id="address"
            name="address"
            value={value.address}
            onChange={(event) => onChange("address", event.target.value)}
            className="h-12 rounded-xl border-transparent bg-white/60 px-4 focus-visible:ring-2 focus-visible:ring-accent-500/40"
            placeholder="123 Tech Avenue, Silicon Valley"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="city" className="block text-sm font-bold text-gray-secondary">
            City
          </label>
          <Input
            id="city"
            name="city"
            value={value.city}
            onChange={(event) => onChange("city", event.target.value)}
            className="h-12 rounded-xl border-transparent bg-white/60 px-4 focus-visible:ring-2 focus-visible:ring-accent-500/40"
            placeholder="San Francisco"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="postalCode" className="block text-sm font-bold text-gray-secondary">
            Postal Code
          </label>
          <Input
            id="postalCode"
            name="postalCode"
            value={value.postalCode}
            onChange={(event) => onChange("postalCode", event.target.value)}
            className="h-12 rounded-xl border-transparent bg-white/60 px-4 focus-visible:ring-2 focus-visible:ring-accent-500/40"
            placeholder="94103"
            required
          />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-bold text-gray-secondary">Shipping Method</legend>
        <div role="radiogroup" aria-label="Shipping method" className="grid gap-3 md:grid-cols-3">
          {SHIPPING_OPTIONS.map((option) => {
            const isSelected = method === option.id;
            const rate = SHIPPING_RATES[option.id];

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onMethodChange(option.id)}
                className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-[background-color,border-color,box-shadow] duration-200 ease-out-quart ${
                  isSelected
                    ? "border-accent-600 bg-white/70 shadow-soft"
                    : "border-gray-primary/10 bg-white/30 hover:border-gray-primary/20 hover:bg-white/50"
                }`}
              >
                <option.icon
                  className={`size-5 shrink-0 ${
                    isSelected ? "text-accent-700" : "text-gray-tertiary"
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-primary">
                    {option.label}
                  </span>
                  <span className="block text-xs text-gray-tertiary">{option.hint}</span>
                </span>
                <span className="ml-auto text-sm font-semibold tabular-nums text-gray-primary">
                  {rate === 0 ? "Free" : `$${rate.toFixed(2)}`}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <Button
        type="submit"
        className="h-12 w-full rounded-2xl bg-gray-primary font-semibold text-white hover:bg-gray-secondary"
      >
        Continue to payment
      </Button>
    </form>
  );
}
