"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Trash2, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteAddress,
  setDefaultAddress,
} from "@/features/account/address-actions";
import type { AddressRow } from "@/features/account/types";

export function AddressList({ addresses }: { addresses: AddressRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (addresses.length === 0) {
    return (
      <div className="glass-component p-8 text-center">
        <MapPin className="mx-auto mb-3 size-7 text-gray-quaternary" aria-hidden="true" />
        <p className="font-semibold text-gray-primary">No saved addresses</p>
        <p className="text-sm text-gray-tertiary">
          Add one below to reuse it at checkout.
        </p>
      </div>
    );
  }

  const runAction = (action: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Something went wrong. Please try again."
        );
      }
    });
  };

  return (
    <div className="space-y-4">
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <ul className="grid gap-4 sm:grid-cols-2">
        {addresses.map((address) => (
          <li key={address.id} className="glass-component space-y-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-gray-primary">
                {address.firstName} {address.lastName}
              </p>
              {address.isDefault ? (
                <span className="rounded-full bg-accent-500/60 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-gray-primary">
                  Default
                </span>
              ) : null}
            </div>
            <address className="text-sm not-italic leading-relaxed text-gray-tertiary">
              <span className="block">{address.address}</span>
              <span className="block">
                {address.city}, {address.postalCode}
              </span>
              <span className="block">{address.country}</span>
            </address>
            <div className="flex flex-wrap gap-2 pt-1">
              {!address.isDefault ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => runAction(() => setDefaultAddress(address.id))}
                  className="h-9 rounded-full px-4 text-xs font-semibold"
                >
                  {isPending ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Star className="size-3.5" aria-hidden="true" />
                  )}
                  Make default
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => runAction(() => deleteAddress(address.id))}
                className="h-9 rounded-full px-4 text-xs font-semibold text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
