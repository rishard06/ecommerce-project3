import { describe, expect, it } from "vitest";
import { ADMIN_NAV_LINKS, isAdminNavLinkActive } from "./admin-nav-links";

describe("admin nav links", () => {
  it("keeps only the four routes that exist", () => {
    expect(ADMIN_NAV_LINKS.map((link) => link.label)).toEqual([
      "Dashboard", "Orders", "Products", "Coupons",
    ]);
  });

  it("activates Dashboard only on exact /admin", () => {
    expect(isAdminNavLinkActive("/admin", "/admin")).toBe(true);
    expect(isAdminNavLinkActive("/admin/orders", "/admin")).toBe(false);
    expect(isAdminNavLinkActive("/admin/orders/123", "/admin/orders")).toBe(true);
  });
});
