import { CartPage } from "@/features/cart/components/CartPage";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = {
  title: "Cart | tended.",
  description: "Review your items and proceed to checkout.",
};

export default function Page() {
  return <CartPage />;
}
