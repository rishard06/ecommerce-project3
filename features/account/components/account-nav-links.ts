import {
  LayoutDashboard,
  MapPin,
  Package,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface AccountNavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * The account destinations shared by the desktop sidebar and tests. Kept out
 * of the JSX component so the active-link rules can be tested without a
 * browser renderer.
 */
export const ACCOUNT_NAV_LINKS: readonly AccountNavLink[] = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/profile", label: "Profile", icon: UserRound },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

/**
 * Overview only matches its exact route; every other section stays active on
 * nested routes such as `/account/orders/[id]`.
 */
export function isAccountNavLinkActive(pathname: string, href: string): boolean {
  if (pathname === href) {
    return true;
  }

  return href !== "/account" && pathname.startsWith(`${href}/`);
}
