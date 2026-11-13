import type { ShippingInput } from "@/features/checkout/types";

/**
 * Address form payload accepted by the account address actions. It is the
 * checkout shipping contract, so a saved address can prefill checkout without
 * a second shape to keep in sync.
 */
export type AddressInput = ShippingInput;

/** A saved address row rendered by the account area. */
export interface AddressRow extends Omit<ShippingInput, "line2"> {
  id: string;
  userId: string;
  line2: string | null;
  isDefault: boolean;
}
