import Link from "next/link";
import { KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { LogoutButton } from "@/features/account/components/LogoutButton";
import { requireAccountSession } from "@/features/account/require-session";

export default async function AccountSettingsPage() {
  const session = await requireAccountSession("/account/settings");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-gray-primary">
          Settings
        </h2>
        <p className="text-sm text-gray-tertiary">
          Session details and account security.
        </p>
      </div>

      <section className="glass-component p-6 md:p-8">
        <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-gray-tertiary">
          Session
        </h3>
        <dl className="space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <UserRound className="mt-0.5 size-4 text-gray-quaternary" aria-hidden="true" />
            <div>
              <dt className="text-gray-tertiary">Signed in as</dt>
              <dd className="font-semibold text-gray-primary">{session.user.name}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 size-4 text-gray-quaternary" aria-hidden="true" />
            <div>
              <dt className="text-gray-tertiary">Email</dt>
              <dd className="font-semibold text-gray-primary">{session.user.email}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck
              className="mt-0.5 size-4 text-gray-quaternary"
              aria-hidden="true"
            />
            <div>
              <dt className="text-gray-tertiary">Email status</dt>
              <dd className="font-semibold text-gray-primary">
                {session.user.emailVerified ? "Verified" : "Not verified"}
              </dd>
            </div>
          </div>
        </dl>
      </section>

      <section className="glass-component p-6 md:p-8">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-gray-tertiary">
          Security
        </h3>
        <p className="mb-5 text-sm text-gray-tertiary">
          Password management is available from the sign-in flow for this demo.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/login?next=/account/settings"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-primary/15 bg-white/40 px-6 text-sm font-semibold text-gray-primary transition-colors hover:bg-white/70"
          >
            <KeyRound className="size-4" aria-hidden="true" />
            Change password
          </Link>
          <LogoutButton />
        </div>
      </section>
    </div>
  );
}
