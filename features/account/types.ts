/** Address form payload accepted by the account address actions. */
export interface AddressInput {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

/** A saved address row rendered by the account area. */
export interface AddressRow extends AddressInput {
  id: string;
  userId: string;
  isDefault: boolean;
}
