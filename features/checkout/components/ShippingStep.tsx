"use client";

import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AddressRow } from "@/features/account/types";
import type { ShippingFormState } from "../preamble";

const INPUT_CLASS =
  "h-12 rounded-xl border-transparent bg-white/60 px-4 focus-visible:ring-2 focus-visible:ring-accent-500/40";
const LABEL_CLASS = "block text-sm font-bold text-gray-secondary";

interface ShippingStepProps {
  value: ShippingFormState;
  savedAddresses: AddressRow[];
  selectedAddressId: string;
  error: string | null;
  onChange: (field: keyof ShippingFormState, value: string) => void;
  onSelectSavedAddress: (addressId: string) => void;
  onNext: () => void;
}

export function ShippingStep({
  value,
  savedAddresses,
  selectedAddressId,
  error,
  onChange,
  onSelectSavedAddress,
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

      {savedAddresses.length > 0 ? (
        <div className="space-y-2">
          <label htmlFor="savedAddress" className={LABEL_CLASS}>
            Use a saved address
          </label>
          <select
            id="savedAddress"
            value={selectedAddressId}
            onChange={(event) => onSelectSavedAddress(event.target.value)}
            className="h-12 w-full rounded-xl border-transparent bg-white/60 px-4 text-gray-primary focus-visible:ring-2 focus-visible:ring-accent-500/40"
          >
            <option value="">Enter a new address</option>
            {savedAddresses.map((address) => (
              <option key={address.id} value={address.id}>
                {address.fullName} — {address.line1}, {address.city}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-tertiary">
            Selecting an address only fills the fields below. Checkout never
            writes back to your address book.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="firstName" className={LABEL_CLASS}>
            First Name
          </label>
          <Input
            id="firstName"
            name="firstName"
            value={value.firstName}
            onChange={(event) => onChange("firstName", event.target.value)}
            className={INPUT_CLASS}
            placeholder="Ryman"
            autoComplete="given-name"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="lastName" className={LABEL_CLASS}>
            Last Name
          </label>
          <Input
            id="lastName"
            name="lastName"
            value={value.lastName}
            onChange={(event) => onChange("lastName", event.target.value)}
            className={INPUT_CLASS}
            placeholder="Alex"
            autoComplete="family-name"
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="address" className={LABEL_CLASS}>
            Address
          </label>
          <Input
            id="address"
            name="address"
            value={value.address}
            onChange={(event) => onChange("address", event.target.value)}
            className={INPUT_CLASS}
            placeholder="123 Tech Avenue"
            autoComplete="address-line1"
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="line2" className={LABEL_CLASS}>
            Address Line 2{" "}
            <span className="font-medium text-gray-tertiary">(optional)</span>
          </label>
          <Input
            id="line2"
            name="line2"
            value={value.line2}
            onChange={(event) => onChange("line2", event.target.value)}
            className={INPUT_CLASS}
            placeholder="Apartment, suite, unit"
            autoComplete="address-line2"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="city" className={LABEL_CLASS}>
            City
          </label>
          <Input
            id="city"
            name="city"
            value={value.city}
            onChange={(event) => onChange("city", event.target.value)}
            className={INPUT_CLASS}
            placeholder="San Francisco"
            autoComplete="address-level2"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="region" className={LABEL_CLASS}>
            State / Region
          </label>
          <Input
            id="region"
            name="region"
            value={value.region}
            onChange={(event) => onChange("region", event.target.value)}
            className={INPUT_CLASS}
            placeholder="CA"
            autoComplete="address-level1"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="postalCode" className={LABEL_CLASS}>
            Postal Code
          </label>
          <Input
            id="postalCode"
            name="postalCode"
            value={value.postalCode}
            onChange={(event) => onChange("postalCode", event.target.value)}
            className={INPUT_CLASS}
            placeholder="94103"
            autoComplete="postal-code"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="country" className={LABEL_CLASS}>
            Country
          </label>
          <Input
            id="country"
            name="country"
            value={value.country}
            onChange={(event) => onChange("country", event.target.value)}
            className={INPUT_CLASS}
            placeholder="United States"
            autoComplete="country-name"
            required
          />
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="h-12 w-full rounded-2xl bg-gray-primary font-semibold text-white hover:bg-gray-secondary"
      >
        Continue to review
      </Button>
    </form>
  );
}
