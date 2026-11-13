"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogIn,
  MapPin,
  Package,
  Settings,
  UserRound,
} from "lucide-react";

export interface AccountNavUser {
  name: string;
  email: string;
  image?: string | null;
}

const LINKS = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/profile", label: "Profile", icon: UserRound },
  { href: "/account/settings", label: "Settings", icon: Settings },
] as const;

export function AccountNav({ user }: { user: AccountNavUser | null }) {
  const pathname = usePathname();

  if (!user) {
    return (
      <div className="glass-component space-y-4 p-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gray-primary/[0.06]">
          <LogIn className="size-5 text-gray-tertiary" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-gray-primary">Account access</h2>
          <p className="text-sm text-gray-tertiary">
            This area is only available to members.
          </p>
        </div>
        <Link
          href="/login?next=/account"
          className="inline-flex h-10 items-center justify-center rounded-full bg-gray-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-gray-secondary"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="glass-component p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3 border-b border-gray-primary/10 pb-4">
        {user.image ? (
          <img
            src={user.image}
            alt=""
            className="size-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-500 text-sm font-bold text-gray-primary"
          >
            {initials || "U"}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-primary">{user.name}</p>
          <p className="truncate text-xs text-gray-tertiary">{user.email}</p>
        </div>
      </div>

      <nav
        aria-label="Account"
        className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col"
      >
        {LINKS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || (href !== "/account" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-accent-500/60 text-gray-primary"
                  : "text-gray-tertiary hover:bg-gray-primary/[0.04] hover:text-gray-primary"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
