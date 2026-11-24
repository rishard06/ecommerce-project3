import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Tag,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * The admin destinations shared by the desktop sidebar and tests. Kept out of
 * the JSX component so the active-link rules can be tested without a browser
 * renderer.
 */
export const ADMIN_NAV_LINKS: readonly AdminNavLink[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/coupons", label: "Coupons", icon: Tag },
];

/**
 * Dashboard only matches its exact route; every other section stays active on
 * nested routes such as `/admin/orders/[id]`.
 */
export function isAdminNavLinkActive(pathname: string, href: string): boolean {
  if (pathname === href) {
    return true;
  }

  return href !== "/admin" && pathname.startsWith(`${href}/`);
}
