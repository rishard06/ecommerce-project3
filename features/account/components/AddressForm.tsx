"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveAddress } from "@/features/checkout/actions";
import type { ShippingAddress } from "@/features/checkout/types";

const EMPTY_ADDRESS: ShippingAddress = {
  firstName: "",
  lastName: "",
  address: "",
  city: "",
  postalCode: "",
  country: "United States",
};

const FIELD_CLASS =
  "h-12 rounded-xl border-transparent bg-white/60 px-4 focus-visible:ring-2 focus-visible:ring-accent-500/40";

export function AddressForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [form, setForm] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof ShippingAddress, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      await saveAddress(userId, { ...form, isDefault });
      setForm(EMPTY_ADDRESS);
      setIsDefault(false);
      setMessage("Address saved.");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save this address. Please check the fields and try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="firstName" className="block text-sm font-bold text-gray-secondary">
            First name
          </label>
          <Input
            id="firstName"
            value={form.firstName}
            onChange={(event) => updateField("firstName", event.target.value)}
            className={FIELD_CLASS}
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="lastName" className="block text-sm font-bold text-gray-secondary">
            Last name
          </label>
          <Input
            id="lastName"
            value={form.lastName}
            onChange={(event) => updateField("lastName", event.target.value)}
            className={FIELD_CLASS}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="address" className="block text-sm font-bold text-gray-secondary">
            Street address
          </label>
          <Input
            id="address"
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            className={FIELD_CLASS}
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="city" className="block text-sm font-bold text-gray-secondary">
            City
          </label>
          <Input
            id="city"
            value={form.city}
            onChange={(event) => updateField("city", event.target.value)}
            className={FIELD_CLASS}
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="postalCode" className="block text-sm font-bold text-gray-secondary">
            Postal code
          </label>
          <Input
            id="postalCode"
            value={form.postalCode}
            onChange={(event) => updateField("postalCode", event.target.value)}
            className={FIELD_CLASS}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="country" className="block text-sm font-bold text-gray-secondary">
            Country
          </label>
          <Input
            id="country"
            value={form.country}
            onChange={(event) => updateField("country", event.target.value)}
            className={FIELD_CLASS}
            required
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-gray-secondary">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(event) => setIsDefault(event.target.checked)}
          className="size-4 rounded border-gray-primary/20"
        />
        Set as default address
      </label>

      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm font-medium text-accent-700">
          {message}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isSaving}
        className="h-12 w-full rounded-2xl bg-gray-primary font-semibold text-white hover:bg-gray-secondary sm:w-auto sm:px-8"
      >
        {isSaving ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Saving…
          </>
        ) : (
          "Save address"
        )}
      </Button>
    </form>
  );
}
