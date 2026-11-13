import { AddressForm } from "@/features/account/components/AddressForm";
import { AddressList } from "@/features/account/components/AddressList";
import { listAddresses } from "@/features/account/address-actions";
import { requireAccountSession } from "@/features/account/require-session";

export default async function AccountAddressesPage() {
  const session = await requireAccountSession("/account/addresses");
  let addresses: Awaited<ReturnType<typeof listAddresses>> = [];
  let dbReady = true;
  try {
    addresses = await listAddresses(session.user.id);
  } catch (error) {
    dbReady = false;
    console.error("Addresses DB unavailable — run prisma migrate + generate:", error);
  }

  return (
    <div className="space-y-6">
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
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-gray-primary">
          Addresses
        </h2>
        <p className="text-sm text-gray-tertiary">
          Save shipping details for a faster checkout.
        </p>
      </div>

      <section className="space-y-4">
        <AddressList addresses={addresses} />
      </section>

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
