import type { ReactNode } from "react";
import { AccountNav } from "@/features/account/components/AccountNav";
import { requireAccountSession } from "@/features/account/require-session";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await requireAccountSession("/account");

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
      <header className="mb-8 space-y-2 md:mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-tertiary">
          Your account
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-primary md:text-4xl">
          Hello, {session.user.name?.split(" ")[0] || "there"}
        </h1>
      </header>

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <aside className="lg:col-span-3">
          <AccountNav
            user={{
              name: session.user.name,
              email: session.user.email,
              image: session.user.image,
            }}
          />
        </aside>
        <div className="min-w-0 lg:col-span-9">{children}</div>
      </div>
    </div>
  );
}
