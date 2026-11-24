"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ADMIN_NAV_LINKS, isAdminNavLinkActive } from "./admin-nav-links";

export interface AdminNavUser {
  name: string;
  email: string;
  image?: string | null;
}

export function AdminNav({ user }: { user: AdminNavUser }) {
  const pathname = usePathname();

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
        <Avatar className="size-10">
          {user.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback className="bg-action text-sm font-bold text-action-foreground">
            {initials || "A"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-primary">{user.name}</p>
          <p className="truncate text-xs text-gray-tertiary">{user.email}</p>
        </div>
      </div>

      <nav
        aria-label="Admin"
        className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col"
      >
        {ADMIN_NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive = isAdminNavLinkActive(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-action/60 text-action-foreground"
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
