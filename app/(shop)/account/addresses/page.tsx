import { Suspense } from "react";
import { AddressForm } from "@/features/account/components/AddressForm";
import { AddressList } from "@/features/account/components/AddressList";
import { listAddresses } from "@/features/account/address-actions";
import { requireAccountSession } from "@/features/account/require-session";
import { Skeleton } from "@/components/ui/skeleton";

export default async function AccountAddressesPage() {
  // Memoized per request: AccountLayout already resolved this.
  await requireAccountSession("/account/addresses");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-gray-primary">
          Addresses
        </h2>
        <p className="text-sm text-gray-tertiary">
          Save shipping details for a faster checkout.
        </p>
      </div>

      {/*
       * The address book query streams behind this boundary while the header
       * and the add-address form paint immediately.
       */}
      <Suspense fallback={<AddressListSkeleton />}>
        <AddressBookSection />
      </Suspense>

      <section className="glass-component p-6 md:p-8">
        <div className="mb-6 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-gray-primary">
            Add an address
          </h2>
          <p className="text-sm text-gray-tertiary">
            Only fields validated by the server are saved.
          </p>
        </div>

        <AddressForm />
      </section>
    </div>
  );
}

function AddressListSkeleton() {
  return (
    <section className="space-y-4" aria-busy="true" aria-live="polite">
      {[0, 1].map((i) => (
        <div key={i} className="glass-component space-y-2 p-5">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-4 w-64 rounded-full" />
          <Skeleton className="h-4 w-48 rounded-full" />
        </div>
      ))}
      <span className="sr-only">Loading addresses…</span>
    </section>
  );
}

async function AddressBookSection() {
  let addresses: Awaited<ReturnType<typeof listAddresses>> = [];
  let dbReady = true;
  try {
    addresses = await listAddresses();
  } catch (error) {
    dbReady = false;
    console.error("Addresses DB unavailable — run prisma migrate + generate:", error);
  }

  return (
    <>
      {!dbReady ? (
        <div role="alert" className="glass-component border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-gray-primary">
          <p className="font-semibold">Database tables are missing.</p>
          <p className="mt-1 text-gray-tertiary">
            Run <code className="font-mono">npx prisma migrate dev --name demo_expansion</code> then{" "}
            <code className="font-mono">npx prisma generate</code> and{" "}
            <code className="font-mono">npx prisma db seed</code>, then refresh.
          </p>
        </div>
      ) : null}
      <section className="space-y-4">
        <AddressList addresses={addresses} />
      </section>
    </>
  );
}
