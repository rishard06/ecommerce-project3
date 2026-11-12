import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAccountSession } from "@/features/account/require-session";
import { CheckoutSteps } from "@/features/checkout/components/CheckoutSteps";
import { SuccessContent } from "./success-content";

interface StoredOrder {
  id: string;
  userId?: string | null;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (!id) notFound();

  // Only the fields needed for the ownership check, so this also works on
  // databases created before the Task 1 column expansion.
  let order: StoredOrder | null = null;
  try {
    order = (await prisma.order.findUnique({
      where: { id },
    })) as unknown as StoredOrder | null;
  } catch {
    order = null;
  }
  if (!order) notFound();

  // Someone else's order is not yours to view — send strangers to sign in.
  if (order.userId) {
    const session = await getAccountSession();
    if (!session?.user || session.user.id !== order.userId) {
      redirect(`/login?next=${encodeURIComponent(`/checkout/success?id=${id}`)}`);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <div className="mx-auto mb-10 max-w-3xl">
        <CheckoutSteps step={4} />
      </div>
      <Suspense
        fallback={
          <div className="glass-component mx-auto max-w-2xl animate-pulse p-10 md:p-12">
            <div className="mx-auto size-16 rounded-full bg-gray-primary/10" />
          </div>
        }
      >
        <SuccessContent orderId={order.id} />
      </Suspense>
    </div>
  );
}
